import "server-only";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { artikel, auftrag, belegPosition, rechnung, rechnungAnzahlung } from "@/lib/db/schema";
import { kdSnapshot, recomputeSummen, renumberPositionen } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";

/*
 * Anzahlungen (§ 13 Abs. 1 Nr. 1a S. 4, § 14 Abs. 5 UStG):
 *  - Anzahlungsrechnung = eigener Belegtyp, aus dem Auftrag erzeugt (Betrag oder % vom Auftrags-Brutto),
 *    der vereinbarte Betrag ist BRUTTO; MwSt wird herausgerechnet. Buchen wie jede Rechnung (RG-Nummer).
 *  - Endrechnung weist die Gesamtleistung aus und zieht gebuchte Anzahlungen mit ihrer MwSt ab
 *    (Tabelle rechnung_anzahlung, Beträge eingefroren). Eine Anzahlung wird nur einmal abgezogen.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Netto zu einem Brutto so bestimmen, dass netto + round(netto·Satz) exakt das Brutto ergibt. */
export function bruttoZuNetto(brutto: number, satz: number): { netto: number; mwst: number } {
  if (!satz) return { netto: r2(brutto), mwst: 0 };
  const basis = r2(brutto / (1 + satz / 100));
  for (const d of [0, -0.01, 0.01, -0.02, 0.02]) {
    const netto = r2(basis + d);
    const mwst = r2(netto * satz / 100);
    if (r2(netto + mwst) === r2(brutto)) return { netto, mwst };
  }
  return { netto: basis, mwst: r2(brutto - basis) };
}

/** Anzahlungsrechnung (Entwurf) zum Auftrag anlegen. `wert` = Brutto-Betrag oder Prozent vom Auftrags-Brutto. */
export async function createAnzahlungsrechnung(
  auftragId: string,
  modus: "betrag" | "prozent",
  wert: number,
): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (!Number.isFinite(wert) || wert <= 0) throw new DomainError("VALIDATION", "Bitte einen positiven Wert eingeben.");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  if (!a.kundeId) throw new DomainError("STATE", "Der Auftrag hat keinen Kunden.");

  let brutto = wert;
  if (modus === "prozent") {
    if (wert > 100) throw new DomainError("VALIDATION", "Prozentsatz über 100 %.");
    const auftragBrutto = Number(a.summeBrutto ?? 0);
    if (!auftragBrutto) throw new DomainError("STATE", "Der Auftrag hat noch keine Summe — bitte Betrag statt Prozent angeben.");
    brutto = r2(auftragBrutto * wert / 100);
  }

  const snap = await kdSnapshot(a.kundeId);
  const satz = snap.kdSteuerpflichtig ? Number((await getFirmaSetting()).mwstSatz) : 0;
  const { netto } = bruttoZuNetto(brutto, satz);
  const en = snap.kdSprache === "EN";
  const [modell] = a.modellArtikelId
    ? await db.select({ name: artikel.nameBelege }).from(artikel).where(eq(artikel.id, a.modellArtikelId))
    : [];

  const id = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(rechnung)
      .values({
        nummer: null,
        belegart: "ANZAHLUNGSRECHNUNG",
        status: "ENTWURF",
        auftragId,
        ...snap,
        modellArtikelId: a.modellArtikelId,
        bemerkungRechnung: modus === "prozent"
          ? (en ? `Down payment ${wert} % of order ${a.nummer}` : `Anzahlung ${wert} % des Auftrags ${a.nummer}`)
          : null,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: rechnung.id });
    await tx.insert(belegPosition).values({
      rechnungId: neu.id,
      posNr: 1,
      artikelName: en ? `Down payment for order ${a.nummer}` : `Anzahlung gemäß Auftrag ${a.nummer}`,
      artikelBeschreibung: modell?.name ?? null,
      anzahl: "1",
      einzelpreis: String(netto),
      rabattProzent: "0",
      reRelevant: true,
      herkunftSlotKey: "anzahlung",
      createdBy: user.id,
      updatedBy: user.id,
    });
    return neu.id;
  });
  await renumberPositionen("rechnung", id);
  await recomputeSummen("rechnung", id);
  return id;
}

/** Gebuchte Anzahlungsrechnungen des Auftrags, die noch in keiner (nicht stornierten) Rechnung abgezogen sind. */
async function freieAnzahlungen(auftragId: string, ausser: string) {
  const vergeben = db
    .select({ id: rechnungAnzahlung.anzahlungRechnungId })
    .from(rechnungAnzahlung)
    .innerJoin(rechnung, eq(rechnung.id, rechnungAnzahlung.rechnungId))
    .where(and(
      eq(rechnung.belegart, "RECHNUNG"),
      inArray(rechnung.status, ["ENTWURF", "GEBUCHT", "BEZAHLT"]),
      ne(rechnung.id, ausser),
    ));
  return db
    .select()
    .from(rechnung)
    .where(and(
      eq(rechnung.auftragId, auftragId),
      eq(rechnung.belegart, "ANZAHLUNGSRECHNUNG"),
      inArray(rechnung.status, ["GEBUCHT", "BEZAHLT"]),
      sql`${rechnung.id} not in (${vergeben})`,
    ))
    .orderBy(asc(rechnung.rechnungsdatum));
}

/** Entwurf einer Rechnung: alle freien Anzahlungen des Auftrags als Abzug übernehmen. Gibt die Anzahl zurück. */
export async function anzahlungenUebernehmen(rechnungId: string): Promise<number> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, rechnungId));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  if (r.status !== "ENTWURF" || r.belegart !== "RECHNUNG" || !r.auftragId) return 0;

  const schon = new Set((await db
    .select({ az: rechnungAnzahlung.anzahlungRechnungId })
    .from(rechnungAnzahlung)
    .where(eq(rechnungAnzahlung.rechnungId, rechnungId))).map((x) => x.az));
  const frei = (await freieAnzahlungen(r.auftragId, rechnungId)).filter((a) => !schon.has(a.id));
  if (frei.length) {
    await db.insert(rechnungAnzahlung).values(frei.map((a) => ({
      rechnungId,
      anzahlungRechnungId: a.id,
      netto: a.summeNetto ?? "0",
      mwst: a.summeMwst ?? "0",
      brutto: a.summeBrutto ?? "0",
      createdBy: user.id,
      updatedBy: user.id,
    })));
    await recomputeSummen("rechnung", rechnungId);
  }
  return frei.length;
}

/** Abzug aus einem Entwurf entfernen. */
export async function entferneAbzug(rechnungId: string, abzugId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select({ status: rechnung.status }).from(rechnung).where(eq(rechnung.id, rechnungId));
  if (r?.status !== "ENTWURF") throw new DomainError("STATE", "Nur im Entwurf änderbar.");
  await db.delete(rechnungAnzahlung)
    .where(and(eq(rechnungAnzahlung.id, abzugId), eq(rechnungAnzahlung.rechnungId, rechnungId)));
  await recomputeSummen("rechnung", rechnungId);
}

/** Abzüge einer Rechnung (für Anzeige und Druck). */
export async function listAbzuege(rechnungId: string) {
  return db
    .select({
      id: rechnungAnzahlung.id,
      anzahlungRechnungId: rechnungAnzahlung.anzahlungRechnungId,
      nummer: rechnung.nummer,
      datum: rechnung.rechnungsdatum,
      status: rechnung.status,
      zahlungsdatum: rechnung.zahlungsdatum,
      netto: rechnungAnzahlung.netto,
      mwst: rechnungAnzahlung.mwst,
      brutto: rechnungAnzahlung.brutto,
    })
    .from(rechnungAnzahlung)
    .innerJoin(rechnung, eq(rechnung.id, rechnungAnzahlung.anzahlungRechnungId))
    .where(eq(rechnungAnzahlung.rechnungId, rechnungId))
    .orderBy(asc(rechnung.rechnungsdatum));
}

/** In welcher (nicht stornierten) Rechnung ist diese Anzahlung schon abgezogen? */
export async function abgezogenIn(anzahlungRechnungId: string) {
  const [x] = await db
    .select({ id: rechnung.id, nummer: rechnung.nummer, status: rechnung.status })
    .from(rechnungAnzahlung)
    .innerJoin(rechnung, eq(rechnung.id, rechnungAnzahlung.rechnungId))
    .where(and(
      eq(rechnungAnzahlung.anzahlungRechnungId, anzahlungRechnungId),
      eq(rechnung.belegart, "RECHNUNG"),
      inArray(rechnung.status, ["ENTWURF", "GEBUCHT", "BEZAHLT"]),
    ));
  return x ?? null;
}
