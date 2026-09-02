import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import { angebot, artikel, belegPosition, kunde } from "@/lib/db/schema";
import { ANGEBOT_STATUS_VALUES as STATUS_VALUES, type AngebotStatus } from "@/lib/angebot-shared";
import { allocateNummer, kdSnapshot } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { orderByFor } from "./_sort";

export { ANGEBOT_STATUS, ANGEBOT_STATUS_LABEL } from "@/lib/angebot-shared";

/* ---------------------------------------------------------------------- liste */

export const ANGEBOT_SORT: Record<string, unknown> = {
  nummer: angebot.nummer,
  datum: angebot.angebotsdatum,
  kunde: sql`coalesce(${angebot.kdFirma}, ${angebot.kdNachname})`,
  modell: artikel.nameBelege,
  status: angebot.status,
  waehrung: angebot.kdWaehrung,
  netto: angebot.summeNetto,
};

export async function listAngebote(
  params: { q?: string; status?: string; page?: number; sort?: SortSpec } = {},
) {
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);

  const filters = [];
  if (params.status && (STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(angebot.status, params.status as AngebotStatus));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(
      or(ilike(angebot.nummer, like), ilike(angebot.kdFirma, like), ilike(angebot.kdNachname, like))!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;

  const modell = artikel;
  const rows = await db
    .select({
      id: angebot.id,
      nummer: angebot.nummer,
      status: angebot.status,
      angebotsdatum: angebot.angebotsdatum,
      kdFirma: angebot.kdFirma,
      kdVorname: angebot.kdVorname,
      kdNachname: angebot.kdNachname,
      kdWaehrung: angebot.kdWaehrung,
      summeNetto: angebot.summeNetto,
      modellName: modell.nameBelege,
    })
    .from(angebot)
    .leftJoin(modell, eq(angebot.modellArtikelId, modell.id))
    .where(where)
    .orderBy(...orderByFor(ANGEBOT_SORT, params.sort, angebot.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(angebot)
    .where(where);

  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/* --------------------------------------------------------------------- detail */

export async function getAngebot(id: string) {
  const row = await db.query.angebot.findFirst({ where: eq(angebot.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Angebot nicht gefunden.");
  let modellName: string | null = null;
  if (row.modellArtikelId) {
    const [m] = await db.select({ n: artikel.nameBelege }).from(artikel).where(eq(artikel.id, row.modellArtikelId));
    modellName = m?.n ?? null;
  }
  return { angebot: row, modellName };
}

export async function angebotPositionCount(id: string) {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(belegPosition)
    .where(eq(belegPosition.angebotId, id));
  return c;
}

/* ------------------------------------------------------------------ mutationen */

export async function createAngebot(kundeId?: string | null): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const jahr = new Date().getFullYear();
  const nummer = await allocateNummer("ANGEBOT", jahr);
  const snap = kundeId ? await kdSnapshot(kundeId) : {};
  const [row] = await db
    .insert(angebot)
    .values({
      nummer,
      status: "NEU",
      angebotsdatum: new Date().toISOString().slice(0, 10),
      ...snap,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: angebot.id });
  return row.id;
}

export async function setAngebotKunde(id: string, kundeId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const snap = await kdSnapshot(kundeId);
  await db
    .update(angebot)
    .set({ ...snap, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(angebot.id, id));
}

export const angebotKopfSchema = z.object({
  status: z.enum(STATUS_VALUES),
  angebotsdatum: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum YYYY-MM-DD").nullable(),
  ),
  kopftext: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
    z.string().nullable(),
  ),
});
export type AngebotKopfInput = z.infer<typeof angebotKopfSchema>;

export async function updateAngebotKopf(id: string, input: AngebotKopfInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(angebot)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(angebot.id, id))
    .returning({ id: angebot.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Angebot nicht gefunden.");
}

/** Kunden-Kurzliste für den Kunden-Picker. */
export async function kundenPickerListe(q: string, limit = 30) {
  const filters = [sql`${kunde.deletedAt} is null`];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(kunde.firma, like), ilike(kunde.nachname, like), ilike(kunde.kurzname, like), ilike(kunde.kundenNr, like))!);
  }
  return db
    .select({
      id: kunde.id,
      firma: kunde.firma,
      vorname: kunde.vorname,
      nachname: kunde.nachname,
      kurzname: kunde.kurzname,
      ort: kunde.ort,
      kontaktart: kunde.kontaktart,
    })
    .from(kunde)
    .where(and(...filters))
    .orderBy(asc(sql`lower(coalesce(${kunde.firma}, ${kunde.nachname}, ${kunde.kurzname}, ''))`))
    .limit(limit);
}
