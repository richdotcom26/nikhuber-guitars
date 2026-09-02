import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  auftrag, holzart, holzInventar, holzStruktur, holzUnterart, kunde, lagerort,
} from "@/lib/db/schema";
import { HOLZ_STATUS_VALUES, neueInventarId } from "@/lib/holz-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export { HOLZ_STATUS, HOLZ_STATUS_LABEL } from "@/lib/holz-shared";

/* ------------------------------------------------------------------ helpers */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const enumOrNull = <T extends readonly [string, ...string[]]>(vals: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(vals).nullable());
const uuidOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());
const intOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().int().nullable(),
);
const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);
const dateOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

/* -------------------------------------------------------------------- liste */

export async function listHolz(params: { q?: string; status?: string; holzartId?: string; page?: number } = {}) {
  const pageSize = 60;
  const page = Math.max(params.page ?? 1, 1);
  const filters = [];
  if (params.status && (HOLZ_STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(holzInventar.status, params.status as (typeof HOLZ_STATUS_VALUES)[number]));
  }
  if (params.holzartId) filters.push(eq(holzInventar.holzartId, params.holzartId));
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(
      ilike(holzInventar.inventarId, like),
      ilike(holzInventar.unterart, like),
      ilike(holzInventar.struktur, like),
      ilike(holzInventar.besonderes, like),
    )!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: holzInventar.id,
      inventarId: holzInventar.inventarId,
      holzartName: holzart.holz,
      unterart: holzInventar.unterart,
      struktur: holzInventar.struktur,
      qualitaet: holzInventar.qualitaet,
      dicke: holzInventar.dicke,
      piece: holzInventar.piece,
      fuer: holzInventar.fuer,
      status: holzInventar.status,
      reserviertFuerAuftragId: holzInventar.reserviertFuerAuftragId,
      auftragNummer: auftrag.nummer,
    })
    .from(holzInventar)
    .leftJoin(holzart, eq(holzInventar.holzartId, holzart.id))
    .leftJoin(auftrag, eq(holzInventar.reserviertFuerAuftragId, auftrag.id))
    .where(where)
    .orderBy(asc(holzInventar.inventarId))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(holzInventar).where(where);
  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/** Holzart-Auswahl + Lagerort-Auswahl + Vokabeln (Unterart/Struktur) für Formulare. */
export async function holzFormOptionen() {
  const [arten, orte, unterarten, strukturen] = await Promise.all([
    db.select({ id: holzart.id, holz: holzart.holz }).from(holzart).orderBy(asc(holzart.holz)),
    db.select({ id: lagerort.id, code: lagerort.code, bezeichnung: lagerort.bezeichnung }).from(lagerort).orderBy(asc(lagerort.code)),
    db.select({ holzartLabel: holzUnterart.holzartLabel, name: holzUnterart.name })
      .from(holzUnterart).orderBy(asc(holzUnterart.holzartLabel), asc(holzUnterart.name)),
    db.select({ name: holzStruktur.name }).from(holzStruktur).orderBy(asc(holzStruktur.name)),
  ]);
  return { arten, orte, unterarten, strukturen: strukturen.map((s) => s.name) };
}

/* --------------------------------------------------------------------- detail */

export async function getHolz(id: string) {
  const row = await db.query.holzInventar.findFirst({ where: eq(holzInventar.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Holz-Datensatz nicht gefunden.");
  let auftragInfo: { id: string; nummer: string } | null = null;
  if (row.reserviertFuerAuftragId) {
    const [a] = await db.select({ id: auftrag.id, nummer: auftrag.nummer }).from(auftrag).where(eq(auftrag.id, row.reserviertFuerAuftragId));
    auftragInfo = a ?? null;
  }
  return { holz: row, auftragInfo };
}

/* ------------------------------------------------------------------- schema */

export const holzSchema = z.object({
  inventarId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : null),
    z.string().min(3).max(12).nullable(),
  ),
  holzartId: uuidOrNull,
  unterart: nullableText,
  struktur: nullableText,
  qualitaet: enumOrNull(["STANDARD", "EXCEPTIONAL"] as const),
  dicke: enumOrNull(["DUENN", "DICK"] as const),
  groesse: enumOrNull(["STANDARD", "RIETBERGEN"] as const),
  piece: enumOrNull(["EIN_PC", "ZWEI_PC"] as const),
  fuer: enumOrNull(["TOP", "BODY", "NECK", "FRETBOARD"] as const),
  cnc: enumOrNull(["STANDARD", "DICK_59", "HOLLOW_BODY", "HONEYCOMB"] as const),
  gewichtG: intOrNull,
  besonderes: nullableText,
  bemerkung: nullableText,
  eingangAm: dateOrNull,
  lagerortId: uuidOrNull,
  holzhaendlerId: uuidOrNull,
  einkaufspreis: decimalOrNull,
  profitMargin: decimalOrNull,
  verkaufspreis: decimalOrNull,
});
export type HolzInput = z.infer<typeof holzSchema>;

/* ------------------------------------------------------------------ mutationen */

export async function createHolz(input: HolzInput): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  let inventarId = input.inventarId ?? null;
  for (let tries = 0; !inventarId && tries < 10; tries++) {
    const cand = neueInventarId();
    const [dup] = await db.select({ id: holzInventar.id }).from(holzInventar).where(eq(holzInventar.inventarId, cand));
    if (!dup) inventarId = cand;
  }
  if (!inventarId) throw new DomainError("CONFLICT", "Keine freie Inventar-ID gefunden.");

  const { inventarId: _drop, ...rest } = input;
  void _drop;
  try {
    const [row] = await db
      .insert(holzInventar)
      .values({ ...rest, inventarId, status: "FREI", createdBy: user.id, updatedBy: user.id })
      .returning({ id: holzInventar.id });
    return row.id;
  } catch {
    throw new DomainError("CONFLICT", "Inventar-ID bereits vergeben.");
  }
}

export async function updateHolz(id: string, input: HolzInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  const { inventarId, ...rest } = input;
  const set: Record<string, unknown> = { ...rest, updatedAt: new Date(), updatedBy: user.id };
  if (inventarId) set.inventarId = inventarId;
  const res = await db.update(holzInventar).set(set).where(eq(holzInventar.id, id)).returning({ id: holzInventar.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Holz-Datensatz nicht gefunden.");
}

export async function setHolzStatus(id: string, status: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  if (!(HOLZ_STATUS_VALUES as readonly string[]).includes(status)) {
    throw new DomainError("VALIDATION", "Ungültiger Status.");
  }
  const patch: Record<string, unknown> = {
    status: status as (typeof HOLZ_STATUS_VALUES)[number],
    statusGeaendertAm: new Date().toISOString().slice(0, 10),
    updatedAt: new Date(),
    updatedBy: user.id,
  };
  if (status !== "RESERVIERT") patch.reserviertFuerAuftragId = null;
  await db.update(holzInventar).set(patch).where(eq(holzInventar.id, id));
}

/** Für einen Auftrag reservieren (setzt Status RESERVIERT). */
export async function reserviereHolz(id: string, auftragId: string | null) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  await db
    .update(holzInventar)
    .set({
      reserviertFuerAuftragId: auftragId,
      status: auftragId ? "RESERVIERT" : "FREI",
      statusGeaendertAm: new Date().toISOString().slice(0, 10),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(holzInventar.id, id));
}

export async function deleteHolz(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(holzInventar).where(eq(holzInventar.id, id));
}

/* ----------------------------------------------------------------- Auftrag-Picker */

export async function auftragPickerListe(q: string, limit = 15) {
  const filters = [];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(auftrag.nummer, like), ilike(auftrag.kdFirma, like), ilike(auftrag.kdNachname, like))!);
  }
  return db
    .select({ id: auftrag.id, nummer: auftrag.nummer, kdFirma: auftrag.kdFirma, kdNachname: auftrag.kdNachname })
    .from(auftrag)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auftrag.createdAt))
    .limit(limit);
}

/* ---------------------------------------------------------------- Holzarten */

export async function listHolzarten() {
  return db.select().from(holzart).orderBy(asc(holzart.holz));
}

export const holzartSchema = z.object({
  holz: z.string().trim().min(1, "Pflichtfeld"),
  botanischerName: nullableText,
  herkunft: nullableText,
  holzdichte: decimalOrNull,
  species: nullableText,
  genus: nullableText,
  info: nullableText,
});
export type HolzartInput = z.infer<typeof holzartSchema>;

export async function saveHolzart(id: string | null, input: HolzartInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (id) {
    const res = await db.update(holzart).set({ ...input, updatedAt: new Date(), updatedBy: user.id }).where(eq(holzart.id, id)).returning({ id: holzart.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Holzart nicht gefunden.");
  } else {
    await db.insert(holzart).values({ ...input, createdBy: user.id, updatedBy: user.id });
  }
}

/* ----------------------------------------------------------------- Lagerorte */

export async function listLagerorte() {
  return db.select().from(lagerort).orderBy(asc(lagerort.code));
}

export const lagerortSchema = z.object({
  code: z.string().trim().min(1, "Pflichtfeld"),
  bezeichnung: nullableText,
});
export type LagerortInput = z.infer<typeof lagerortSchema>;

export async function saveLagerort(id: string | null, input: LagerortInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  try {
    if (id) {
      const res = await db.update(lagerort).set({ ...input, updatedAt: new Date(), updatedBy: user.id }).where(eq(lagerort.id, id)).returning({ id: lagerort.id });
      if (res.length === 0) throw new DomainError("NOT_FOUND", "Lagerort nicht gefunden.");
    } else {
      await db.insert(lagerort).values({ ...input, createdBy: user.id, updatedBy: user.id });
    }
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("CONFLICT", "Lagerort-Code bereits vergeben.");
  }
}

export async function deleteLagerort(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  try {
    await db.delete(lagerort).where(eq(lagerort.id, id));
  } catch {
    throw new DomainError("CONFLICT", "Lagerort wird noch verwendet.");
  }
}

// Referenz auf kunde für spätere Holzhändler-Auswahl (ungenutzten Import vermeiden)
export async function holzhaendlerListe() {
  return db
    .select({ id: kunde.id, firma: kunde.firma, nachname: kunde.nachname, kurzname: kunde.kurzname })
    .from(kunde)
    .where(and(eq(kunde.kontaktart, "HOLZHAENDLER"), isNull(kunde.deletedAt)))
    .orderBy(asc(sql`lower(coalesce(${kunde.firma}, ${kunde.nachname}, ${kunde.kurzname}, ''))`));
}
