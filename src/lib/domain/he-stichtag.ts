import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { artikel, auftrag, heStichtag, heStichtagPosition, seriennummer } from "@/lib/db/schema";
import { heuteBerlin } from "@/lib/utils";
import { computeFortschritt } from "./arbeitsschritt";
import { recomputeUmsatzerwartung } from "./belege";
import { requireUser } from "./context";

/**
 * Stand HE (halbfertige Erzeugnisse): Gitarren „In Werkstatt" / „Bei Nicl" mit
 * HE-Wert = Umsatzerwartung (EUR) × Work %. Zum Monatsende (Cron) unveränderbar festgeschrieben.
 */
const HE_STATUS = ["WERKSTATT", "BEI_NICL"] as const;

async function heZeilen() {
  return db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      status: auftrag.status,
      seriennummer: seriennummer.anzeige,
      modell: sql<string | null>`coalesce(${artikel.nameLang}, ${artikel.nameBelege})`,
      kunde: sql<string | null>`coalesce(nullif(${auftrag.kdFirma}, ''), nullif(trim(concat_ws(' ', ${auftrag.kdVorname}, ${auftrag.kdNachname})), ''))`,
      work: auftrag.fortschrittProzent,
      umsatz: auftrag.umsatzerwartung,
      he: auftrag.standHeWert,
    })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(inArray(auftrag.status, [...HE_STATUS]))
    .orderBy(asc(auftrag.nummer));
}

/** Work % und Umsatzerwartung/Stand HE aller betroffenen Aufträge frisch berechnen. */
async function aktualisieren() {
  const ids = await db.select({ id: auftrag.id }).from(auftrag).where(inArray(auftrag.status, [...HE_STATUS]));
  for (const { id } of ids) {
    const prozent = await computeFortschritt(id);
    await db.update(auftrag).set({ fortschrittProzent: prozent }).where(eq(auftrag.id, id));
    await recomputeUmsatzerwartung(id); // setzt auch stand_he_wert = Umsatz × Work %
  }
}

/** Live-Stand (Report-Seite). */
export async function heStandLive() {
  await requireUser();
  const zeilen = await heZeilen();
  return {
    zeilen,
    umsatz: zeilen.reduce((s, z) => s + Number(z.umsatz ?? 0), 0),
    he: zeilen.reduce((s, z) => s + Number(z.he ?? 0), 0),
  };
}

export async function listHeStichtage() {
  await requireUser();
  return db.select().from(heStichtag).orderBy(desc(heStichtag.monat));
}

export async function heStichtagPositionen(monat: string) {
  await requireUser();
  return db.select().from(heStichtagPosition).where(eq(heStichtagPosition.monat, monat)).orderBy(asc(heStichtagPosition.auftragNummer));
}

/** Ist heute (Europe/Berlin) der letzte Tag des Monats? */
export function istMonatsletzter(heute = heuteBerlin()): boolean {
  const d = new Date(`${heute}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.getUTCDate() === 1;
}

/**
 * Stichtag für den laufenden Monat festschreiben (idempotent: existiert er schon, bleibt er unverändert).
 * Ohne Benutzer — wird vom Cron aufgerufen.
 */
export async function schreibeHeStichtag(): Promise<{ monat: string; neu: boolean; anzahl: number; he: number }> {
  const heute = heuteBerlin();
  const monat = heute.slice(0, 7);
  const [vorhanden] = await db.select().from(heStichtag).where(eq(heStichtag.monat, monat));
  if (vorhanden) return { monat, neu: false, anzahl: vorhanden.anzahl, he: Number(vorhanden.heWertEur) };

  await aktualisieren();
  const zeilen = await heZeilen();
  const umsatz = zeilen.reduce((s, z) => s + Number(z.umsatz ?? 0), 0);
  const he = zeilen.reduce((s, z) => s + Number(z.he ?? 0), 0);
  await db.transaction(async (tx) => {
    await tx.insert(heStichtag).values({
      monat, stichtag: heute, anzahl: zeilen.length,
      umsatzerwartungEur: umsatz.toFixed(2), heWertEur: he.toFixed(2),
    });
    if (zeilen.length) {
      await tx.insert(heStichtagPosition).values(zeilen.map((z) => ({
        monat, auftragId: z.id, auftragNummer: z.nummer, seriennummer: z.seriennummer, modell: z.modell,
        kunde: z.kunde, status: z.status, workProzent: z.work,
        umsatzerwartungEur: z.umsatz, heWertEur: z.he,
      })));
    }
  });
  return { monat, neu: true, anzahl: zeilen.length, he };
}
