import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { arbeitsschritt, arbeitsschrittVorrat, auftrag } from "@/lib/db/schema";
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

/** Standard-Schritte für einen neuen Produktionsauftrag (Vorrat WERKSTATT + OFFICE ohne Compliance). */
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
  await db.insert(arbeitsschritt).values(
    vorrat.map((v) => ({
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
