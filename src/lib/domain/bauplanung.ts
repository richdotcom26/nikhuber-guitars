import "server-only";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { kundeKurz } from "@/lib/adressen-shared";
import { artikel, auftrag, kunde, modellgruppe } from "@/lib/db/schema";
import { computeTiers } from "./artikel";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";

/* ---------------------------------------------------------------- Planwert (7k) */

interface ModellPreis {
  vkEur: string | null; vkUs: string | null;
  bruttoFuerNetto: boolean | null; nichtRabattierfaehig: boolean | null;
}

/** EUR-normierter Planungswert je Auftrag: Ist-Netto, sonst Modell-Grundpreis nach Vertriebsweg. */
function planwert(
  a: { summeNetto: string | null; vertriebsweg: string | null; waehrung: string | null },
  modell: ModellPreis | null,
  margins: { net1: number; net2: number; us: number },
  faktor: number,
): number {
  const usEur = (v: number | null | undefined) => (v == null ? 0 : v * faktor);
  if (a.summeNetto != null) {
    const n = Number(a.summeNetto);
    return a.waehrung === "USD" ? n * faktor : n;
  }
  if (!modell) return 0;
  const t = computeTiers(
    {
      vkEur: modell.vkEur == null ? null : Number(modell.vkEur),
      vkUs: modell.vkUs == null ? null : Number(modell.vkUs),
      bruttoFuerNetto: !!modell.bruttoFuerNetto,
      nichtRabattierfaehig: !!modell.nichtRabattierfaehig,
    },
    margins,
  );
  const n = (v: string | null) => (v == null ? 0 : Number(v));
  switch (a.vertriebsweg) {
    case "NET1": return n(t.net1);
    case "NET2": return n(t.net2);
    case "NET_US": return usEur(n(t.netUs));
    case "VK_US": return usEur(modell.vkUs == null ? 0 : Number(modell.vkUs));
    default: return n(t.vkEurNet);
  }
}

/* --------------------------------------------------------------------- Monate */

/** 'YYYY-MM' n Monate ab jetzt (für die Navigation), plus Monate mit vorhandenen Aufträgen. */
export async function bauplanMonate() {
  await requireUser();
  const rows = await db
    .select({
      monat: sql<string>`to_char(${auftrag.bauplandatum}, 'YYYY-MM')`,
      anzahl: sql<number>`count(*)::int`,
    })
    .from(auftrag)
    .where(and(eq(auftrag.auftragsart, "PRODUKTION"), sql`${auftrag.bauplandatum} is not null`))
    .groupBy(sql`to_char(${auftrag.bauplandatum}, 'YYYY-MM')`)
    .orderBy(asc(sql`to_char(${auftrag.bauplandatum}, 'YYYY-MM')`));
  return rows;
}

/** Aktuellen Monat als 'YYYY-MM'. */
export function aktuellerMonat(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monatVerschieben(monat: string, delta: number): string {
  const [y, m] = monat.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monatLabel(monat: string): string {
  const [y, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------- Monatsboard */

export type Ampel = "leer" | "unter" | "im_band" | "ueber" | "kein_band";

function ampel(anzahl: number, min: number | null, max: number | null): Ampel {
  if (anzahl === 0) return "leer";
  if (min == null && max == null) return "kein_band";
  if (min != null && anzahl < min) return "unter";
  if (max != null && anzahl > max) return "ueber";
  return "im_band";
}

export async function monatsBoard(monat: string) {
  await requireUser();
  const fs = await getFirmaSetting();
  const faktor = Number(fs.usdEurFaktor) || 0.92;
  const margins = {
    net1: Number(fs.haendlerrabattNet1) || 0,
    net2: Number(fs.haendlerrabattNet2) || 0,
    us: Number(fs.usHaendlerrabatt) || 0,
  };

  const rows = await db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      status: auftrag.status,
      fortschrittProzent: auftrag.fortschrittProzent,
      kdFirma: auftrag.kdFirma,
      kdNachname: auftrag.kdNachname,
      kdVorname: auftrag.kdVorname,
      kurzname: kunde.kurzname,
      firma: kunde.firma,
      summeNetto: auftrag.summeNetto,
      vertriebsweg: auftrag.kdVertriebsweg,
      waehrung: auftrag.kdWaehrung,
      modellName: artikel.nameLang,
      gruppeId: modellgruppe.id,
      gruppeName: modellgruppe.name,
      gruppeMin: modellgruppe.minMengeMonat,
      gruppeMax: modellgruppe.maxMengeMonat,
      mVkEur: artikel.vkEur,
      mVkUs: artikel.vkUs,
      mBfn: artikel.bruttoFuerNetto,
      mNrf: artikel.nichtRabattierfaehig,
    })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(modellgruppe, eq(modellgruppe.id, artikel.modellgruppeId))
    .leftJoin(kunde, eq(kunde.id, auftrag.kundeId))
    .where(and(
      eq(auftrag.auftragsart, "PRODUKTION"),
      sql`to_char(${auftrag.bauplandatum}, 'YYYY-MM') = ${monat}`,
    ))
    .orderBy(asc(modellgruppe.name), asc(auftrag.nummer));

  const OHNE = "(ohne Modellgruppe)";
  const auftraege = rows.map((r) => ({
    id: r.id,
    nummer: r.nummer,
    status: r.status,
    fortschrittProzent: r.fortschrittProzent,
    kunde: kundeKurz(r) === "–" ? null : kundeKurz(r),
    modellName: r.modellName,
    gruppeKey: r.gruppeId ?? "__ohne__",
    gruppeName: r.gruppeName ?? OHNE,
    planwert: planwert(
      { summeNetto: r.summeNetto, vertriebsweg: r.vertriebsweg, waehrung: r.waehrung },
      { vkEur: r.mVkEur, vkUs: r.mVkUs, bruttoFuerNetto: r.mBfn, nichtRabattierfaehig: r.mNrf },
      margins,
      faktor,
    ),
  }));

  const grpMap = new Map<string, {
    id: string | null; name: string; min: number | null; max: number | null;
    anzahl: number; summe: number;
  }>();
  for (const r of rows) {
    const key = r.gruppeId ?? "__ohne__";
    const g = grpMap.get(key) ?? {
      id: r.gruppeId ?? null, name: r.gruppeName ?? OHNE,
      min: r.gruppeMin ?? null, max: r.gruppeMax ?? null,
      anzahl: 0, summe: 0,
    };
    g.anzahl += 1;
    grpMap.set(key, g);
  }
  for (const a of auftraege) grpMap.get(a.gruppeKey)!.summe += a.planwert;

  const gruppen = [...grpMap.values()]
    .map((g) => ({ ...g, ampel: ampel(g.anzahl, g.min, g.max) }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return {
    monat,
    auftraege,
    gruppen,
    total: { anzahl: auftraege.length, summe: auftraege.reduce((s, a) => s + a.planwert, 0) },
  };
}

/* --------------------------------------------------------------- ungeplante */

export async function ungeplanteAuftraege(q = "", limit = 40) {
  await requireUser();
  const filters = [eq(auftrag.auftragsart, "PRODUKTION"), isNull(auftrag.bauplandatum)];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(auftrag.nummer, like), ilike(auftrag.kdFirma, like), ilike(auftrag.kdNachname, like))!);
  }
  return db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      status: auftrag.status,
      kdFirma: auftrag.kdFirma,
      kdNachname: auftrag.kdNachname,
      kdVorname: auftrag.kdVorname,
      kurzname: kunde.kurzname,
      firma: kunde.firma,
      modellName: artikel.nameLang,
      gruppeName: modellgruppe.name,
    })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(modellgruppe, eq(modellgruppe.id, artikel.modellgruppeId))
    .leftJoin(kunde, eq(kunde.id, auftrag.kundeId))
    .where(and(...filters))
    .orderBy(desc(auftrag.auftragsdatum))
    .limit(limit);
}

/* ----------------------------------------------------------------- verschieben */

/** Auftrag einem Bauplan-Monat zuordnen (`YYYY-MM`) oder entfernen (`null`). */
export async function setBauplanMonat(auftragId: string, monat: string | null) {
  const user = await requireUser();
  if (monat != null && !/^\d{4}-\d{2}$/.test(monat)) {
    throw new DomainError("VALIDATION", "Ungültiger Monat.");
  }
  const bauplandatum = monat ? `${monat}-01` : null;
  const res = await db
    .update(auftrag)
    .set({ bauplandatum, bauplanMonat: monat, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, auftragId))
    .returning({ id: auftrag.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
}

/* -------------------------------------------------------- Modellgruppen-Pflege */

export async function listModellgruppen() {
  await requireUser();
  const rows = await db
    .select({
      id: modellgruppe.id,
      name: modellgruppe.name,
      farbe: modellgruppe.farbe,
      minMengeMonat: modellgruppe.minMengeMonat,
      maxMengeMonat: modellgruppe.maxMengeMonat,
      updatedAt: modellgruppe.updatedAt,
      anzahlModelle: sql<number>`count(${artikel.id})::int`,
    })
    .from(modellgruppe)
    .leftJoin(artikel, and(eq(artikel.modellgruppeId, modellgruppe.id), isNull(artikel.deletedAt)))
    .groupBy(modellgruppe.id)
    .orderBy(asc(modellgruppe.name));
  return rows;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const emptyToNull = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), inner.nullable());

export const modellgruppeSchema = z.object({
  name: z.string().trim().min(1, "Pflichtfeld"),
  farbe: emptyToNull(z.string().trim().regex(HEX, "Farbe als #RRGGBB angeben")),
  minMengeMonat: emptyToNull(z.coerce.number().int().min(0, "Mindestmenge < 0")),
  maxMengeMonat: emptyToNull(z.coerce.number().int().min(0, "Maximalmenge < 0")),
});
export type ModellgruppeInput = z.infer<typeof modellgruppeSchema>;

function assertBand(input: ModellgruppeInput) {
  if (input.minMengeMonat != null && input.maxMengeMonat != null
    && input.maxMengeMonat < input.minMengeMonat) {
    throw new DomainError("VALIDATION", "Maximalmenge kleiner als Mindestmenge.");
  }
}

export async function createModellgruppe(input: ModellgruppeInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  assertBand(input);
  await db.insert(modellgruppe).values({ ...input, createdBy: user.id, updatedBy: user.id });
}

export async function updateModellgruppe(id: string, input: ModellgruppeInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  assertBand(input);
  const res = await db
    .update(modellgruppe)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(modellgruppe.id, id))
    .returning({ id: modellgruppe.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Modellgruppe nicht gefunden.");
}

export async function deleteModellgruppe(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(artikel)
    .where(and(eq(artikel.modellgruppeId, id), isNull(artikel.deletedAt)));
  if (n > 0) {
    throw new DomainError("CONFLICT", `Modellgruppe ist noch ${n} Modell(en) zugewiesen — dort zuerst entfernen.`);
  }
  const res = await db
    .delete(modellgruppe)
    .where(eq(modellgruppe.id, id))
    .returning({ id: modellgruppe.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Modellgruppe nicht gefunden.");
}

export async function setModellgruppeBand(id: string, min: number | null, max: number | null) {
  const user = await requireUser();
  if (min != null && min < 0) throw new DomainError("VALIDATION", "Mindestmenge < 0.");
  if (max != null && min != null && max < min) throw new DomainError("VALIDATION", "Max < Min.");
  const res = await db
    .update(modellgruppe)
    .set({ minMengeMonat: min, maxMengeMonat: max, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(modellgruppe.id, id))
    .returning({ id: modellgruppe.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Modellgruppe nicht gefunden.");
}
