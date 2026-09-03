import "server-only";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import { artikel, auftrag, kunde, seriennummer } from "@/lib/db/schema";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { orderByFor } from "./_sort";
import { getFirmaSetting } from "./stammdaten";

export const SERIENNUMMER_SORT: Record<string, unknown> = {
  lfd: seriennummer.lfd,
  anzeige: seriennummer.anzeige,
  vergabe: seriennummer.manuell,
  modell: artikel.nameLang,
  kunde: sql`lower(coalesce(${kunde.kurzname}, ${kunde.firma}, ${auftrag.kdFirma}, ${auftrag.kdNachname}, ''))`,
  vergebenAm: seriennummer.vergebenAm,
  auftrag: auftrag.nummer,
};

/** Jahrpräfix nach der historischen Regel (7w): ≤2025 → letzte Ziffer, ≥2026 → letzte zwei. */
export function jahrPraefixFuer(jahr: number): string {
  return jahr <= 2025 ? String(jahr % 10) : String(jahr % 100);
}

/* ---------------------------------------------------------------------- liste */

export async function listSeriennummern(
  params: { q?: string; page?: number; sort?: SortSpec } = {},
) {
  await requireUser();
  const pageSize = 60;
  const page = Math.max(params.page ?? 1, 1);

  const filters = [eq(seriennummer.geloescht, false)];
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(
      ilike(seriennummer.anzeige, like),
      ilike(auftrag.nummer, like),
      ilike(auftrag.kdFirma, like),
      ilike(auftrag.kdNachname, like),
    )!);
  }
  const where = and(...filters);

  const rows = await db
    .select({
      id: seriennummer.id,
      anzeige: seriennummer.anzeige,
      lfd: seriennummer.lfd,
      jahrPraefix: seriennummer.jahrPraefix,
      manuell: seriennummer.manuell,
      vergebenAm: seriennummer.vergebenAm,
      auftragId: seriennummer.auftragId,
      auftragNummer: auftrag.nummer,
      kdFirma: auftrag.kdFirma,
      kdNachname: auftrag.kdNachname,
      kdVorname: auftrag.kdVorname,
      kdOrt: auftrag.kdOrt,
      modellName: artikel.nameLang,
      kurzname: kunde.kurzname,
      firma: kunde.firma,
    })
    .from(seriennummer)
    .leftJoin(auftrag, eq(auftrag.id, seriennummer.auftragId))
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(kunde, eq(kunde.id, auftrag.kundeId))
    .where(where)
    .orderBy(...orderByFor(SERIENNUMMER_SORT, params.sort, seriennummer.lfd))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seriennummer)
    .leftJoin(auftrag, eq(auftrag.id, seriennummer.auftragId))
    .where(where);

  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/** Kürzlich gelöschte Nummern werden nur bis zu diesem Abstand zur Kandidatennummer neu vergeben. */
const LUECKE_FENSTER = 10;

/**
 * Nächste **automatische** laufende Nummer: die höchste bisher *automatisch* vergebene
 * lfd + 1 (manuell vergebene Nummern zählen dabei nicht), mindestens
 * `firma_setting.serien_start`. Ist diese Nummer schon von einer *aktiven* Seriennummer
 * belegt (z. B. vorab manuell vergeben), wird hochgezählt.
 *
 * **Lücken-Reuse:** Eine *gelöschte* Nummer wird wieder vergeben, wenn sie nicht kleiner
 * ist als (Kandidatennummer − 10). Ältere Lücken bleiben dauerhaft frei. Von mehreren
 * wiederverwendbaren Lücken wird die niedrigste genommen.
 */
export async function naechsteLfd(): Promise<number> {
  const fs = await getFirmaSetting();
  const [{ maxAuto }] = await db
    .select({
      maxAuto: sql<number>`coalesce(max(${seriennummer.lfd}) filter (where ${seriennummer.manuell} = false), 0)`,
    })
    .from(seriennummer);
  const alle = await db
    .select({ lfd: seriennummer.lfd, geloescht: seriennummer.geloescht })
    .from(seriennummer);
  const aktiv = new Set(alle.filter((r) => !r.geloescht).map((r) => Number(r.lfd)));
  const geloescht = new Set(alle.filter((r) => r.geloescht).map((r) => Number(r.lfd)));
  const alleLfd = new Set(alle.map((r) => Number(r.lfd)));

  const N = Math.max(Number(maxAuto) + 1, fs.serienStart);

  // gelöschte Nummer im Fenster [N-10, N) wiederverwenden (niedrigste zuerst)
  for (let g = Math.max(N - LUECKE_FENSTER, fs.serienStart); g < N; g++) {
    if (geloescht.has(g) && !aktiv.has(g)) return g;
  }

  // sonst N; alles jemals Verwendete oberhalb überspringen
  let cand = N;
  while (alleLfd.has(cand)) cand++;
  return cand;
}

/* ------------------------------------------------------------------ vergeben */

export async function getAuftragSeriennummer(auftragId: string) {
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  if (!a.seriennummerId) return { auftrag: a, seriennummer: null };
  const [sn] = await db.select().from(seriennummer).where(eq(seriennummer.id, a.seriennummerId));
  return { auftrag: a, seriennummer: sn ?? null };
}

export async function vergebeSeriennummerAuto(auftragId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  if (a.seriennummerId) throw new DomainError("CONFLICT", "Es ist bereits eine Seriennummer vergeben.");
  if (!a.bauplandatum) throw new DomainError("STATE", "Kein Bauplandatum — Seriennummer kann nicht vergeben werden.");

  const jahr = Number(a.bauplandatum.slice(0, 4));
  const praefix = jahrPraefixFuer(jahr);
  const lfd = await naechsteLfd();
  const heute = new Date().toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    // Wird eine Lücke wiederverwendet, die alte (gelöschte) Zeile reaktivieren statt neu anlegen
    // (der Unique-Constraint (jahr_praefix, lfd) verträgt keine zweite Zeile mit gleicher lfd).
    const [tomb] = await tx
      .select({ id: seriennummer.id })
      .from(seriennummer)
      .where(and(eq(seriennummer.lfd, lfd), eq(seriennummer.geloescht, true)))
      .limit(1);

    let snId: string;
    if (tomb) {
      await tx.update(seriennummer).set({
        jahrPraefix: praefix, auftragId, manuell: false, geloescht: false, vergebenAm: heute,
        updatedAt: new Date(), updatedBy: user.id,
      }).where(eq(seriennummer.id, tomb.id));
      snId = tomb.id;
    } else {
      const [sn] = await tx.insert(seriennummer).values({
        lfd, jahrPraefix: praefix, auftragId, manuell: false, vergebenAm: heute,
        createdBy: user.id, updatedBy: user.id,
      }).returning({ id: seriennummer.id });
      snId = sn.id;
    }
    await tx.update(auftrag)
      .set({ seriennummerId: snId, sernrVergebenAm: heute, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(auftrag.id, auftragId));
  });
}

export async function vergebeSeriennummerManuell(auftragId: string, eingabe: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  if (a.seriennummerId) throw new DomainError("CONFLICT", "Es ist bereits eine Seriennummer vergeben.");

  // Eingabe "26 5404" oder "5404"
  const parts = eingabe.trim().split(/\s+/);
  let praefix: string;
  let lfd: number;
  if (parts.length >= 2) {
    praefix = parts[0];
    lfd = Number(parts[1]);
  } else {
    lfd = Number(parts[0]);
    praefix = jahrPraefixFuer(a.bauplandatum ? Number(a.bauplandatum.slice(0, 4)) : new Date().getFullYear());
  }
  if (!Number.isInteger(lfd) || lfd <= 0) throw new DomainError("VALIDATION", "Ungültige Seriennummer.");

  const [dup] = await db
    .select({ id: seriennummer.id })
    .from(seriennummer)
    .where(and(eq(seriennummer.jahrPraefix, praefix), eq(seriennummer.lfd, lfd), eq(seriennummer.geloescht, false)));
  if (dup) throw new DomainError("CONFLICT", `Seriennummer ${praefix} ${lfd} ist bereits vergeben.`);

  const heute = new Date().toISOString().slice(0, 10);
  await db.transaction(async (tx) => {
    const [sn] = await tx.insert(seriennummer).values({
      lfd, jahrPraefix: praefix, auftragId, manuell: true, vergebenAm: heute,
      createdBy: user.id, updatedBy: user.id,
    }).returning({ id: seriennummer.id });
    await tx.update(auftrag)
      .set({ seriennummerId: sn.id, sernrVergebenAm: heute, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(auftrag.id, auftragId));
  });
}

/** Seriennummer entfernen — Zeile bleibt als Lücke (geloescht=true, auftrag_id=null). */
export async function loescheSeriennummer(auftragId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a || !a.seriennummerId) throw new DomainError("STATE", "Keine Seriennummer vergeben.");
  await db.transaction(async (tx) => {
    await tx.update(seriennummer)
      .set({ geloescht: true, auftragId: null, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(seriennummer.id, a.seriennummerId!));
    await tx.update(auftrag)
      .set({ seriennummerId: null, sernrVergebenAm: null, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(auftrag.id, auftragId));
  });
}

/** Aufträge ohne Seriennummer (für den Vergabe-Picker im Register). */
export async function auftraegeOhneSeriennummer(q: string, limit = 15) {
  await requireUser();
  const filters = [isNull(auftrag.seriennummerId), eq(auftrag.auftragsart, "PRODUKTION")];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(auftrag.nummer, like), ilike(auftrag.kdFirma, like), ilike(auftrag.kdNachname, like))!);
  }
  return db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      kdFirma: auftrag.kdFirma,
      kdNachname: auftrag.kdNachname,
      kdVorname: auftrag.kdVorname,
      kurzname: kunde.kurzname,
      firma: kunde.firma,
    })
    .from(auftrag)
    .leftJoin(kunde, eq(kunde.id, auftrag.kundeId))
    .where(and(...filters))
    .orderBy(desc(auftrag.createdAt))
    .limit(limit);
}
