import "server-only";
import { and, asc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import { artikel, kunde } from "@/lib/db/schema";
import { ARTIKELGRUPPE_VALUES } from "@/lib/artikel-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { orderByFor } from "./_sort";
import { getFirmaSetting } from "./stammdaten";

const ARTIKEL_NAME_SQL = sql`lower(coalesce(${artikel.nameBelege}, ${artikel.nameLang}, ${artikel.nameKurz}, ''))`;

export const ARTIKEL_SORT: Record<string, unknown> = {
  gruppe: artikel.artikelgruppe,
  name: ARTIKEL_NAME_SQL,
  nr: artikel.artikelNr,
  typ: artikel.artikeltyp,
  vkEur: artikel.vkEur,
  vkUs: artikel.vkUs,
  cites: artikel.geschuetztesHolzCites,
};

const ARTIKELTYP_VALUES = ["HOLZ", "HANDELSWARE"] as const;

export { ARTIKELGRUPPE_VALUES, artikelName, gruppeLabel } from "@/lib/artikel-shared";

/* ------------------------------------------------------------ preis-tiers §6 */

function r2(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}
const num = (v: string | null | undefined) => (v == null ? null : Number(v));

export interface TierInput {
  vkEur: number | null;
  vkUs: number | null;
  bruttoFuerNetto: boolean;
  nichtRabattierfaehig: boolean;
}
export interface Tiers {
  vkEurNet: string | null;
  net1: string | null;
  net2: string | null;
  netUs: string | null;
}

/**
 * Tier-Preise aus VK + Margen (ex Ninox 7y). `/ 1.19` ist HARTKODIERT (E16),
 * NICHT an mwst_satz gekoppelt. Margen aus `firma_setting`.
 */
export function computeTiers(
  i: TierInput,
  m: { net1: number; net2: number; us: number },
): Tiers {
  const { vkEur, vkUs, bruttoFuerNetto: bfn, nichtRabattierfaehig: nrf } = i;
  const vkEurNet = vkEur == null ? null : bfn ? r2(vkEur) : r2(vkEur / 1.19);
  const net1 = vkEur == null ? null
    : bfn ? r2(vkEur)
    : nrf ? (vkEurNet ?? r2(vkEur / 1.19))
    : r2(vkEur * (1 - m.net1 / 100));
  const net2 = vkEur == null ? null
    : bfn ? r2(vkEur)
    : nrf ? (vkEurNet ?? r2(vkEur / 1.19))
    : r2(vkEur * (1 - m.net2 / 100));
  const netUs = vkUs == null ? null
    : (bfn || nrf) ? r2(vkUs)
    : r2(vkUs * (1 - m.us / 100));
  return { vkEurNet, net1, net2, netUs };
}

async function margins() {
  const fs = await getFirmaSetting();
  return {
    net1: Number(fs.haendlerrabattNet1),
    net2: Number(fs.haendlerrabattNet2),
    us: Number(fs.usHaendlerrabatt),
  };
}

/* -------------------------------------------------------------------- schemas */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);
const uuidOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());
const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const artikelSchema = z.object({
  artikelgruppe: z.enum(ARTIKELGRUPPE_VALUES),
  artikeltyp: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(ARTIKELTYP_VALUES).nullable(),
  ),
  artikelNr: nullableText,
  nameKurz: nullableText,
  nameLang: nullableText,
  nameBelege: nullableText,
  nameZertifikat: nullableText,
  beschreibung: nullableText,

  vkEur: decimalOrNull,
  vkUs: decimalOrNull,
  bruttoFuerNetto: boolFlag,
  nichtRabattierfaehig: boolFlag,

  ekNettoEur: decimalOrNull,
  ekNettoUsd: decimalOrNull,
  hersteller: nullableText,
  lieferantId: uuidOrNull,
  lieferantArtikelNr: nullableText,
  bestandMin: decimalOrNull,
  bestandMax: decimalOrNull,

  geschuetztesHolzCites: boolFlag,
  gewichtKg: decimalOrNull,

  datensatzInaktiv: boolFlag,
  schreibgeschuetzt: boolFlag,

  // nur Modell:
  freitextBody: nullableText,
  freitextColour: nullableText,
  freitextNeck: nullableText,
  freitextAssembly: nullableText,
}).refine((v) => v.nameBelege?.trim() || v.nameLang?.trim() || v.nameKurz?.trim(), {
  message: "Mindestens ein Name (Belege / lang / kurz) angeben.",
  path: ["nameBelege"],
});
export type ArtikelInput = z.infer<typeof artikelSchema>;

/* ---------------------------------------------------------------------- liste */

export interface ListArtikelParams {
  q?: string;
  gruppe?: string;
  typ?: string;
  mitInaktiven?: boolean;
  /** 'nur' = nur MODEL, 'ohne' = ohne MODEL, undefined = alle */
  modelle?: "nur" | "ohne";
  page?: number;
  pageSize?: number;
  sort?: SortSpec;
}

export async function listArtikel(params: ListArtikelParams = {}) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
  const page = Math.max(params.page ?? 1, 1);

  const filters = [isNull(artikel.deletedAt)];
  if (params.modelle === "nur") filters.push(eq(artikel.artikelgruppe, "MODEL"));
  if (params.modelle === "ohne") filters.push(ne(artikel.artikelgruppe, "MODEL"));
  if (params.gruppe && (ARTIKELGRUPPE_VALUES as readonly string[]).includes(params.gruppe)) {
    filters.push(eq(artikel.artikelgruppe, params.gruppe as (typeof ARTIKELGRUPPE_VALUES)[number]));
  }
  if (params.typ && (ARTIKELTYP_VALUES as readonly string[]).includes(params.typ)) {
    filters.push(eq(artikel.artikeltyp, params.typ as (typeof ARTIKELTYP_VALUES)[number]));
  }
  if (!params.mitInaktiven) filters.push(eq(artikel.datensatzInaktiv, false));
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(
      or(
        ilike(artikel.nameBelege, like),
        ilike(artikel.nameLang, like),
        ilike(artikel.nameKurz, like),
        ilike(artikel.artikelNr, like),
        ilike(artikel.hersteller, like),
      )!,
    );
  }
  const where = and(...filters);

  const rows = await db
    .select({
      id: artikel.id,
      artikelNr: artikel.artikelNr,
      artikelgruppe: artikel.artikelgruppe,
      artikeltyp: artikel.artikeltyp,
      nameBelege: artikel.nameBelege,
      nameLang: artikel.nameLang,
      nameKurz: artikel.nameKurz,
      vkEur: artikel.vkEur,
      vkUs: artikel.vkUs,
      geschuetztesHolzCites: artikel.geschuetztesHolzCites,
      datensatzInaktiv: artikel.datensatzInaktiv,
    })
    .from(artikel)
    .where(where)
    .orderBy(...orderByFor(ARTIKEL_SORT, params.sort, ARTIKEL_NAME_SQL, "asc"))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(artikel).where(where);
  return { rows, total: count, page, pageSize, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/* --------------------------------------------------------------------- detail */

export async function getArtikel(id: string) {
  const row = await db.query.artikel.findFirst({
    where: and(eq(artikel.id, id), isNull(artikel.deletedAt)),
  });
  if (!row) throw new DomainError("NOT_FOUND", "Artikel nicht gefunden.");
  let lieferantName: string | null = null;
  if (row.lieferantId) {
    const [l] = await db
      .select({ firma: kunde.firma, nachname: kunde.nachname, kurzname: kunde.kurzname })
      .from(kunde)
      .where(eq(kunde.id, row.lieferantId));
    lieferantName = l ? (l.firma || l.nachname || l.kurzname || null) : null;
  }
  return { artikel: row, lieferantName };
}

/** Lieferanten (Kontaktart LIEFERANT) für das Dropdown. */
export async function listLieferanten() {
  return db
    .select({ id: kunde.id, firma: kunde.firma, nachname: kunde.nachname, kurzname: kunde.kurzname })
    .from(kunde)
    .where(and(eq(kunde.kontaktart, "LIEFERANT"), isNull(kunde.deletedAt)))
    .orderBy(asc(sql`lower(coalesce(${kunde.firma}, ${kunde.nachname}, ${kunde.kurzname}, ''))`));
}

/* ------------------------------------------------------------------ mutationen */

export async function createArtikel(input: ArtikelInput): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const tiers = computeTiers(
    {
      vkEur: num(input.vkEur), vkUs: num(input.vkUs),
      bruttoFuerNetto: input.bruttoFuerNetto, nichtRabattierfaehig: input.nichtRabattierfaehig,
    },
    await margins(),
  );
  const [row] = await db
    .insert(artikel)
    .values({ ...input, ...tiers, createdBy: user.id, updatedBy: user.id })
    .returning({ id: artikel.id });
  return row.id;
}

export async function updateArtikel(id: string, input: ArtikelInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const tiers = computeTiers(
    {
      vkEur: num(input.vkEur), vkUs: num(input.vkUs),
      bruttoFuerNetto: input.bruttoFuerNetto, nichtRabattierfaehig: input.nichtRabattierfaehig,
    },
    await margins(),
  );
  const res = await db
    .update(artikel)
    .set({ ...input, ...tiers, updatedAt: new Date(), updatedBy: user.id })
    .where(and(eq(artikel.id, id), isNull(artikel.deletedAt)))
    .returning({ id: artikel.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Artikel nicht gefunden.");
}

export async function toggleArtikelInaktiv(id: string, inaktiv: boolean) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db
    .update(artikel)
    .set({ datensatzInaktiv: inaktiv, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(artikel.id, id));
}

/** Artikel duplizieren (ohne nr_lfd / artikel_nr / Spec-Belegung). */
export async function duplicateArtikel(id: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [src] = await db.select().from(artikel).where(eq(artikel.id, id));
  if (!src) throw new DomainError("NOT_FOUND", "Artikel nicht gefunden.");
  const {
    id: _id, nrLfd: _nr, artikelNr: _anr, createdAt: _ca, createdBy: _cb,
    updatedAt: _ua, updatedBy: _ub, deletedAt: _da, usdEurFaktor: _uef, ...rest
  } = src;
  void _id; void _nr; void _anr; void _ca; void _cb; void _ua; void _ub; void _da; void _uef;
  const [row] = await db
    .insert(artikel)
    .values({
      ...rest,
      nameBelege: src.nameBelege ? `${src.nameBelege} (Kopie)` : null,
      nameLang: src.nameLang ? `${src.nameLang} (Kopie)` : null,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: artikel.id });
  return row.id;
}
