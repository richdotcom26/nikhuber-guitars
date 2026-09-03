import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  arbeitsschritt, arbeitsschrittVorrat, artikel, auftrag, specBelegung,
} from "@/lib/db/schema";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

/** vorrat.nr Konstanten (7f/7g/7s). */
export const VORRAT_NR = {
  MONTAGE: 81,
  VERSENDET: 99,
  RECHNUNG: 95,
  CITES: 93,
  FISH_WILDLIFE: 94,
  AUSFUHR: 96,
  REPARATUR: 84,
  KISTE_PACKEN: 86,
} as const;
const KISTE_PACKEN_ORDER = 29;

export interface SchrittRow {
  id: string;
  status: string;
  erledigtAm: Date | null;
  maImport: string | null;
  bemerkungBearbeiter: string | null;
  wartenAuf: string | null;
  dauerMinuten: number | null;
  vorratNr: number;
  workstep: string;
  reihenfolge: number;
  typ: string | null;
  farbe: string | null;
  isNext: boolean;
}

export async function listArbeitsschritte(auftragId: string): Promise<SchrittRow[]> {
  const rows = await db
    .select({
      id: arbeitsschritt.id,
      status: arbeitsschritt.status,
      erledigtAm: arbeitsschritt.erledigtAm,
      maImport: arbeitsschritt.maImport,
      bemerkungBearbeiter: arbeitsschritt.bemerkungBearbeiter,
      wartenAuf: arbeitsschritt.wartenAuf,
      dauerMinuten: arbeitsschritt.dauerMinuten,
      vorratNr: arbeitsschrittVorrat.nr,
      workstep: arbeitsschrittVorrat.workstep,
      reihenfolge: arbeitsschrittVorrat.reihenfolge,
      typ: arbeitsschrittVorrat.typ,
      farbe: arbeitsschrittVorrat.farbe,
    })
    .from(arbeitsschritt)
    .innerJoin(arbeitsschrittVorrat, eq(arbeitsschrittVorrat.id, arbeitsschritt.vorratId))
    .where(eq(arbeitsschritt.auftragId, auftragId))
    .orderBy(asc(arbeitsschrittVorrat.reihenfolge), asc(arbeitsschritt.erledigtAm));

  // „ThisNext": kleinste Order unter offen/warten, ohne Kiste-packen (7s.6)
  const next = rows
    .filter((r) => (r.status === "OFFEN" || r.status === "WARTEN_AUF") && r.reihenfolge !== KISTE_PACKEN_ORDER)
    .sort((a, b) => a.reihenfolge - b.reihenfolge)[0];

  return rows.map((r) => ({ ...r, isNext: !!next && r.id === next.id }));
}

async function assertWrite() {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  return user;
}

/**
 * Schritt-Status ändern + Auftrags-Progressions-Hooks (7s).
 */
type SchrittStatusValue = "OFFEN" | "ERLEDIGT" | "WARTEN_AUF" | "KISTE_VOLLSTAENDIG";

export async function setSchrittStatus(schrittId: string, statusRaw: string) {
  const user = await assertWrite();
  if (!["OFFEN", "ERLEDIGT", "WARTEN_AUF", "KISTE_VOLLSTAENDIG"].includes(statusRaw)) {
    throw new DomainError("VALIDATION", "Ungültiger Status.");
  }
  const status = statusRaw as SchrittStatusValue;
  const [row] = await db
    .select({
      auftragId: arbeitsschritt.auftragId,
      vorratNr: arbeitsschrittVorrat.nr,
      typ: arbeitsschrittVorrat.typ,
    })
    .from(arbeitsschritt)
    .innerJoin(arbeitsschrittVorrat, eq(arbeitsschrittVorrat.id, arbeitsschritt.vorratId))
    .where(eq(arbeitsschritt.id, schrittId));
  if (!row) throw new DomainError("NOT_FOUND", "Arbeitsschritt nicht gefunden.");
  if (status === "KISTE_VOLLSTAENDIG" && row.vorratNr !== VORRAT_NR.KISTE_PACKEN) {
    throw new DomainError("VALIDATION", "Status „Kiste vollständig“ ist nur beim Schritt „Kiste packen“ zulässig.");
  }

  const done = status === "ERLEDIGT" || status === "WARTEN_AUF" || status === "KISTE_VOLLSTAENDIG";
  await db
    .update(arbeitsschritt)
    .set({
      status,
      erledigtAm: status === "OFFEN" ? null : done ? new Date() : null,
      erledigtVonId: status === "OFFEN" ? null : user.id,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(arbeitsschritt.id, schrittId));

  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, row.auftragId));
  if (!a) return;

  // Backorder -> in Werkstatt beim ersten bearbeiteten Schritt
  if (a.status === "BACKORDER" && status !== "OFFEN") {
    await db
      .update(auftrag)
      .set({
        status: "WERKSTATT",
        produktionsort: a.produktionsort ?? "RODGAU",
        werkstattbeginn: a.werkstattbeginn ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(auftrag.id, a.id));
  }

  // Montage (nr 81) erledigt -> Produktion fertig + Rest der Werkstatt-Schritte auto-erledigen
  if (row.vorratNr === VORRAT_NR.MONTAGE && status === "ERLEDIGT") {
    await db
      .update(auftrag)
      .set({
        status: "PROD_FERTIG",
        endmontagedatum: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(auftrag.id, a.id));
    await db.execute(sql`
      update arbeitsschritt s set status = 'ERLEDIGT', erledigt_am = coalesce(s.erledigt_am, now()), updated_at = now()
      from arbeitsschritt_vorrat v
      where s.vorrat_id = v.id and s.auftrag_id = ${a.id}
        and v.typ = 'WERKSTATT' and s.status in ('OFFEN','WARTEN_AUF')
    `);
  }

  // Versendet (nr 99) erledigt -> Abgeschlossen
  if (row.vorratNr === VORRAT_NR.VERSENDET && status === "ERLEDIGT") {
    await db
      .update(auftrag)
      .set({
        status: "ABGESCHLOSSEN",
        versanddatum: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(auftrag.id, a.id));
  }
}

/** 7t: alle früheren offenen/wartenden Schritte auf erledigt (ohne Bearbeiter/Zeit, ohne Hooks). */
export async function alleVorherigenErledigt(schrittId: string) {
  const user = await assertWrite();
  const [row] = await db
    .select({ auftragId: arbeitsschritt.auftragId, reihenfolge: arbeitsschrittVorrat.reihenfolge })
    .from(arbeitsschritt)
    .innerJoin(arbeitsschrittVorrat, eq(arbeitsschrittVorrat.id, arbeitsschritt.vorratId))
    .where(eq(arbeitsschritt.id, schrittId));
  if (!row) throw new DomainError("NOT_FOUND", "Arbeitsschritt nicht gefunden.");

  await db.execute(sql`
    update arbeitsschritt s set status = 'ERLEDIGT', erledigt_am = null, erledigt_von_id = null, updated_at = now()
    from arbeitsschritt_vorrat v
    where s.vorrat_id = v.id and s.auftrag_id = ${row.auftragId}
      and v.reihenfolge < ${row.reihenfolge} and v.reihenfolge <> ${KISTE_PACKEN_ORDER}
      and s.status in ('OFFEN','WARTEN_AUF')
  `);
  void user;
}

export async function setSchrittBemerkung(schrittId: string, text: string | null, dauerMinuten: number | null) {
  const user = await assertWrite();
  await db
    .update(arbeitsschritt)
    .set({
      bemerkungBearbeiter: text?.trim() || null,
      dauerMinuten: dauerMinuten ?? null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(arbeitsschritt.id, schrittId));
}

/* ------------------------------------------------ Seeding & Compliance-Schritte */

/**
 * Standard-Schritte eines Produktionsauftrags sicherstellen (Vorrat WERKSTATT + OFFICE
 * ohne Compliance). **Idempotent**: legt nur fehlende Schritte an, vorhandene (auch bereits
 * bearbeitete) bleiben unangetastet. Wird beim Anlegen und beim Wechsel in „In Werkstatt" /
 * „Bei Nicl" aufgerufen.
 */
export async function seedStandardSchritte(auftragId: string, userId: string) {
  const vorrat = await db
    .select()
    .from(arbeitsschrittVorrat)
    .where(
      and(
        inArray(arbeitsschrittVorrat.typ, ["WERKSTATT", "OFFICE"]),
        // Compliance-Schritte werden bedarfsgerecht angelegt
        sql`${arbeitsschrittVorrat.nr} not in (${VORRAT_NR.CITES}, ${VORRAT_NR.FISH_WILDLIFE}, ${VORRAT_NR.AUSFUHR}, ${VORRAT_NR.REPARATUR})`,
      ),
    );
  if (vorrat.length === 0) return;
  const vorhanden = new Set(
    (await db
      .select({ v: arbeitsschritt.vorratId })
      .from(arbeitsschritt)
      .where(eq(arbeitsschritt.auftragId, auftragId))
    ).map((r) => r.v),
  );
  const fehlend = vorrat.filter((v) => !vorhanden.has(v.id));
  if (fehlend.length === 0) return;
  await db.insert(arbeitsschritt).values(
    fehlend.map((v) => ({
      auftragId,
      vorratId: v.id,
      status: "OFFEN" as const,
      createdBy: userId,
      updatedBy: userId,
    })),
  );
}

/** Genau einen Schritt eines Vorrat-Typs sicherstellen bzw. entfernen (idempotent). */
async function ensureSchritt(auftragId: string, vorratNr: number, present: boolean, userId: string) {
  const [v] = await db.select().from(arbeitsschrittVorrat).where(eq(arbeitsschrittVorrat.nr, vorratNr));
  if (!v) return;
  const existing = await db
    .select({ id: arbeitsschritt.id })
    .from(arbeitsschritt)
    .where(and(eq(arbeitsschritt.auftragId, auftragId), eq(arbeitsschritt.vorratId, v.id)));
  if (present && existing.length === 0) {
    await db.insert(arbeitsschritt).values({
      auftragId, vorratId: v.id, status: "OFFEN", createdBy: userId, updatedBy: userId,
    });
  } else if (!present && existing.length > 0) {
    // nur entfernen, wenn noch offen (nicht schon bearbeitet)
    await db
      .delete(arbeitsschritt)
      .where(and(
        eq(arbeitsschritt.auftragId, auftragId),
        eq(arbeitsschritt.vorratId, v.id),
        eq(arbeitsschritt.status, "OFFEN"),
      ));
  }
}

/**
 * 93 Cites / 94 Fish&Wildlife / 96 Ausfuhrantrag bedarfsgerecht (7d/7j).
 * `region` = kd_region, `hatCitesHolz` = irgendein Holz-Spec-Artikel ist geschütztes Holz.
 */
export async function recomputeComplianceSteps(
  auftragId: string,
  region: string | null,
  hatCitesHolz: boolean,
) {
  const user = await requireUser();
  await ensureSchritt(auftragId, VORRAT_NR.CITES, hatCitesHolz, user.id);
  await ensureSchritt(auftragId, VORRAT_NR.FISH_WILDLIFE, region === "USA", user.id);
  await ensureSchritt(
    auftragId,
    VORRAT_NR.AUSFUHR,
    region != null && region !== "D" && region !== "EU",
    user.id,
  );
}

/** Ob irgendein Holz-Spec-Artikel des Auftrags als geschütztes Holz (CITES) markiert ist (7d). */
export async function hatCitesHolzImAuftrag(auftragId: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(and(eq(specBelegung.auftragId, auftragId), eq(artikel.geschuetztesHolzCites, true)));
  return n > 0;
}

/**
 * Compliance-Schritte eines Auftrags gegen den aktuellen Stand neu ableiten
 * (Kunde-Region → Fish&Wildlife / Ausfuhrantrag, geschütztes Holz in den Specs → Cites).
 * Nur PRODUKTION; entfernt nur noch offene Schritte, bereits bearbeitete bleiben.
 */
export async function recomputeAuftragCompliance(auftragId: string) {
  const [a] = await db
    .select({ region: auftrag.kdRegion, art: auftrag.auftragsart })
    .from(auftrag)
    .where(eq(auftrag.id, auftragId));
  if (!a || a.art !== "PRODUKTION") return;
  await recomputeComplianceSteps(auftragId, a.region ?? null, await hatCitesHolzImAuftrag(auftragId));
}

/** Alle Arbeitsschritte eines Auftrags entfernen (None-Guitar / Service). */
export async function clearSchritte(auftragId: string) {
  await db.delete(arbeitsschritt).where(eq(arbeitsschritt.auftragId, auftragId));
}

/** Einen einzelnen Schritt-Typ hinzufügen (z. B. 84 Reparatur bei Service). */
export async function addSchritt(auftragId: string, vorratNr: number, userId: string) {
  const [v] = await db.select().from(arbeitsschrittVorrat).where(eq(arbeitsschrittVorrat.nr, vorratNr));
  if (!v) return;
  const existing = await db
    .select({ id: arbeitsschritt.id })
    .from(arbeitsschritt)
    .where(and(eq(arbeitsschritt.auftragId, auftragId), eq(arbeitsschritt.vorratId, v.id)));
  if (existing.length === 0) {
    await db.insert(arbeitsschritt).values({
      auftragId, vorratId: v.id, status: "OFFEN", createdBy: userId, updatedBy: userId,
    });
  }
}

/* ------------------------------------------------------------- Fortschritt (7h) */

export async function computeFortschritt(auftragId: string): Promise<number> {
  const rows = await db
    .select({
      status: arbeitsschritt.status,
      reihenfolge: arbeitsschrittVorrat.reihenfolge,
      typ: arbeitsschrittVorrat.typ,
    })
    .from(arbeitsschritt)
    .innerJoin(arbeitsschrittVorrat, eq(arbeitsschrittVorrat.id, arbeitsschritt.vorratId))
    .where(and(eq(arbeitsschritt.auftragId, auftragId), eq(arbeitsschrittVorrat.typ, "WERKSTATT")));

  const alle = rows.length;
  if (alle === 0) return 0;
  const erledigteOrders = rows
    .filter((r) => r.status === "ERLEDIGT" && r.reihenfolge !== KISTE_PACKEN_ORDER)
    .map((r) => r.reihenfolge);
  if (erledigteOrders.length === 0) return 0;
  const letzter = Math.max(...erledigteOrders);
  const menge = rows.filter((r) => r.reihenfolge <= letzter).length;
  return Math.round((menge / alle) * 100);
}

/* --------------------------------------------- Arbeitsschritt-Vorrat (Einstellungen) */

export async function listArbeitsschrittVorrat() {
  await requireUser();
  return db
    .select({
      id: arbeitsschrittVorrat.id,
      nr: arbeitsschrittVorrat.nr,
      workstep: arbeitsschrittVorrat.workstep,
      workstepEn: arbeitsschrittVorrat.workstepEn,
      reihenfolge: arbeitsschrittVorrat.reihenfolge,
      typ: arbeitsschrittVorrat.typ,
      farbe: arbeitsschrittVorrat.farbe,
      anzahlVerwendet: sql<number>`count(${arbeitsschritt.id})::int`,
    })
    .from(arbeitsschrittVorrat)
    .leftJoin(arbeitsschritt, eq(arbeitsschritt.vorratId, arbeitsschrittVorrat.id))
    .groupBy(arbeitsschrittVorrat.id)
    .orderBy(asc(arbeitsschrittVorrat.reihenfolge), asc(arbeitsschrittVorrat.nr));
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const leerZuNull = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), inner.nullable());

/** Fest im Code verdrahtete Nummern (Compliance/Progression) — Bezeichnung/Order/Farbe frei, nr fix. */
const GESCHUETZTE_NR = new Set<number>([
  VORRAT_NR.MONTAGE, VORRAT_NR.VERSENDET, VORRAT_NR.RECHNUNG, VORRAT_NR.CITES,
  VORRAT_NR.FISH_WILDLIFE, VORRAT_NR.AUSFUHR, VORRAT_NR.REPARATUR, VORRAT_NR.KISTE_PACKEN,
]);

export const vorratSchema = z.object({
  workstep: z.string().trim().min(1, "Pflichtfeld"),
  workstepEn: leerZuNull(z.string().trim()),
  reihenfolge: z.coerce.number().int().min(0),
  typ: leerZuNull(z.enum(["WERKSTATT", "OFFICE"])),
  farbe: leerZuNull(z.string().trim().regex(HEX6, "Farbe als #RRGGBB angeben")),
});
export type VorratInput = z.infer<typeof vorratSchema>;

export async function createVorrat(input: VorratInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${arbeitsschrittVorrat.nr}), 0)` })
    .from(arbeitsschrittVorrat);
  await db.insert(arbeitsschrittVorrat).values({ ...input, nr: Number(max) + 1 });
}

export async function updateVorrat(id: string, input: VorratInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(arbeitsschrittVorrat)
    .set(input)
    .where(eq(arbeitsschrittVorrat.id, id))
    .returning({ id: arbeitsschrittVorrat.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Arbeitsschritt nicht gefunden.");
}

export async function deleteVorrat(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const [v] = await db.select().from(arbeitsschrittVorrat).where(eq(arbeitsschrittVorrat.id, id));
  if (!v) throw new DomainError("NOT_FOUND", "Arbeitsschritt nicht gefunden.");
  if (GESCHUETZTE_NR.has(v.nr)) {
    throw new DomainError("CONFLICT", "Dieser Schritt ist fest mit der Fertigungslogik verknüpft und kann nicht gelöscht werden.");
  }
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(arbeitsschritt)
    .where(eq(arbeitsschritt.vorratId, id));
  if (n > 0) {
    throw new DomainError("CONFLICT", `Schritt ist noch ${n}× einem Auftrag zugeordnet — dort zuerst entfernen.`);
  }
  await db.delete(arbeitsschrittVorrat).where(eq(arbeitsschrittVorrat.id, id));
}
