import "server-only";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { SortSpec } from "@/lib/table-sort";
import { db } from "@/lib/db";
import { orderByFor } from "./_sort";
import {
  arbeitsschritt, artikel, auftrag, belegPosition, kunde, modellgruppe, rechnung, specBelegung,
} from "@/lib/db/schema";
import {
  AUFTRAG_STATUS_VALUES as STATUS_VALUES, AUFTRAGSART_VALUES as ART_VALUES,
  type Auftragsart, type AuftragStatus,
} from "@/lib/auftrag-shared";
import {
  addSchritt, clearSchritte, computeFortschritt, recomputeComplianceSteps,
  seedStandardSchritte, VORRAT_NR,
} from "./arbeitsschritt";
import { allocateNummer, kdSnapshot, recomputeSummen } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export {
  AUFTRAG_STATUS, AUFTRAG_STATUS_LABEL, AUFTRAGSART, AUFTRAGSART_LABEL,
} from "@/lib/auftrag-shared";

/* ---------------------------------------------------------------------- liste */

export const AUFTRAG_SORT: Record<string, unknown> = {
  nummer: auftrag.nummer,
  art: auftrag.auftragsart,
  datum: auftrag.auftragsdatum,
  bauplan: auftrag.bauplandatum,
  kunde: sql`coalesce(${auftrag.kdFirma}, ${auftrag.kdNachname})`,
  modellgruppe: modellgruppe.name,
  status: auftrag.status,
  work: auftrag.fortschrittProzent,
  umsatz: auftrag.umsatzerwartung,
};

/** Modellgruppen für das Filter-Dropdown über der Auftragsliste. */
export async function auftragModellgruppen() {
  return db
    .select({ id: modellgruppe.id, name: modellgruppe.name, farbe: modellgruppe.farbe })
    .from(modellgruppe)
    .orderBy(modellgruppe.name);
}

export async function listAuftraege(
  params: {
    q?: string; status?: string; art?: string; modellgruppe?: string;
    page?: number; sort?: SortSpec;
  } = {},
) {
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);
  const modell = artikel;
  const filters = [];
  if (params.status && (STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(auftrag.status, params.status as AuftragStatus));
  }
  if (params.art && (ART_VALUES as readonly string[]).includes(params.art)) {
    filters.push(eq(auftrag.auftragsart, params.art as Auftragsart));
  }
  if (params.modellgruppe) {
    filters.push(eq(modell.modellgruppeId, params.modellgruppe));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(ilike(auftrag.nummer, like), ilike(auftrag.kdFirma, like), ilike(auftrag.kdNachname, like))!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      auftragsart: auftrag.auftragsart,
      status: auftrag.status,
      auftragsdatum: auftrag.auftragsdatum,
      bauplandatum: auftrag.bauplandatum,
      kdFirma: auftrag.kdFirma,
      kdVorname: auftrag.kdVorname,
      kdNachname: auftrag.kdNachname,
      kdWaehrung: auftrag.kdWaehrung,
      fortschrittProzent: auftrag.fortschrittProzent,
      umsatzerwartung: auftrag.umsatzerwartung,
      modellName: modell.nameBelege,
      modellgruppeName: modellgruppe.name,
      modellgruppeFarbe: modellgruppe.farbe,
    })
    .from(auftrag)
    .leftJoin(modell, eq(auftrag.modellArtikelId, modell.id))
    .leftJoin(modellgruppe, eq(modellgruppe.id, modell.modellgruppeId))
    .where(where)
    .orderBy(...orderByFor(AUFTRAG_SORT, params.sort, auftrag.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auftrag)
    .leftJoin(modell, eq(auftrag.modellArtikelId, modell.id))
    .where(where);
  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/* --------------------------------------------------------------------- detail */

export async function getAuftrag(id: string) {
  const row = await db.query.auftrag.findFirst({ where: eq(auftrag.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  let modellName: string | null = null;
  if (row.modellArtikelId) {
    const [m] = await db.select({ n: artikel.nameBelege }).from(artikel).where(eq(artikel.id, row.modellArtikelId));
    modellName = m?.n ?? null;
  }
  const rechnungen = await db
    .select({ id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, status: rechnung.status })
    .from(rechnung)
    .where(eq(rechnung.auftragId, id));
  return { auftrag: row, modellName, rechnungen };
}

export async function auftragPositionCount(id: string) {
  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(belegPosition)
    .where(eq(belegPosition.auftragId, id));
  return c;
}

/* ------------------------------------------------------------------ mutationen */

const START_STATUS: Record<Auftragsart, AuftragStatus> = {
  PRODUKTION: "BACKORDER",
  NONE_GUITAR: "NONE_GUITAR",
  SERVICE: "SERVICE",
};

export async function createAuftrag(art: Auftragsart, kundeId?: string | null): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const jahr = new Date().getFullYear();
  const nummer = await allocateNummer("AUFTRAG", jahr);
  const snap = kundeId ? await kdSnapshot(kundeId) : {};

  const [row] = await db
    .insert(auftrag)
    .values({
      nummer,
      auftragsart: art,
      status: START_STATUS[art],
      auftragsdatum: new Date().toISOString().slice(0, 10),
      ...snap,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: auftrag.id });

  if (art === "PRODUKTION") {
    await seedStandardSchritte(row.id, user.id);
    // Compliance-Schritte nach Kunde
    if (kundeId && "kdRegion" in snap) {
      await recomputeComplianceSteps(row.id, (snap as { kdRegion?: string | null }).kdRegion ?? null, false);
    }
  } else if (art === "SERVICE") {
    await addSchritt(row.id, VORRAT_NR.REPARATUR, user.id);
  }
  return row.id;
}

export async function setAuftragKunde(id: string, kundeId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const snap = await kdSnapshot(kundeId);
  await db
    .update(auftrag)
    .set({ ...snap, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, id));
  await recomputeComplianceSteps(id, snap.kdRegion ?? null, await hatCitesHolz(id));
}

async function hatCitesHolz(auftragId: string): Promise<boolean> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(and(eq(specBelegung.auftragId, auftragId), eq(artikel.geschuetztesHolzCites, true)));
  return n > 0;
}

/* --------------------------------------------------------------- Status (7g) */

const ALLOWED: Record<AuftragStatus, AuftragStatus[]> = {
  BACKORDER: ["WERKSTATT", "BEI_NICL", "STORNIERT", "SERVICE", "NONE_GUITAR"],
  WERKSTATT: ["BEI_NICL", "PROD_FERTIG", "BACKORDER", "STORNIERT"],
  BEI_NICL: ["WERKSTATT", "PROD_FERTIG", "STORNIERT"],
  PROD_FERTIG: ["WERKSTATT", "ABGESCHLOSSEN", "STORNIERT"],
  SERVICE: ["ABGESCHLOSSEN", "ABGESCHL_OHNE_BEFUND", "STORNIERT"],
  NONE_GUITAR: ["ABGESCHLOSSEN", "STORNIERT"],
  ABGESCHLOSSEN: ["WERKSTATT", "PROD_FERTIG"],
  ABGESCHL_OHNE_BEFUND: ["SERVICE"],
  STORNIERT: ["BACKORDER"],
};

export async function changeAuftragStatus(id: string, ziel: AuftragStatus) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, id));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  const von = a.status as AuftragStatus;
  if (von === ziel) return;
  if (!ALLOWED[von]?.includes(ziel)) {
    throw new DomainError("STATE", `Übergang ${von} → ${ziel} nicht erlaubt.`);
  }

  const heute = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> = { status: ziel, updatedAt: new Date(), updatedBy: user.id };

  if (ziel === "WERKSTATT") {
    patch.produktionsort = "RODGAU";
    patch.werkstattbeginn = a.werkstattbeginn ?? heute;
  } else if (ziel === "BEI_NICL") {
    patch.produktionsort = "HAMBURG";
    patch.werkstattbeginn = a.werkstattbeginn ?? heute;
  } else if (ziel === "SERVICE") {
    patch.werkstattbeginn = a.werkstattbeginn ?? heute;
  } else if (ziel === "ABGESCHLOSSEN") {
    // Guard: kein Abschluss ohne Rechnung (7g)
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(rechnung)
      .where(eq(rechnung.auftragId, id));
    if (n === 0) {
      throw new DomainError("STATE", "Abschluss nicht möglich: keine Rechnung vorhanden.");
    }
    patch.versanddatum = a.versanddatum ?? heute;
  }

  await db.update(auftrag).set(patch).where(eq(auftrag.id, id));

  if (ziel === "SERVICE") await addSchritt(id, VORRAT_NR.REPARATUR, user.id);
  if (ziel === "PROD_FERTIG") {
    await db.execute(sql`
      update arbeitsschritt s set status = 'ERLEDIGT', erledigt_am = coalesce(s.erledigt_am, now()), updated_at = now()
      from arbeitsschritt_vorrat v
      where s.vorrat_id = v.id and s.auftrag_id = ${id}
        and v.typ = 'WERKSTATT' and s.status in ('OFFEN','WARTEN_AUF')
    `);
    await recomputeComplianceSteps(id, a.kdRegion ?? null, await hatCitesHolz(id));
  }
  await refreshFortschritt(id);
}

/** `fortschritt_prozent` + `stand_he_wert` neu berechnen (7h). */
export async function refreshFortschritt(id: string) {
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, id));
  if (!a) return;
  const prozent = await computeFortschritt(id);
  const umsatz = Number(a.umsatzerwartung ?? 0);
  const standHe = Math.round(umsatz * (prozent / 100) * 100) / 100;
  await db
    .update(auftrag)
    .set({ fortschrittProzent: prozent, standHeWert: String(standHe) })
    .where(eq(auftrag.id, id));
}

/* ----------------------------------------------------------------- Kopf-Form */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum YYYY-MM-DD").nullable(),
);
const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);

export const auftragKopfSchema = z.object({
  auftragsart: z.enum(ART_VALUES),
  prio: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().nullable()),
  produktionsort: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["RODGAU", "HAMBURG"]).nullable(),
  ),
  besonderes: nullableText,
  spezialauftrag: nullableText,
  bauplandatum: dateOrNull,
  umsatzerwartung: decimalOrNull,
  anzahlung: decimalOrNull,
});
export type AuftragKopfInput = z.infer<typeof auftragKopfSchema>;

export async function updateAuftragKopf(id: string, input: AuftragKopfInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const bauplanMonat = input.bauplandatum ? input.bauplandatum.slice(0, 7) : null;
  const res = await db
    .update(auftrag)
    .set({ ...input, bauplanMonat, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, id))
    .returning({ id: auftrag.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  await refreshFortschritt(id);
  await recomputeSummen("auftrag", id);
}

export async function convertAuftragsart(id: string, art: Auftragsart) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db
    .update(auftrag)
    .set({ auftragsart: art, status: START_STATUS[art], updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, id));
  if (art === "PRODUKTION") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(arbeitsschritt)
      .where(eq(arbeitsschritt.auftragId, id));
    if (n === 0) await seedStandardSchritte(id, user.id);
  } else {
    await clearSchritte(id);
    if (art === "SERVICE") await addSchritt(id, VORRAT_NR.REPARATUR, user.id);
  }
}

/** Kunden-Kurzliste (Picker) — wie Angebot. */
export async function kundenPickerListe(q: string, limit = 15) {
  const filters = [isNull(kunde.deletedAt)];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(kunde.firma, like), ilike(kunde.nachname, like), ilike(kunde.kurzname, like))!);
  }
  return db
    .select({
      id: kunde.id, firma: kunde.firma, vorname: kunde.vorname, nachname: kunde.nachname,
      kurzname: kunde.kurzname, ort: kunde.ort, kontaktart: kunde.kontaktart,
    })
    .from(kunde)
    .where(and(...filters))
    .orderBy(sql`lower(coalesce(${kunde.firma}, ${kunde.nachname}, ${kunde.kurzname}, ''))`)
    .limit(limit);
}
