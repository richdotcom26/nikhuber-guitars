import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  anhang, artikel, arbeitsschritt, arbeitsschrittVorrat, auftrag, holzart, holzVolumen, seriennummer, specBelegung, specSlot,
} from "@/lib/db/schema";
import { gruppeLabel } from "@/lib/artikel-shared";
import { renderCitesPdf, renderLaceyPdf } from "@/lib/pdf/nks-pdf";
import { heuteBerlin } from "@/lib/utils";
import { speichereAnhang } from "./anhang";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";

/**
 * NKS („nerviger Kack-Scheiß") — Holz-Compliance eines Auftrags (MIGRATION 7d/7q):
 * Holzpositionen = alle Spec-Artikel mit Artikeltyp „Holz / Fertigung", dazu Holzart (botanischer
 * Name, Herkunft, Dichte) und Volumen-Klasse („NKS Gewichte"). Gewicht kg = Volumen × Holzdichte
 * (wie Ninox WB.DG), außer am Artikel ist ein Gewicht fest eingetragen.
 */
export interface Holzposition {
  slotKey: string;
  slotCaption: string;
  artikelId: string;
  artikelNr: string | null;
  artikelgruppe: string;
  name: string;
  holz: string | null;
  botanischerName: string | null;
  herkunft: string | null;
  volumenM3: number | null;
  volumenKlasse: string | null;
  holzdichte: number | null;
  gewichtKg: number | null;
  cites: boolean;
  brazRw: boolean;
}

export async function listHolzpositionen(auftragId: string): Promise<Holzposition[]> {
  const rows = await db
    .select({
      slotKey: specBelegung.slotKey,
      slotCaption: specSlot.caption,
      reihenfolge: specSlot.reihenfolge,
      artikelId: artikel.id,
      artikelNr: artikel.artikelNr,
      artikelgruppe: artikel.artikelgruppe,
      nameLang: artikel.nameLang,
      nameBelege: artikel.nameBelege,
      gewichtFix: artikel.gewichtKg,
      cites: artikel.geschuetztesHolzCites,
      holz: holzart.holz,
      botanischerName: holzart.botanischerName,
      herkunft: holzart.herkunft,
      holzdichte: holzart.holzdichte,
      volumenM3: holzVolumen.volumenM3,
      volumenKlasse: holzVolumen.bezeichnung,
    })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .innerJoin(specSlot, eq(specSlot.key, specBelegung.slotKey))
    .leftJoin(holzart, eq(holzart.id, artikel.holzartId))
    .leftJoin(holzVolumen, eq(holzVolumen.id, artikel.holzVolumenId))
    .where(and(eq(specBelegung.auftragId, auftragId), eq(artikel.artikeltyp, "HOLZ")))
    .orderBy(asc(specSlot.reihenfolge), asc(specBelegung.reihenfolge));

  return rows.map((r) => {
    const vol = r.volumenM3 == null ? null : Number(r.volumenM3);
    const dichte = r.holzdichte == null ? null : Number(r.holzdichte);
    const gewicht = r.gewichtFix != null ? Number(r.gewichtFix) : vol != null && dichte != null ? vol * dichte : null;
    return {
      slotKey: r.slotKey,
      slotCaption: r.slotCaption,
      artikelId: r.artikelId,
      artikelNr: r.artikelNr,
      artikelgruppe: gruppeLabel(r.artikelgruppe),
      name: r.nameLang?.trim() || r.nameBelege?.trim() || "–",
      holz: r.holz,
      botanischerName: r.botanischerName,
      herkunft: r.herkunft,
      volumenM3: vol,
      volumenKlasse: r.volumenKlasse,
      holzdichte: dichte,
      gewichtKg: gewicht,
      cites: r.cites,
      brazRw: /^dalbergia nigra/i.test(r.botanischerName ?? ""),
    };
  });
}

/** Aktuelle Lacey-/CITES-Dokumente + Stand der Compliance-Arbeitsschritte (93/94/96) eines Auftrags. */
export async function nksStand(auftragId: string) {
  const [a] = await db
    .select({ lacey: auftrag.laceyDokumentAssetId, cites: auftrag.citesDokumentAssetId, region: auftrag.kdRegion })
    .from(auftrag)
    .where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  const ids = [a.lacey, a.cites].filter((x): x is string => !!x);
  const docs = ids.length
    ? await db.select({ id: anhang.id, dateiname: anhang.dateiname, createdAt: anhang.createdAt })
      .from(anhang).where(inArray(anhang.id, ids))
    : [];
  const schritte = await db
    .select({ nr: arbeitsschrittVorrat.nr, workstep: arbeitsschrittVorrat.workstep, status: arbeitsschritt.status })
    .from(arbeitsschritt)
    .innerJoin(arbeitsschrittVorrat, eq(arbeitsschrittVorrat.id, arbeitsschritt.vorratId))
    .where(and(eq(arbeitsschritt.auftragId, auftragId), inArray(arbeitsschrittVorrat.nr, [93, 94, 96])));
  return {
    region: a.region,
    lacey: docs.find((d) => d.id === a.lacey) ?? null,
    cites: docs.find((d) => d.id === a.cites) ?? null,
    schritte,
  };
}

/* ------------------------------------------------------------------ Belege */

const r1 = (n: number) => Math.round(n * 10) / 10;
const datumTeile = (iso: string) => { const [y, m, d] = iso.split("-"); return { y, m, d }; };
function plusTage(iso: string, tage: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

async function ladeAuftrag(auftragId: string) {
  const [a] = await db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      kdBriefkopf: auftrag.kdBriefkopf,
      kdWaehrung: auftrag.kdWaehrung,
      summeBrutto: auftrag.summeBrutto,
      serie: seriennummer.anzeige,
    })
    .from(auftrag)
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  return a;
}

/**
 * Lacey-Act-Erklärung (PPQ Form 505) erzeugen, als Anhang „Lacey Act" am Auftrag ablegen und
 * als aktuelles Lacey-Dokument merken (ex Ninox-Button „Lacey Druck"). Alle Holzpositionen.
 */
export async function erzeugeLaceyDokument(auftragId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a, pos, fs] = await Promise.all([ladeAuftrag(auftragId), listHolzpositionen(auftragId), getFirmaSetting()]);
  if (pos.length === 0) throw new DomainError("STATE", "Keine Holzpositionen — bitte zuerst die Specs (Details) pflegen.");
  const fehlend = pos.filter((p) => !p.botanischerName || p.volumenM3 == null).map((p) => p.artikelgruppe);
  if (fehlend.length) {
    throw new DomainError("STATE", `Holzart bzw. Volumen fehlt am Artikel: ${fehlend.join(", ")}.`);
  }
  const heute = heuteBerlin();
  const us = (iso: string) => { const { y, m, d } = datumTeile(iso); return `${m}/${d}/${y}`; };
  const pdf = await renderLaceyPdf({
    ankunft: us(plusTage(heute, 3)),
    datum: us(heute),
    bearbeiter: fs.laceyUnterzeichner,
    seriennummer: a.serie ?? "",
    briefkopf: a.kdBriefkopf ?? "",
    preis: `${a.kdWaehrung === "USD" ? "$" : "€"} ${a.summeBrutto == null ? "–" : Number(a.summeBrutto).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    zeilen: pos.map((p) => ({
      hts: fs.htsCode,
      teil: p.artikelgruppe,
      botanisch: p.botanischerName ?? "",
      herkunft: p.herkunft ?? "",
      // volle Genauigkeit (Ninox rundete auf 5 Stellen → Kleinteile wie Switch Tip wurden 0)
      volumen: (p.volumenM3 ?? 0).toFixed(7).replace(/\.?0+$/, ""),
      einheit: "m^3",
    })),
  });
  const dateiname = `${heute} LaceyAct ${a.serie ?? a.nummer}.pdf`;
  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: auftragId, dateiname, bytes: pdf, mime: "application/pdf", art: "LACEY", userId: user.id,
  });
  await db.update(auftrag)
    .set({ laceyDokumentAssetId: anhangId, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, auftragId));
  return anhangId;
}

/**
 * CITES-Bescheinigungsantrag erzeugen (nur Holzpositionen mit geschütztem Holz), als Anhang „CITES"
 * am Auftrag ablegen und als aktuelles CITES-Dokument merken (ex Ninox-Button „CITES Druck").
 */
export async function erzeugeCitesDokument(auftragId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a, pos] = await Promise.all([ladeAuftrag(auftragId), listHolzpositionen(auftragId)]);
  const cites = pos.filter((p) => p.cites);
  if (cites.length === 0) throw new DomainError("STATE", "Keine Holzposition mit geschütztem Holz (CITES) im Auftrag.");
  const heute = heuteBerlin();
  const { y, m, d } = datumTeile(heute);
  const masse = r1(cites.reduce((s, p) => s + (p.gewichtKg ?? 0), 0));
  const pdf = await renderCitesPdf({
    datum: `${d}.${m}.${y}`,
    masse: masse.toLocaleString("de-DE"),
    teile: cites.map((p) => p.artikelgruppe),
  });
  const dateiname = `${heute} CITES ${a.serie ?? a.nummer}.pdf`;
  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: auftragId, dateiname, bytes: pdf, mime: "application/pdf", art: "CITES", userId: user.id,
  });
  await db.update(auftrag)
    .set({ citesDokumentAssetId: anhangId, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, auftragId));
  return anhangId;
}
