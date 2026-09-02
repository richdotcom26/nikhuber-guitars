import "server-only";
import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { ansprechpartner, kunde, lieferadresse, rechnung, staat } from "@/lib/db/schema";
import { taxDefault } from "@/lib/pricing";
import {
  KONTAKTART_VALUES, type KontaktartValue, REGION_VALUES, VERTRIEBSWEG_VALUES,
} from "@/lib/adressen-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export { anzeigename, KONTAKTARTEN, KONTAKTART_VALUES } from "@/lib/adressen-shared";
export type { KontaktartValue } from "@/lib/adressen-shared";

const REGIONEN = REGION_VALUES;
const VERTRIEBSWEGE = VERTRIEBSWEG_VALUES;

/* -------------------------------------------------------------------- schemas */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const uuidOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());
const enumOrNull = <T extends readonly [string, ...string[]]>(vals: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(vals).nullable());
const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const triBool = z.preprocess(
  (v) => (v === "" || v == null ? null : v === "ja" || v === "true" || v === true),
  z.boolean().nullable(),
);
const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().min(0).max(100).transform((n) => n.toString()).nullable(),
);

export const kundeSchema = z.object({
  kontaktart: z.enum(KONTAKTART_VALUES),
  kundenNr: nullableText,
  firma: nullableText,
  vorname: nullableText,
  nachname: nullableText,
  kurzname: nullableText,
  strasse: nullableText,
  adresszusatz: nullableText,
  plz: nullableText,
  ort: nullableText,
  staatId: uuidOrNull,
  region: enumOrNull(REGIONEN),
  vertriebsweg: enumOrNull(VERTRIEBSWEGE),
  steuerpflichtig: triBool,
  waehrung: enumOrNull(["EUR", "USD"] as const),
  sprache: enumOrNull(["DE", "EN"] as const),
  zahlungsbedingungId: uuidOrNull,
  ustIdNr: nullableText,
  sonderrabattProzent: decimalOrNull,
  email: nullableText,
  emailRechnungCc: nullableText,
  telefon: nullableText,
  mobil: nullableText,
  url: nullableText,
  briefanrede: nullableText,
  briefkopfManuell: nullableText,
  seriennummerAufRechnung: boolFlag,
  person2Name: nullableText,
  person2Email: nullableText,
  person2Telefon: nullableText,
  person2Bemerkung: nullableText,
  bemerkung: nullableText,
}).refine(
  (v) => v.firma?.trim() || v.nachname?.trim() || v.kurzname?.trim(),
  { message: "Mindestens Firma, Nachname oder Kurzname angeben.", path: ["firma"] },
);
export type KundeInput = z.infer<typeof kundeSchema>;

/* ---------------------------------------------------------------------- liste */

export interface ListKundenParams {
  q?: string;
  kontaktart?: string;
  page?: number;
  pageSize?: number;
}

export async function listKunden(params: ListKundenParams = {}) {
  const pageSize = Math.min(Math.max(params.pageSize ?? 50, 1), 200);
  const page = Math.max(params.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  const filters = [isNull(kunde.deletedAt)];
  if (params.kontaktart && (KONTAKTART_VALUES as readonly string[]).includes(params.kontaktart)) {
    filters.push(eq(kunde.kontaktart, params.kontaktart as KontaktartValue));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(
      or(
        ilike(kunde.firma, like),
        ilike(kunde.nachname, like),
        ilike(kunde.vorname, like),
        ilike(kunde.kurzname, like),
        ilike(kunde.kundenNr, like),
        ilike(kunde.ort, like),
      )!,
    );
  }
  const where = and(...filters);

  const rows = await db
    .select({
      id: kunde.id,
      kundenNr: kunde.kundenNr,
      kontaktart: kunde.kontaktart,
      firma: kunde.firma,
      vorname: kunde.vorname,
      nachname: kunde.nachname,
      kurzname: kunde.kurzname,
      ort: kunde.ort,
      staatName: staat.name,
      region: kunde.region,
      waehrung: kunde.waehrung,
      vertriebsweg: kunde.vertriebsweg,
      anzahlRg: sql<number>`(
        select count(*)::int from ${rechnung} r
        where r.kunde_id = ${kunde.id} and r.belegart = 'RECHNUNG'
      )`,
      ums12: sql<string>`coalesce((
        select sum(r.zahlbetrag) from ${rechnung} r
        where r.kunde_id = ${kunde.id}
          and r.belegart = 'RECHNUNG'
          and r.rechnungsdatum >= (now() - interval '12 months')
      ), 0)`,
    })
    .from(kunde)
    .leftJoin(staat, eq(kunde.staatId, staat.id))
    .where(where)
    .orderBy(asc(sql`lower(coalesce(${kunde.firma}, ${kunde.nachname}, ${kunde.kurzname}, ''))`))
    .limit(pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(kunde)
    .where(where);

  return { rows, total: count, page, pageSize, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/* ---------------------------------------------------------------------- detail */

export async function getKunde(id: string) {
  const row = await db.query.kunde.findFirst({ where: and(eq(kunde.id, id), isNull(kunde.deletedAt)) });
  if (!row) throw new DomainError("NOT_FOUND", "Kunde nicht gefunden.");
  const [aps, las] = await Promise.all([
    db.select().from(ansprechpartner).where(eq(ansprechpartner.kundeId, id)).orderBy(asc(ansprechpartner.nachname)),
    db.select().from(lieferadresse).where(eq(lieferadresse.kundeId, id)).orderBy(asc(lieferadresse.nr)),
  ]);
  return { kunde: row, ansprechpartner: aps, lieferadressen: las };
}

/* ------------------------------------------------------- ableitung (7b, Staat) */

export interface StaatDefaults {
  region: (typeof REGIONEN)[number] | null;
  sprache: "DE" | "EN" | null;
  waehrung: "EUR" | "USD" | null;
  zahlungsbedingungId: string | null;
  vertriebsweg: (typeof VERTRIEBSWEGE)[number] | null;
  steuerpflichtig: boolean | null;
}

/** Defaults aus Staat + Kontaktart×Region-Matrix (ex 7b). Ohne Persistenz. */
export async function staatDefaults(staatId: string, kontaktart: string): Promise<StaatDefaults> {
  const [s] = await db.select().from(staat).where(eq(staat.id, staatId));
  if (!s) throw new DomainError("NOT_FOUND", "Staat nicht gefunden.");
  const tax = taxDefault(kontaktart as never, s.region);
  return {
    region: s.region,
    sprache: s.defaultSprache,
    waehrung: s.defaultWaehrung,
    zahlungsbedingungId: s.defaultZahlungsbedingungId,
    vertriebsweg: tax?.vertriebsweg ?? null,
    steuerpflichtig: tax?.steuerpflichtig ?? null,
  };
}

/* ------------------------------------------------------------------ mutationen */

export async function createKunde(input: KundeInput): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");

  // Beim Anlegen: fehlende abgeleitete Felder aus dem Staat vorbelegen (7b).
  let derived: Partial<KundeInput> = {};
  if (input.staatId) {
    const d = await staatDefaults(input.staatId, input.kontaktart);
    derived = {
      region: input.region ?? d.region,
      sprache: input.sprache ?? d.sprache,
      waehrung: input.waehrung ?? d.waehrung,
      zahlungsbedingungId: input.zahlungsbedingungId ?? d.zahlungsbedingungId,
      vertriebsweg: input.vertriebsweg ?? d.vertriebsweg,
      steuerpflichtig: input.steuerpflichtig ?? d.steuerpflichtig,
    };
  }
  const [row] = await db
    .insert(kunde)
    .values({ ...input, ...derived, createdBy: user.id, updatedBy: user.id })
    .returning({ id: kunde.id });
  return row.id;
}

export async function updateKunde(id: string, input: KundeInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(kunde)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(and(eq(kunde.id, id), isNull(kunde.deletedAt)))
    .returning({ id: kunde.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Kunde nicht gefunden.");
}

/** Button „Preis/Steuer/Sprache autom." — Defaults aus Staat neu setzen (überschreibt). */
export async function rederiveKunde(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [k] = await db.select().from(kunde).where(and(eq(kunde.id, id), isNull(kunde.deletedAt)));
  if (!k) throw new DomainError("NOT_FOUND", "Kunde nicht gefunden.");
  if (!k.staatId) throw new DomainError("STATE", "Kein Staat gesetzt — Ableitung nicht möglich.");
  const d = await staatDefaults(k.staatId, k.kontaktart);
  await db
    .update(kunde)
    .set({
      region: d.region,
      sprache: d.sprache ?? k.sprache,
      waehrung: d.waehrung ?? k.waehrung,
      zahlungsbedingungId: d.zahlungsbedingungId ?? k.zahlungsbedingungId,
      vertriebsweg: d.vertriebsweg ?? k.vertriebsweg,
      steuerpflichtig: d.steuerpflichtig ?? k.steuerpflichtig,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(kunde.id, id));
}

export async function softDeleteKunde(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const res = await db
    .update(kunde)
    .set({ deletedAt: new Date(), updatedAt: new Date(), updatedBy: user.id })
    .where(and(eq(kunde.id, id), isNull(kunde.deletedAt)))
    .returning({ id: kunde.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Kunde nicht gefunden.");
}

/* -------------------------------------------------------- ansprechpartner CRUD */

export const ansprechpartnerSchema = z.object({
  anrede: enumOrNull(["HERR", "FRAU", "MR", "MRS"] as const),
  vorname: nullableText,
  nachname: nullableText,
  briefanredeIndividuell: nullableText,
  email: nullableText,
  telefon: nullableText,
  mobil: nullableText,
  telefax: nullableText,
  position: enumOrNull(["ALLGEMEIN", "MITARBEITER", "RECHNUNGSKONTAKT"] as const),
  primaereEmail: boolFlag,
  fuerBriefkopf: boolFlag,
});
export type AnsprechpartnerInput = z.infer<typeof ansprechpartnerSchema>;

export async function saveAnsprechpartner(kundeId: string, id: string | null, input: AnsprechpartnerInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (id) {
    const res = await db
      .update(ansprechpartner)
      .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(ansprechpartner.id, id), eq(ansprechpartner.kundeId, kundeId)))
      .returning({ id: ansprechpartner.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Ansprechpartner nicht gefunden.");
  } else {
    await db.insert(ansprechpartner).values({ ...input, kundeId, createdBy: user.id, updatedBy: user.id });
  }
}

export async function deleteAnsprechpartner(kundeId: string, id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(ansprechpartner).where(and(eq(ansprechpartner.id, id), eq(ansprechpartner.kundeId, kundeId)));
}

/* ---------------------------------------------------------- lieferadresse CRUD */

export const lieferadresseSchema = z.object({
  nr: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().nullable()),
  firma: nullableText,
  vorname: nullableText,
  nachname: nullableText,
  strasse: nullableText,
  plz: nullableText,
  ort: nullableText,
  land: nullableText,
});
export type LieferadresseInput = z.infer<typeof lieferadresseSchema>;

export async function saveLieferadresse(kundeId: string, id: string | null, input: LieferadresseInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (id) {
    const res = await db
      .update(lieferadresse)
      .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(lieferadresse.id, id), eq(lieferadresse.kundeId, kundeId)))
      .returning({ id: lieferadresse.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Lieferadresse nicht gefunden.");
  } else {
    await db.insert(lieferadresse).values({ ...input, kundeId, createdBy: user.id, updatedBy: user.id });
  }
}

export async function deleteLieferadresse(kundeId: string, id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(lieferadresse).where(and(eq(lieferadresse.id, id), eq(lieferadresse.kundeId, kundeId)));
}
