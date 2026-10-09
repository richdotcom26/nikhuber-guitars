import "server-only";
import { and, asc, eq, ilike, isNotNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { renderBelegPdf } from "@/lib/pdf/render";
import { embedZugferd } from "@/lib/pdf/zugferd";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import {
  anhang, artikel, auftrag, belegPosition, kunde, rechnung, rechnungAnzahlung, seriennummer, zahlungsbedingung,
} from "@/lib/db/schema";
import { ANHANG_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import {
  RG_BELEGART_VALUES, RG_STATUS_VALUES, type RgBelegart, type RgStatus, abzugBerechnen,
} from "@/lib/rechnung-shared";
import { abrechnungsStand, versandBerechnet } from "./abrechnung";
import { abgezogenIn, anzahlungenUebernehmen } from "./anzahlung";
import { speichereAnhang } from "./anhang";
import { renderBelegData } from "./beleg-render";
import { allocateNummer, kdSnapshot, recomputeSummen, renumberPositionen } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { usdEurKurs } from "./kurs";
import { getFirmaSetting } from "./stammdaten";
import { orderByFor } from "./_sort";

export {
  RG_BELEGART_LABEL, RG_STATUS, RG_STATUS_LABEL,
} from "@/lib/rechnung-shared";
import { dezimal, heuteBerlin } from "@/lib/utils";

/*
 * Rechnungs-Lebenszyklus (GoBD / § 14 UStG):
 *   ENTWURF  — keine Nummer, kein Datum, frei editier- und löschbar.
 *   buchen() — in EINER Transaktion: Nummer atomar ziehen (RG-/ST-, gemeinsamer Zähler),
 *              Rechnungsdatum setzen, Status GEBUCHT, E-Rechnung (ZUGFeRD) erzeugen und
 *              unveränderbar ablegen. Scheitert ein Schritt, wird alles zurückgerollt (keine Lücke).
 *   GEBUCHT  — gesperrt. Korrekturen nur über neue Belege (Storno / Rechnungskorrektur).
 *   BEZAHLT / STORNIERT — Kennzeichen; der Beleginhalt bleibt unverändert.
 */

/* ---------------------------------------------------------------------- liste */

/** Rechnungsbetrag brutto: gespeicherte Summe, sonst (Ninox-Altbestand) aus den Positionen + MwSt. */
const POS_NETTO = sql`(select sum(p.gesamtpreis) from beleg_position p where p.rechnung_id = ${rechnung.id} and p.re_relevant)`;
const BETRAG = sql<string | null>`coalesce(${rechnung.summeBrutto}, round(${POS_NETTO} * case when ${rechnung.kdSteuerpflichtig} then 1 + coalesce(${rechnung.mwstSatz}, 19) / 100 else 1 end, 2))`;
/** Rechnungsbetrag netto: gespeicherte Summe, sonst (Ninox-Altbestand) Summe der Positionen. */
const NETTO = sql<string | null>`coalesce(${rechnung.summeNetto}, round(${POS_NETTO}, 2))`;
const LAUF_NR = sql<number | null>`nullif(regexp_replace(coalesce(${rechnung.nummer}, ''), '^.*-', ''), '')::int`;
const SPARTE = sql<string>`case when ${auftrag.auftragsart} = 'PRODUKTION' then 'Guitar' when ${auftrag.auftragsart} = 'SERVICE' then 'Service' else 'Non-Guitar' end`;

export const RECHNUNG_SORT: Record<string, unknown> = {
  lauf: LAUF_NR,
  modell: artikel.nameKurz,
  ser: seriennummer.anzeige,
  netto: NETTO,
  erloes: sql`${NETTO} * case when ${rechnung.kdWaehrung} = 'USD' then 0.92 else 1 end`,
  waehrung: rechnung.kdWaehrung,
  differenz: sql`${rechnung.zahlbetrag} - coalesce(${rechnung.rechnungsbetrag}, ${BETRAG})`,
  sparte: SPARTE,
  ort: auftrag.produktionsort,
  nummer: rechnung.nummer,
  art: rechnung.belegart,
  datum: rechnung.rechnungsdatum,
  kunde: sql`lower(coalesce(${kunde.kurzname}, ${kunde.firma}, ${rechnung.kdFirma}, ${rechnung.kdNachname}, ''))`,
  status: rechnung.status,
  zahlung: rechnung.zahlungsdatum,
  brutto: rechnung.summeBrutto,
};

export async function listRechnungen(
  params: { q?: string; status?: string; belegart?: string; jahr?: number; page?: number; sort?: SortSpec; mitSummen?: boolean } = {},
) {
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);
  const filters = [];
  if (params.status && (RG_STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(rechnung.status, params.status as RgStatus));
  }
  if (params.belegart && (RG_BELEGART_VALUES as readonly string[]).includes(params.belegart)) {
    filters.push(eq(rechnung.belegart, params.belegart as RgBelegart));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(ilike(rechnung.nummer, like), ilike(rechnung.kdFirma, like), ilike(rechnung.kdNachname, like))!);
  }
  if (params.jahr) filters.push(sql`extract(year from ${rechnung.rechnungsdatum}) = ${params.jahr}`);
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: rechnung.id,
      nummer: rechnung.nummer,
      belegart: rechnung.belegart,
      status: rechnung.status,
      rechnungsdatum: rechnung.rechnungsdatum,
      zahlungsdatum: rechnung.zahlungsdatum,
      kdFirma: rechnung.kdFirma,
      kdVorname: rechnung.kdVorname,
      kdNachname: rechnung.kdNachname,
      kdWaehrung: rechnung.kdWaehrung,
      summeBrutto: rechnung.summeBrutto,
      zahlungsstatus: rechnung.zahlungsstatus,
      kurzname: kunde.kurzname,
      firma: kunde.firma,
      laufNr: LAUF_NR,
      modellKurz: sql<string | null>`coalesce(${artikel.nameKurz}, ${artikel.nameLang})`,
      serNr: seriennummer.anzeige,
      betrag: BETRAG,
      netto: NETTO,
      zahlbetrag: rechnung.zahlbetrag,
      zahlbar: sql<string | null>`coalesce(${rechnung.rechnungsbetrag}, ${BETRAG})`,
      sparte: SPARTE,
      produktionsort: auftrag.produktionsort,
    })
    .from(rechnung)
    .leftJoin(kunde, eq(kunde.id, rechnung.kundeId))
    .leftJoin(auftrag, eq(auftrag.id, rechnung.auftragId))
    .leftJoin(artikel, eq(artikel.id, sql`coalesce(${rechnung.modellArtikelId}, ${auftrag.modellArtikelId})`))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(where)
    .orderBy(...orderByFor(RECHNUNG_SORT, params.sort, rechnung.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(rechnung).where(where);
  // Summen (netto) über alle gebuchten Belege der aktuellen Auswahl — ohne Entwürfe und ohne
  // Anzahlungsrechnungen (deren Betrag steckt bereits in der Endrechnung; sonst doppelt gezählt).
  const summenFilter = and(where, isNotNull(rechnung.nummer), ne(rechnung.belegart, "ANZAHLUNGSRECHNUNG"));
  // nur auf Anforderung (Knopf „Summen berechnen“) — die Aggregation über alle Belege kostet Zeit
  const summen = params.mitSummen
    ? await db
      .select({ waehrung: rechnung.kdWaehrung, netto: sql<string>`coalesce(sum(${NETTO}), 0)` })
      .from(rechnung)
      .where(summenFilter)
      .groupBy(rechnung.kdWaehrung)
    : null;
  const kurs = await usdEurKurs();
  const eur = (summen ?? []).filter((s) => s.waehrung !== "USD").reduce((a, s) => a + Number(s.netto), 0);
  const usd = (summen ?? []).filter((s) => s.waehrung === "USD").reduce((a, s) => a + Number(s.netto), 0);
  return {
    rows,
    faktor: kurs.faktor,
    kurs,
    summen: summen ? { eur, usd, gesamtEur: eur + usd * kurs.faktor } : null,
    total: count,
    page,
    pageCount: Math.max(Math.ceil(count / pageSize), 1),
  };
}

/* --------------------------------------------------------------------- detail */

export async function getRechnung(id: string) {
  const row = await db.query.rechnung.findFirst({ where: eq(rechnung.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");

  let auftragInfo: { id: string; nummer: string; modellName: string | null; serNr: string | null } | null = null;
  if (row.auftragId) {
    const [a] = await db
      .select({
        id: auftrag.id,
        nummer: auftrag.nummer,
        modellName: artikel.nameBelege,
        serAnzeige: seriennummer.anzeige,
      })
      .from(auftrag)
      .leftJoin(artikel, eq(auftrag.modellArtikelId, artikel.id))
      .leftJoin(seriennummer, eq(auftrag.seriennummerId, seriennummer.id))
      .where(eq(auftrag.id, row.auftragId));
    if (a) auftragInfo = { id: a.id, nummer: a.nummer, modellName: a.modellName, serNr: a.serAnzeige };
  }

  let referenz: { id: string; nummer: string | null } | null = null;
  if (row.referenzRechnungId) {
    const [r] = await db
      .select({ id: rechnung.id, nummer: rechnung.nummer })
      .from(rechnung)
      .where(eq(rechnung.id, row.referenzRechnungId));
    referenz = r ?? null;
  }

  // Folgebelege (Storno / Korrekturen) zu dieser Rechnung
  const folgebelege = await db
    .select({ id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, status: rechnung.status })
    .from(rechnung)
    .where(eq(rechnung.referenzRechnungId, id))
    .orderBy(asc(rechnung.createdAt));

  return { rechnung: row, auftragInfo, referenz, folgebelege };
}

/** Rechnungen eines Auftrags (für den Auftrag-Tab). */
export async function rechnungenZuAuftrag(auftragId: string) {
  return db
    .select({
      id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, status: rechnung.status,
      rechnungsdatum: rechnung.rechnungsdatum, summeBrutto: rechnung.summeBrutto, kdWaehrung: rechnung.kdWaehrung,
    })
    .from(rechnung)
    .where(eq(rechnung.auftragId, auftragId))
    .orderBy(asc(rechnung.createdAt));
}

/* ---------------------------------------------------------------- Hilfsfunktionen */


/** Positionen eines Auftrags, die noch (teilweise) offen sind — mit offener Menge. */
async function offeneAuftragsPositionen(auftragId: string) {
  const [pos, stand] = await Promise.all([
    db.select().from(belegPosition)
      .where(and(eq(belegPosition.auftragId, auftragId), eq(belegPosition.reRelevant, true)))
      .orderBy(sql`${belegPosition.posNr} is null`, asc(belegPosition.posNr), asc(belegPosition.createdAt)),
    abrechnungsStand(auftragId),
  ]);
  return pos
    .map((p) => ({ p, offen: stand.byId.get(p.id)?.offen ?? Number(p.anzahl) }))
    .filter((x) => x.offen > 0);
}

function positionsKopie(
  rechnungId: string,
  quellen: { p: typeof belegPosition.$inferSelect; offen: number }[],
  userId: string,
) {
  return quellen.map(({ p, offen }) => ({
    rechnungId,
    posNr: p.posNr,
    artikelId: p.artikelId,
    artikelName: p.artikelName,
    artikelBeschreibung: p.artikelBeschreibung,
    anzahl: String(offen),
    einzelpreis: p.einzelpreis,
    rabattProzent: p.rabattProzent,
    reRelevant: true,
    vkRetailWert: p.vkRetailWert,
    herkunftSlotKey: p.herkunftSlotKey,
    quellPositionId: p.id,
    createdBy: userId,
    updatedBy: userId,
  }));
}

/* ------------------------------------------------------- Entwurf aus Auftrag */

/**
 * Rechnungsentwurf aus dem Auftrag: kopiert Kunden-Snapshot und alle noch offenen Mengen
 * (Teilrechnungen möglich — bereits berechnete Mengen werden abgezogen). Keine Nummer.
 * Gibt es für den Auftrag schon einen offenen Entwurf, wird dieser zurückgegeben.
 */
export async function createEntwurfAusAuftrag(auftragId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");

  const [offenerEntwurf] = await db
    .select({ id: rechnung.id })
    .from(rechnung)
    .where(and(eq(rechnung.auftragId, auftragId), eq(rechnung.status, "ENTWURF"), eq(rechnung.belegart, "RECHNUNG")));
  if (offenerEntwurf) return offenerEntwurf.id;

  const offen = await offeneAuftragsPositionen(auftragId);
  if (offen.length === 0) {
    throw new DomainError("STATE", "Der Auftrag ist vollständig berechnet — keine offenen Positionen.");
  }
  const snap = a.kundeId ? await kdSnapshot(a.kundeId) : {};
  // Versand nur einmal berechnen (Teilrechnungen): übernehmen, solange noch nicht gebucht.
  const versand = await versandBerechnet(auftragId)
    ? {}
    : { versandkosten: a.versandkosten, versandBezeichnung: a.versandBezeichnung, versandArtikelId: a.versandArtikelId };

  const id = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(rechnung)
      .values({
        nummer: null,
        belegart: "RECHNUNG",
        status: "ENTWURF",
        auftragId,
        ...snap,
        modellArtikelId: a.modellArtikelId,
        gesamtrabattProzent: a.gesamtrabattProzent,
        gesamtrabattAktiv: a.gesamtrabattAktiv,
        lieferdatum: a.lieferdatum ?? a.versanddatum,
        ...versand,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: rechnung.id });
    await tx.insert(belegPosition).values(positionsKopie(neu.id, offen, user.id));
    return neu.id;
  });

  await renumberPositionen("rechnung", id);
  await recomputeSummen("rechnung", id);
  await anzahlungenUebernehmen(id);
  return id;
}

/** Entwurf: Positionen durch die aktuell offenen Auftragspositionen ersetzen. */
export async function positionenAusAuftrag(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const r = await assertRechnungEditierbar(id);
  if (!r.auftragId) throw new DomainError("STATE", "Diese Rechnung hat keinen Auftrag.");
  const offen = await offeneAuftragsPositionen(r.auftragId);
  if (offen.length === 0) throw new DomainError("STATE", "Im Auftrag sind keine offenen Positionen mehr.");

  await db.transaction(async (tx) => {
    await tx.delete(belegPosition).where(eq(belegPosition.rechnungId, id));
    await tx.insert(belegPosition).values(positionsKopie(id, offen, user.id));
  });
  await renumberPositionen("rechnung", id);
  await recomputeSummen("rechnung", id);
  return offen.length;
}

/* ------------------------------------------------- Ad-hoc-Entwurf (ohne Auftrag) */

/** Rechnungsentwurf direkt für einen Kunden — für Kleinteile/Ersatzteile (keine Modell-Artikel). */
export async function createRechnungOhneAuftrag(kundeId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const snap = await kdSnapshot(kundeId);
  const [neu] = await db
    .insert(rechnung)
    .values({
      nummer: null,
      belegart: "RECHNUNG",
      status: "ENTWURF",
      ...snap,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: rechnung.id });
  return neu.id;
}

/* --------------------------------------------------------------- Guards */

/** Inhalt (Positionen, Kopf, Anzahlung) nur im Entwurf änderbar. */
export async function assertRechnungEditierbar(id: string) {
  const [r] = await db
    .select({ status: rechnung.status, auftragId: rechnung.auftragId, belegart: rechnung.belegart })
    .from(rechnung)
    .where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  if (r.status !== "ENTWURF") {
    throw new DomainError("STATE", "Die Rechnung ist gebucht und gesperrt — Korrekturen nur über Storno oder Rechnungskorrektur.");
  }
  return r;
}

/** Ad-hoc-Rechnungen (ohne Auftrag) sind für Nicht-Gitarren-Artikel: keine Modell-Artikel. */
export async function assertPositionArtikel(rechnungId: string, artikelId: string | null) {
  const r = await assertRechnungEditierbar(rechnungId);
  if (r.auftragId || r.belegart !== "RECHNUNG" || !artikelId) return;
  const [a] = await db.select({ gruppe: artikel.artikelgruppe }).from(artikel).where(eq(artikel.id, artikelId));
  if (a?.gruppe === "MODEL") {
    throw new DomainError(
      "VALIDATION",
      "Rechnungen ohne Auftrag sind für Kleinteile/Ersatzteile — Gitarren (Modell-Artikel) bitte über einen Auftrag abrechnen.",
    );
  }
}

/** Entwurf löschen — hat noch keine Nummer, also entsteht keine Lücke. */
export async function deleteEntwurf(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await assertRechnungEditierbar(id);
  const dateien = await db.select({ pfad: anhang.pfad }).from(anhang).where(eq(anhang.rechnungId, id));
  await db.delete(rechnung).where(and(eq(rechnung.id, id), eq(rechnung.status, "ENTWURF")));
  const pfade = dateien.map((d) => d.pfad).filter((p): p is string => !!p);
  if (pfade.length) await supabaseAdmin().storage.from(ANHANG_BUCKET).remove(pfade).catch(() => {});
}

/* ------------------------------------------------------------------- Buchen */

/**
 * Snapshot vor dem Buchen einfrieren (noch im Entwurf): MwSt-Satz (Kopf + Positionen),
 * Zahlungsbedingung und aktuelle Rechnungsadresse des Kunden; Summen neu rechnen.
 * Stornos/Korrekturen behalten die Werte der Originalrechnung.
 */
async function snapshotVorBuchen(id: string, userId: string) {
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");

  const set: Partial<typeof rechnung.$inferInsert> = { updatedAt: new Date(), updatedBy: userId };
  if (r.belegart === "RECHNUNG" || r.belegart === "ANZAHLUNGSRECHNUNG") {
    set.mwstSatz = String((await getFirmaSetting()).mwstSatz);
    if (r.kundeId) {
      const s = await kdSnapshot(r.kundeId);
      Object.assign(set, {
        kdFirma: s.kdFirma, kdVorname: s.kdVorname, kdNachname: s.kdNachname, kdStrasse: s.kdStrasse,
        kdPlz: s.kdPlz, kdOrt: s.kdOrt, kdStaatId: s.kdStaatId, kdUstId: s.kdUstId, kdBriefkopf: s.kdBriefkopf,
      });
      const [zb] = await db
        .select({ de: zahlungsbedingung.bezeichnung, en: zahlungsbedingung.bezeichnungEn })
        .from(kunde)
        .innerJoin(zahlungsbedingung, eq(zahlungsbedingung.id, kunde.zahlungsbedingungId))
        .where(eq(kunde.id, r.kundeId));
      if (zb) set.zahlungsbedingungText = r.kdSprache === "EN" ? (zb.en ?? zb.de) : zb.de;
    }
  }
  await db.update(rechnung).set(set).where(eq(rechnung.id, id));

  const satz = r.kdSteuerpflichtig ? String(set.mwstSatz ?? r.mwstSatz ?? 0) : "0";
  await db.update(belegPosition).set({ mwstSatz: satz }).where(eq(belegPosition.rechnungId, id));
  await recomputeSummen("rechnung", id);

}

/**
 * Entwurf buchen (finalisieren) — in einer Transaktion:
 * Nummer atomar ziehen, Rechnungsdatum = heute, Status GEBUCHT, E-Rechnung erzeugen und ablegen.
 * Bei einer Stornorechnung wird das Original als STORNIERT gekennzeichnet (Inhalt unverändert).
 */
export async function buchen(id: string): Promise<{ nummer: string; anhangId: string }> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");

  const r0 = await assertRechnungEditierbar(id);
  const [h0] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!h0.kundeId && !h0.kdNachname && !h0.kdFirma) throw new DomainError("STATE", "Kein Kunde hinterlegt.");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(belegPosition)
    .where(and(eq(belegPosition.rechnungId, id), eq(belegPosition.reRelevant, true)));
  if (n === 0) throw new DomainError("STATE", "Der Entwurf hat keine Positionen.");
  // § 14 UStG / E-Rechnung: vollständige Anschrift + Steuernummer oder USt-IdNr. des Ausstellers
  const firma = await getFirmaSetting();
  if (!firma.strasse?.trim() || !firma.plz?.trim() || !firma.ort?.trim()) {
    throw new DomainError("STATE", "Firmenanschrift unvollständig – bitte unter Einstellungen → Firma Straße, PLZ und Ort eintragen.");
  }
  if (!firma.ustId?.trim() && !firma.steuerNr?.trim()) {
    throw new DomainError("STATE", "Steuernummer oder USt-IdNr. fehlt – bitte unter Einstellungen → Firma eintragen.");
  }
  // § 14 UStG: Zeitpunkt der Lieferung/Leistung ist Pflichtangabe. Fehlt er, gilt Lieferdatum = Rechnungsdatum
  // (Abholung/Übergabe am Tag der Rechnung) — kein harter Stopp. Anzahlungsrechnung: Lieferung liegt noch nicht vor.
  if (r0.belegart === "RECHNUNG" && !h0.lieferdatum) {
    await db.update(rechnung).set({ lieferdatum: heuteBerlin() }).where(eq(rechnung.id, id));
  }

  await snapshotVorBuchen(id, user.id);

  const datum = heuteBerlin();
  const jahr = Number(datum.slice(0, 4));
  const prefix = r0.belegart === "RECHNUNG" || r0.belegart === "ANZAHLUNGSRECHNUNG" ? "RG" : "ST";
  let hochgeladen: string | null = null;

  try {
    return await db.transaction(async (tx) => {
      const [r] = await tx.select().from(rechnung).where(eq(rechnung.id, id)).for("update");
      if (!r || r.status !== "ENTWURF") throw new DomainError("CONFLICT", "Die Rechnung wurde bereits gebucht.");

      const nummer = await allocateNummer("RECHNUNG", jahr, { tx, prefix });

      const data = await renderBelegData("rechnung", id, { nummer, datum });
      const pdf = await embedZugferd(await renderBelegPdf(data), data);
      const anhangId = await speichereAnhang({
        traeger: "rechnung",
        traegerId: id,
        dateiname: `${data.titel}_${nummer}.pdf`.replace(/[^\w.-]+/g, "_"),
        bytes: Buffer.from(pdf),
        mime: "application/pdf",
        art: "BELEG_PDF",
        userId: user.id,
        tx,
        onUploaded: (key) => { hochgeladen = key; },
      });

      await tx
        .update(rechnung)
        .set({
          nummer,
          rechnungsdatum: datum,
          status: "GEBUCHT",
          gebuchtAm: new Date(),
          gebuchtVon: user.id,
          erechnungAssetId: anhangId,
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(rechnung.id, id));

      if (r.belegart === "STORNORECHNUNG" && r.referenzRechnungId) {
        await tx
          .update(rechnung)
          .set({ status: "STORNIERT", updatedAt: new Date(), updatedBy: user.id })
          .where(eq(rechnung.id, r.referenzRechnungId));
      }
      return { nummer, anhangId };
    });
  } catch (e) {
    // Transaktion zurückgerollt → auch die Datei wieder entfernen (keine verwaisten PDFs).
    if (hochgeladen) await supabaseAdmin().storage.from(ANHANG_BUCKET).remove([hochgeladen]).catch(() => {});
    throw e;
  }
}

/* ------------------------------------------------- Storno / Rechnungskorrektur */

/** Negierte Kopie einer gebuchten Rechnung als Entwurf (Storno: alle Positionen, Korrektur: zur Auswahl). */
async function negierterEntwurf(originalId: string, belegart: "STORNORECHNUNG" | "RECHNUNGSKORREKTUR") {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [o] = await db.select().from(rechnung).where(eq(rechnung.id, originalId));
  if (!o) throw new DomainError("NOT_FOUND", "Original-Rechnung nicht gefunden.");
  if (o.belegart !== "RECHNUNG" && !(o.belegart === "ANZAHLUNGSRECHNUNG" && belegart === "STORNORECHNUNG")) {
    throw new DomainError("STATE", "Nur zu einer Rechnung möglich (Anzahlungsrechnungen nur stornieren).");
  }
  if (o.belegart === "ANZAHLUNGSRECHNUNG") {
    const inRg = await abgezogenIn(o.id);
    if (inRg) {
      throw new DomainError("STATE", `Diese Anzahlung ist bereits in Rechnung ${inRg.nummer ?? "(Entwurf)"} abgezogen — dort zuerst den Abzug entfernen bzw. die Rechnung stornieren.`);
    }
  }
  if (o.status !== "GEBUCHT" && o.status !== "BEZAHLT") {
    throw new DomainError("STATE", o.status === "STORNIERT" ? "Die Rechnung ist bereits storniert." : "Die Rechnung ist noch nicht gebucht.");
  }
  if (belegart === "STORNORECHNUNG") {
    const [schon] = await db.select({ id: rechnung.id }).from(rechnung).where(and(
      eq(rechnung.referenzRechnungId, originalId),
      eq(rechnung.belegart, "STORNORECHNUNG"),
      ne(rechnung.status, "ENTWURF"),
    ));
    if (schon) throw new DomainError("CONFLICT", "Zu dieser Rechnung gibt es bereits eine Stornorechnung.");
  }

  const positionen = await db.select().from(belegPosition)
    .where(and(eq(belegPosition.rechnungId, originalId), eq(belegPosition.reRelevant, true)))
    .orderBy(sql`${belegPosition.posNr} is null`, asc(belegPosition.posNr), asc(belegPosition.createdAt));

  const id = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(rechnung)
      .values({
        nummer: null,
        belegart,
        status: "ENTWURF",
        auftragId: o.auftragId,
        referenzRechnungId: o.id,
        modellArtikelId: o.modellArtikelId,
        kundeId: o.kundeId,
        kdFirma: o.kdFirma, kdVorname: o.kdVorname, kdNachname: o.kdNachname,
        kdStrasse: o.kdStrasse, kdPlz: o.kdPlz, kdOrt: o.kdOrt, kdStaatId: o.kdStaatId,
        kdRegion: o.kdRegion, kdWaehrung: o.kdWaehrung, kdSprache: o.kdSprache,
        kdUstId: o.kdUstId, kdSteuerpflichtig: o.kdSteuerpflichtig,
        kdVertriebsweg: o.kdVertriebsweg, kdSonderrabattProzent: o.kdSonderrabattProzent,
        kdBriefkopf: o.kdBriefkopf,
        mwstSatz: o.mwstSatz ?? String((await getFirmaSetting()).mwstSatz),
        zahlungsbedingungText: o.zahlungsbedingungText,
        gesamtrabattProzent: o.gesamtrabattProzent,
        gesamtrabattAktiv: o.gesamtrabattAktiv,
        versandkosten: String(-Number(o.versandkosten ?? 0)),
        versandBezeichnung: o.versandBezeichnung,
        versandArtikelId: o.versandArtikelId,
        bemerkungRechnung: `${belegart === "STORNORECHNUNG" ? "Storno" : "Korrektur"} zu Rechnung ${o.nummer}`,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: rechnung.id });

    if (positionen.length) {
      await tx.insert(belegPosition).values(positionen.map((p) => ({
        rechnungId: neu.id,
        posNr: p.posNr,
        artikelId: p.artikelId,
        artikelName: p.artikelName,
        artikelBeschreibung: p.artikelBeschreibung,
        anzahl: p.anzahl,
        einzelpreis: p.einzelpreis == null ? null : String(-Number(p.einzelpreis)),
        rabattProzent: p.rabattProzent,
        reRelevant: true,
        mwstSatz: p.mwstSatz,
        quellPositionId: p.quellPositionId,
        herkunftSlotKey: p.herkunftSlotKey,
        createdBy: user.id,
        updatedBy: user.id,
      })));
    }
    // Storno einer Endrechnung: Anzahlungsabzüge negiert mitnehmen (Original wird STORNIERT → Anzahlung wieder frei)
    if (belegart === "STORNORECHNUNG") {
      const abz = await tx.select().from(rechnungAnzahlung).where(eq(rechnungAnzahlung.rechnungId, originalId));
      if (abz.length) {
        await tx.insert(rechnungAnzahlung).values(abz.map((x) => ({
          rechnungId: neu.id,
          anzahlungRechnungId: x.anzahlungRechnungId,
          netto: String(-Number(x.netto)),
          mwst: String(-Number(x.mwst)),
          brutto: String(-Number(x.brutto)),
          createdBy: user.id,
          updatedBy: user.id,
        })));
      }
    }
    return neu.id;
  });
  await recomputeSummen("rechnung", id);
  return id;
}

/**
 * Stornorechnung: vollständige negative Kopie, sofort gebucht (eigene ST-Nummer, Verweis aufs Original).
 * Das Original wird als STORNIERT gekennzeichnet, bleibt sonst unverändert.
 */
export async function stornieren(originalId: string): Promise<string> {
  const stornoId = await negierterEntwurf(originalId, "STORNORECHNUNG");
  try {
    await buchen(stornoId);
  } catch (e) {
    await db.delete(rechnung).where(and(eq(rechnung.id, stornoId), eq(rechnung.status, "ENTWURF")));
    throw e;
  }
  return stornoId;
}

/**
 * Rechnungskorrektur (z. B. Teilgutschrift einer Position): Entwurf mit allen Positionen negativ;
 * nicht betroffene Positionen löschen bzw. Mengen anpassen, dann buchen (ST-Nummer).
 */
export function korrekturEntwurf(originalId: string): Promise<string> {
  return negierterEntwurf(originalId, "RECHNUNGSKORREKTUR");
}

/* ------------------------------------------------------------------ Kopf-Form */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
);
const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const rechnungKopfSchema = z.object({
  lieferdatum: dateOrNull,
  reportMonat: nullableText,
  bemerkungRechnung: nullableText,
  gebuchtBeimSteuerbuero: boolFlag,
});
export type RechnungKopfInput = z.infer<typeof rechnungKopfSchema>;

/**
 * Entwurf: Lieferdatum, Bemerkung, Report-Monat. Gebucht: nur noch Verwaltungsfelder
 * (Report-Monat, „beim Steuerbüro gebucht") — der Beleginhalt bleibt unverändert.
 */
export async function updateRechnungKopf(id: string, input: RechnungKopfInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select({ status: rechnung.status }).from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  const set = r.status === "ENTWURF"
    ? { lieferdatum: input.lieferdatum, bemerkungRechnung: input.bemerkungRechnung, reportMonat: input.reportMonat }
    : { reportMonat: input.reportMonat, gebuchtBeimSteuerbuero: input.gebuchtBeimSteuerbuero };
  await db
    .update(rechnung)
    .set({ ...set, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(rechnung.id, id));
}

/* --------------------------------------------------------------------- Zahlung */

const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? dezimal(v).trim() : v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);

export const zahlungSchema = z.object({
  zahlungsdatum: dateOrNull,
  zahlbetrag: decimalOrNull,
  zahlungAnBank: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["VVB", "CHASE", "PAYPAL"]).nullable()),
  zahlungsstatus: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["ANGEZAHLT", "TEILZAHLUNG", "BEZAHLT", "ANGEMAHNT"]).nullable(),
  ),
  abzugProzent: decimalOrNull,
});
export type ZahlungInput = z.infer<typeof zahlungSchema>;

/** Zahlung erfassen (nur gebuchte Belege). Zahlungsstatus BEZAHLT ↔ Status BEZAHLT/GEBUCHT. */
export async function recordZahlung(id: string, input: ZahlungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  if (r.status === "ENTWURF") throw new DomainError("STATE", "Zahlungen erst nach dem Buchen erfassen.");

  const brutto = Number(r.summeBrutto ?? 0);
  const anzahlung = r.anzahlungBeruecksichtigen ? Number(r.anzahlungBrutto ?? 0) : 0;
  const rechnungsbetrag = r.rechnungsbetrag != null ? Number(r.rechnungsbetrag) : Math.round((brutto - anzahlung) * 100) / 100;
  const zahlbetrag = input.zahlbetrag == null ? null : Number(input.zahlbetrag);
  // Abzug % und Differenz immer aus dem Zahlbetrag (Bankauszug) ableiten — nicht aus der Eingabe.
  const { differenz, prozent } = abzugBerechnen(rechnungsbetrag, zahlbetrag);
  const status: RgStatus = r.status === "STORNIERT"
    ? "STORNIERT"
    : input.zahlungsstatus === "BEZAHLT" ? "BEZAHLT" : "GEBUCHT";

  await db
    .update(rechnung)
    .set({
      ...input,
      rechnungsbetrag: String(rechnungsbetrag),
      differenzZahlung: differenz == null ? null : String(differenz),
      abzugProzent: prozent == null ? null : String(prozent),
      status,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(rechnung.id, id));
}

export const anzahlungSchema = z.object({
  anzahlungBeruecksichtigen: boolFlag,
  anzahlungBrutto: decimalOrNull,
  anzahlungDatum: dateOrNull,
});
export type AnzahlungInput = z.infer<typeof anzahlungSchema>;

export async function setAnzahlung(id: string, input: AnzahlungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await assertRechnungEditierbar(id);
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  const brutto = Number(r.summeBrutto ?? 0);
  const anzahlung = input.anzahlungBeruecksichtigen ? Number(input.anzahlungBrutto ?? 0) : 0;
  await db
    .update(rechnung)
    .set({
      ...input,
      rechnungsbetrag: String(Math.round((brutto - anzahlung) * 100) / 100),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(rechnung.id, id));
  await recomputeSummen("rechnung", id); // inkl. Abzug von Anzahlungsrechnungen
}

/** Positionen einer Rechnung (für Panel). */
export async function listRechnungPositionen(id: string) {
  return db
    .select()
    .from(belegPosition)
    .where(eq(belegPosition.rechnungId, id))
    .orderBy(sql`${belegPosition.posNr} is null`, asc(belegPosition.posNr), asc(belegPosition.createdAt));
}

