import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  firmaSetting, staat, zaehler, zahlungsbedingung,
} from "@/lib/db/schema";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

/* ------------------------------------------------------------------ helpers */

/** Leerer String / fehlend -> null; sonst getrimmt. */
const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);

/** Dezimalzahl aus Formular (akzeptiert Komma), als String für `numeric`-Spalten. */
const decimal = (opts?: { min?: number; max?: number }) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z.coerce
      .number({ error: "Zahl erwartet" })
      .min(opts?.min ?? -1_000_000_000)
      .max(opts?.max ?? 1_000_000_000)
      .transform((n) => n.toString()),
  );

const optionalDecimal = z.preprocess(
  (v) => {
    if (v == null) return null;
    if (typeof v === "string") return v.trim() === "" ? null : v.replace(",", ".").trim();
    return v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);

/** Leerer String / "–" -> null, sonst der Wert (für optionale Enum-/UUID-Selects). */
const emptyToNull = <T extends z.ZodType>(inner: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), inner.nullable());

/* ------------------------------------------------------------- firma_setting */

const FIRMA_DEFAULT = {
  firma: "Nik Huber Guitars",
} as const;

/** Singleton laden; legt bei Bedarf eine Default-Zeile an. */
export async function getFirmaSetting() {
  const [row] = await db.select().from(firmaSetting).limit(1);
  if (row) return row;
  const [created] = await db.insert(firmaSetting).values(FIRMA_DEFAULT).returning();
  return created;
}

export const firmaSettingSchema = z.object({
  firma: z.string().trim().min(1, "Pflichtfeld"),
  strasse: nullableText,
  plz: nullableText,
  ort: nullableText,
  land: nullableText,
  steuerNr: nullableText,
  ustId: nullableText,
  iban: nullableText,
  bic: nullableText,
  bank: nullableText,

  mwstSatz: decimal({ min: 0, max: 100 }),
  usdEurFaktor: decimal({ min: 0, max: 100 }),

  haendlerrabattNet1: decimal({ min: 0, max: 100 }),
  haendlerrabattNet2: decimal({ min: 0, max: 100 }),
  usHaendlerrabatt: decimal({ min: 0, max: 100 }),
  importFaktor: optionalDecimal,
  dollarkursFaktor: optionalDecimal,
  versandButz: optionalDecimal,

  serienStart: z.coerce.number().int().min(1),
  htsCode: z.string().trim().min(1, "Pflichtfeld"),
  laceyUnterzeichner: z.string().trim().min(1, "Pflichtfeld"),
  kostensatzStunde: optionalDecimal,
});

export type FirmaSettingInput = z.infer<typeof firmaSettingSchema>;

export async function updateFirmaSetting(input: FirmaSettingInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const current = await getFirmaSetting();
  await db
    .update(firmaSetting)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(firmaSetting.id, current.id));
}

/** Aushang oben im ToDo-Reiter (an alle Mitarbeiter). Leerer Text = ausblenden. */
export async function setTodoHinweis(text: string | null) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const current = await getFirmaSetting();
  const wert = text?.trim() || null;
  await db
    .update(firmaSetting)
    .set({
      todoHinweis: wert,
      todoHinweisAm: wert ? new Date() : null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(firmaSetting.id, current.id));
}

/* -------------------------------------------------------- zahlungsbedingung */

export async function listZahlungsbedingungen() {
  return db.select().from(zahlungsbedingung).orderBy(asc(zahlungsbedingung.bezeichnung));
}

export const zahlungsbedingungSchema = z.object({
  bezeichnung: z.string().trim().min(1, "Pflichtfeld"),
  bezeichnungEn: nullableText,
});
export type ZahlungsbedingungInput = z.infer<typeof zahlungsbedingungSchema>;

export async function createZahlungsbedingung(input: ZahlungsbedingungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.insert(zahlungsbedingung).values({ ...input, createdBy: user.id, updatedBy: user.id });
}

export async function updateZahlungsbedingung(id: string, input: ZahlungsbedingungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(zahlungsbedingung)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(zahlungsbedingung.id, id))
    .returning({ id: zahlungsbedingung.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Zahlungsbedingung nicht gefunden.");
}

export async function deleteZahlungsbedingung(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  try {
    const res = await db
      .delete(zahlungsbedingung)
      .where(eq(zahlungsbedingung.id, id))
      .returning({ id: zahlungsbedingung.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Zahlungsbedingung nicht gefunden.");
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("CONFLICT", "Zahlungsbedingung wird noch verwendet und kann nicht gelöscht werden.");
  }
}

/* ------------------------------------------------------------------- staat */

export async function listStaaten() {
  return db.select().from(staat).orderBy(asc(staat.name));
}

export const staatSchema = z.object({
  kuerzel: nullableText,
  name: z.string().trim().min(1, "Pflichtfeld"),
  region: z.enum(["D", "EU", "WELT", "ASIEN", "USA"]),
  defaultSprache: emptyToNull(z.enum(["DE", "EN"])),
  defaultWaehrung: emptyToNull(z.enum(["EUR", "USD"])),
  defaultZahlungsbedingungId: emptyToNull(z.uuid()),
});
export type StaatInput = z.infer<typeof staatSchema>;

export async function updateStaat(id: string, input: StaatInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(staat)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(staat.id, id))
    .returning({ id: staat.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Staat nicht gefunden.");
}

export async function createStaat(input: StaatInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.insert(staat).values({ ...input, createdBy: user.id, updatedBy: user.id });
}

/* ------------------------------------------------------------------ zaehler */

/** Belegnummern-Zählerstände (read-only-Anzeige). */
export async function listZaehler() {
  return db
    .select()
    .from(zaehler)
    .orderBy(asc(zaehler.art), sql`${zaehler.jahr} desc`);
}
