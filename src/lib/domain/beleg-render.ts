import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  angebot, auftrag, belegPosition, rechnung, staat,
} from "@/lib/db/schema";
import { requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";

export type BelegArt = "angebot" | "auftrag" | "rechnung";

export interface BelegPos {
  pos: number | null;
  artikelNr: string | null;
  name: string;
  beschreibung: string | null;
  anzahl: string;
  einzelpreis: string | null;
  rabattProzent: string;
  gesamt: string | null;
}

export interface BelegRenderData {
  art: BelegArt;
  sprache: "DE" | "EN";
  waehrung: "EUR" | "USD";
  firma: {
    firma: string; strasse: string | null; plz: string | null; ort: string | null;
    land: string | null; landCode: string; steuerNr: string | null; bank: string | null;
    ustId: string | null; iban: string | null; bic: string | null;
  };
  titel: string;
  belegart: string | null;   // rechnung: RECHNUNG | STORNORECHNUNG | GUTSCHRIFT
  nummer: string;
  datum: string | null;
  referenzNummer: string | null;
  auftragNummer: string | null;
  kopftext: string | null;
  region: string | null;     // D | EU | WELT | ASIEN | USA — für die Steuerkategorie
  kunde: {
    briefkopf: string | null;
    name: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    plzOrt: string | null;
    land: string | null;
    landCode: string | null;
    ustId: string | null;
  };
  positionen: BelegPos[];
  summen: {
    positionen: string | null;
    gesamtrabattProzent: string;
    gesamtrabattWert: string;
    gesamtrabattAktiv: boolean;
    netto: string | null;
    mwstSatz: string;
    mwst: string | null;
    brutto: string | null;
  };
  steuerpflichtig: boolean;
  steuerHinweis: string | null;
  zahlungsbedingung: string | null;
  anzahlung: { brutto: string | null; datum: string | null; rechnungsbetrag: string | null } | null;
}

/** Freitext-Land grob auf ISO-2 abbilden (Firmensitz). Default DE. */
function landZuCode(land: string | null): string {
  const l = (land ?? "").trim().toLowerCase();
  if (!l || /deutsch|german|^de$|brd/.test(l)) return "DE";
  if (l.length === 2) return l.toUpperCase();
  const map: Record<string, string> = {
    österreich: "AT", austria: "AT", schweiz: "CH", switzerland: "CH",
    frankreich: "FR", france: "FR", niederlande: "NL", netherlands: "NL",
  };
  return map[l] ?? "DE";
}

const HEAD = { angebot, auftrag, rechnung } as const;
const POS_COL = {
  angebot: belegPosition.angebotId,
  auftrag: belegPosition.auftragId,
  rechnung: belegPosition.rechnungId,
} as const;

function titelFor(art: BelegArt, belegart: string | null, sprache: "DE" | "EN"): string {
  const de = sprache === "DE";
  if (art === "angebot") return de ? "Angebot" : "Offer";
  if (art === "auftrag") return de ? "Auftragsbestätigung" : "Order Confirmation";
  if (belegart === "STORNORECHNUNG") return de ? "Stornorechnung" : "Cancellation Invoice";
  if (belegart === "GUTSCHRIFT") return de ? "Gutschrift" : "Credit Note";
  return de ? "Rechnung" : "Invoice";
}

/** ZusatzEU-Fußnote — an das Steuerergebnis gekoppelt, NICHT nur an die Region (7v). */
function steuerHinweis(
  steuerpflichtig: boolean,
  region: string | null,
  sprache: "DE" | "EN",
): string | null {
  if (steuerpflichtig) return null;
  const eu = region === "EU";
  if (sprache === "DE") {
    return eu
      ? "Steuerfreie innergemeinschaftliche Lieferung."
      : "Steuerfreie Ausfuhrlieferung.";
  }
  return eu
    ? "Intra-community supply exempt from VAT."
    : "Export delivery exempt from VAT.";
}

export async function renderBelegData(art: BelegArt, id: string): Promise<BelegRenderData> {
  await requireUser();
  const head = HEAD[art];
  const [h] = await db.select().from(head).where(eq(head.id, id));
  if (!h) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");

  const fs = await getFirmaSetting();
  const sprache = (h.kdSprache ?? "DE") as "DE" | "EN";
  const waehrung = (h.kdWaehrung ?? "EUR") as "EUR" | "USD";

  const rawPos = await db
    .select()
    .from(belegPosition)
    .where(and(eq(POS_COL[art], id), eq(belegPosition.reRelevant, true)))
    .orderBy(sql`${belegPosition.posNr} is null`, asc(belegPosition.posNr), asc(belegPosition.createdAt));

  let staatName: string | null = null;
  let staatCode: string | null = null;
  if (h.kdStaatId) {
    const [st] = await db.select({ name: staat.name, kuerzel: staat.kuerzel })
      .from(staat).where(eq(staat.id, h.kdStaatId));
    staatName = st?.name ?? null;
    staatCode = st?.kuerzel ?? null;
  }

  // Zahlungsbedingung: über den Kunden (Kopf hat keine eigene Referenz).
  let zbText: string | null = null;
  if (h.kundeId) {
    const rows = (await db.execute(sql`
      select z.bezeichnung, z.bezeichnung_en
      from kunde k join zahlungsbedingung z on z.id = k.zahlungsbedingung_id
      where k.id = ${h.kundeId}
    `)) as unknown as { bezeichnung: string; bezeichnung_en: string | null }[];
    const r = rows[0];
    if (r) zbText = sprache === "EN" ? (r.bezeichnung_en ?? r.bezeichnung) : r.bezeichnung;
  }

  const kdName = h.kdFirma?.trim()
    || [h.kdVorname, h.kdNachname].filter(Boolean).join(" ").trim()
    || "—";

  const rr = art === "rechnung" ? (h as typeof rechnung.$inferSelect) : null;

  return {
    art,
    sprache,
    waehrung,
    firma: {
      firma: fs.firma,
      strasse: fs.strasse,
      plz: fs.plz,
      ort: fs.ort,
      land: fs.land,
      landCode: landZuCode(fs.land),
      steuerNr: fs.steuerNr,
      bank: fs.bank,
      ustId: fs.ustId,
      iban: fs.iban,
      bic: fs.bic,
    },
    titel: titelFor(art, rr?.belegart ?? null, sprache),
    belegart: rr?.belegart ?? null,
    region: h.kdRegion ?? null,
    nummer: h.nummer,
    datum:
      art === "angebot" ? (h as typeof angebot.$inferSelect).angebotsdatum
      : art === "auftrag" ? (h as typeof auftrag.$inferSelect).auftragsdatum
      : rr!.rechnungsdatum,
    referenzNummer: null,
    auftragNummer: rr?.auftragId
      ? (await db.select({ n: auftrag.nummer }).from(auftrag).where(eq(auftrag.id, rr.auftragId)))[0]?.n ?? null
      : null,
    kopftext: art === "angebot" ? (h as typeof angebot.$inferSelect).kopftext : null,
    kunde: {
      briefkopf: h.kdBriefkopf,
      name: kdName,
      strasse: h.kdStrasse,
      plz: h.kdPlz,
      ort: h.kdOrt,
      plzOrt: [h.kdPlz, h.kdOrt].filter(Boolean).join(" ") || null,
      land: staatName,
      landCode: staatCode,
      ustId: h.kdUstId,
    },
    positionen: rawPos.map((p) => ({
      pos: p.posNr,
      artikelNr: null,
      name: p.artikelName ?? "—",
      beschreibung: p.artikelBeschreibung,
      anzahl: p.anzahl,
      einzelpreis: p.einzelpreis,
      rabattProzent: p.rabattProzent,
      gesamt: p.gesamtpreis,
    })),
    summen: {
      positionen: h.summePositionen,
      gesamtrabattProzent: h.gesamtrabattProzent,
      gesamtrabattWert: h.gesamtrabattWert,
      gesamtrabattAktiv: h.gesamtrabattAktiv,
      netto: h.summeNetto,
      mwstSatz: fs.mwstSatz,
      mwst: h.summeMwst,
      brutto: h.summeBrutto,
    },
    steuerpflichtig: !!h.kdSteuerpflichtig,
    steuerHinweis: steuerHinweis(!!h.kdSteuerpflichtig, h.kdRegion, sprache),
    zahlungsbedingung: zbText,
    anzahlung:
      rr && rr.anzahlungBeruecksichtigen
        ? { brutto: rr.anzahlungBrutto, datum: rr.anzahlungDatum, rechnungsbetrag: rr.rechnungsbetrag }
        : null,
  };
}
