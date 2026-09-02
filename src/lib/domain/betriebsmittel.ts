import "server-only";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import { betriebsmittel } from "@/lib/db/schema";
import { BM_KATEGORIE_VALUES, EINHEIT_VALUES } from "@/lib/betriebsmittel-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { orderByFor } from "./_sort";

const BM_NAME_SQL = sql`lower(${betriebsmittel.bezeichnung})`;

export const BM_SORT: Record<string, unknown> = {
  bezeichnung: BM_NAME_SQL,
  kategorie: betriebsmittel.produktkategorie,
  hersteller: betriebsmittel.hersteller,
  menge: betriebsmittel.menge,
  ek: betriebsmittel.einkaufspreis,
  wert: betriebsmittel.wert,
};

export {
  BM_KATEGORIE, BM_KATEGORIE_LABEL, EINHEIT, EINHEIT_LABEL,
} from "@/lib/betriebsmittel-shared";

/* -------------------------------------------------------------------- helpers */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const enumOrNull = <T extends readonly [string, ...string[]]>(vals: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(vals).nullable());
const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().min(0).transform((n) => n.toString()).nullable(),
);

/* --------------------------------------------------------------------- liste */

export async function listBetriebsmittel(
  params: { q?: string; kategorie?: string; page?: number; sort?: SortSpec } = {},
) {
  await requireUser();
  const pageSize = 60;
  const page = Math.max(params.page ?? 1, 1);

  const filters = [];
  if (params.kategorie && (BM_KATEGORIE_VALUES as readonly string[]).includes(params.kategorie)) {
    filters.push(eq(betriebsmittel.produktkategorie, params.kategorie as (typeof BM_KATEGORIE_VALUES)[number]));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(
      ilike(betriebsmittel.bezeichnung, like),
      ilike(betriebsmittel.artikelnummer, like),
      ilike(betriebsmittel.hersteller, like),
      ilike(betriebsmittel.lieferant, like),
    )!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select()
    .from(betriebsmittel)
    .where(where)
    .orderBy(...orderByFor(BM_SORT, params.sort, BM_NAME_SQL, "asc"))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [agg] = await db
    .select({
      count: sql<number>`count(*)::int`,
      wert: sql<string>`coalesce(sum(${betriebsmittel.wert}), 0)::text`,
    })
    .from(betriebsmittel)
    .where(where);

  return {
    rows,
    total: agg.count,
    wertSumme: agg.wert,
    page,
    pageCount: Math.max(Math.ceil(agg.count / pageSize), 1),
  };
}

export async function getBetriebsmittel(id: string) {
  const row = await db.query.betriebsmittel.findFirst({ where: eq(betriebsmittel.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Betriebsmittel nicht gefunden.");
  return row;
}

/** Kennzahlen fürs Seitenkopf-Banner. */
export async function betriebsmittelKennzahlen() {
  const [k] = await db
    .select({
      anzahl: sql<number>`count(*)::int`,
      wert: sql<string>`coalesce(sum(${betriebsmittel.wert}), 0)::text`,
    })
    .from(betriebsmittel);
  return k;
}

/* ------------------------------------------------------------------- schema */

export const betriebsmittelSchema = z.object({
  bezeichnung: z.string().trim().min(1, "Pflichtfeld"),
  artikelnummer: nullableText,
  hersteller: nullableText,
  lieferant: nullableText,
  produktkategorie: enumOrNull(BM_KATEGORIE_VALUES),
  einheit: enumOrNull(EINHEIT_VALUES),
  menge: decimalOrNull,
  einkaufspreis: decimalOrNull,
  anmerkungen: nullableText,
});
export type BetriebsmittelInput = z.infer<typeof betriebsmittelSchema>;

/* ------------------------------------------------------------------ mutationen */

export async function saveBetriebsmittel(id: string | null, input: BetriebsmittelInput): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  const values = { ...input, menge: input.menge ?? "0" };
  if (id) {
    const res = await db
      .update(betriebsmittel)
      .set({ ...values, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(betriebsmittel.id, id))
      .returning({ id: betriebsmittel.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Betriebsmittel nicht gefunden.");
    return id;
  }
  const [row] = await db
    .insert(betriebsmittel)
    .values({ ...values, createdBy: user.id, updatedBy: user.id })
    .returning({ id: betriebsmittel.id });
  return row.id;
}

/** Schnelle Mengenkorrektur aus der Liste (Inventur). */
export async function setBetriebsmittelMenge(id: string, menge: number) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  if (!Number.isFinite(menge) || menge < 0) throw new DomainError("VALIDATION", "Ungültige Menge.");
  const res = await db
    .update(betriebsmittel)
    .set({ menge: menge.toString(), updatedAt: new Date(), updatedBy: user.id })
    .where(eq(betriebsmittel.id, id))
    .returning({ id: betriebsmittel.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Betriebsmittel nicht gefunden.");
}

export async function deleteBetriebsmittel(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(betriebsmittel).where(eq(betriebsmittel.id, id));
}
