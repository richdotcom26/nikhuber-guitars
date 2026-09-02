import "server-only";
import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { ArtikelgruppeValue } from "@/lib/artikel-shared";
import { angebot, artikel, auftrag, specBelegung } from "@/lib/db/schema";
import { SPEC_SLOT_BY_KEY, SPEC_SLOTS, type SpecSection } from "@/lib/specs/slots";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export type SpecTraeger = "modell" | "angebot" | "auftrag";

const TRAEGER_COL = {
  modell: specBelegung.modellArtikelId,
  angebot: specBelegung.angebotId,
  auftrag: specBelegung.auftragId,
} as const;

const FREITEXT_COL: Record<SpecSection, "freitextBody" | "freitextColour" | "freitextNeck" | "freitextAssembly"> = {
  BODY: "freitextBody",
  FINISH_COLOUR: "freitextColour",
  NECK: "freitextNeck",
  ASSEMBLY: "freitextAssembly",
};

/** Slots, die aus mehreren artikelgruppen wählen (Import-Beobachtung). */
const SLOT_GRUPPEN_OVERRIDE: Record<string, string[]> = {
  bridge: ["BRIDGE", "TAILPIECE"],
  tailpiece: ["BRIDGE", "TAILPIECE"],
};

function gruppenForSlot(slotKey: string): string[] {
  if (SLOT_GRUPPEN_OVERRIDE[slotKey]) return SLOT_GRUPPEN_OVERRIDE[slotKey];
  const slot = SPEC_SLOT_BY_KEY[slotKey];
  if (!slot) throw new DomainError("NOT_FOUND", `Unbekannter Slot: ${slotKey}`);
  return [slot.gruppe];
}

/* --------------------------------------------------------------------- lesen */

export interface SpecRow {
  id: string;
  slotKey: string;
  reihenfolge: number;
  aufpreis: boolean;
  artikelId: string;
  artikelName: string | null;
  artikelNr: string | null;
  vkEur: string | null;
  net1: string | null;
  net2: string | null;
}

export async function getSpecs(traeger: SpecTraeger, traegerId: string) {
  const rows: SpecRow[] = await db
    .select({
      id: specBelegung.id,
      slotKey: specBelegung.slotKey,
      reihenfolge: specBelegung.reihenfolge,
      aufpreis: specBelegung.aufpreis,
      artikelId: specBelegung.artikelId,
      artikelName: artikel.nameBelege,
      artikelNr: artikel.artikelNr,
      vkEur: artikel.vkEur,
      net1: artikel.net1,
      net2: artikel.net2,
    })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(eq(TRAEGER_COL[traeger], traegerId))
    .orderBy(asc(specBelegung.slotKey), asc(specBelegung.reihenfolge));
  return rows;
}

/** Kandidaten-Artikel für einen Slot-Dropdown. */
export async function slotCandidates(slotKey: string, q?: string, limit = 200) {
  const gruppen = gruppenForSlot(slotKey) as ArtikelgruppeValue[];
  const filters = [
    isNull(artikel.deletedAt),
    eq(artikel.datensatzInaktiv, false),
    inArray(artikel.artikelgruppe, gruppen),
  ];
  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(artikel.nameBelege, like), ilike(artikel.nameLang, like), ilike(artikel.artikelNr, like))!);
  }
  return db
    .select({
      id: artikel.id,
      nameBelege: artikel.nameBelege,
      nameLang: artikel.nameLang,
      artikelNr: artikel.artikelNr,
      vkEur: artikel.vkEur,
    })
    .from(artikel)
    .where(and(...filters))
    .orderBy(asc(sql`lower(coalesce(${artikel.nameBelege}, ${artikel.nameLang}, ''))`))
    .limit(limit);
}

export interface SlotCandidate {
  id: string;
  name: string;
  artikelNr: string | null;
  vkEur: string | null;
}

/**
 * Kandidaten je Slot-Key für den Specs-Editor (eine Query, in JS gruppiert).
 * `Record<slotKey, SlotCandidate[]>`.
 */
export async function candidatesBySlot(): Promise<Record<string, SlotCandidate[]>> {
  const gruppen = new Set<string>();
  for (const s of SPEC_SLOTS) gruppenForSlot(s.key).forEach((g) => gruppen.add(g));

  const rows = await db
    .select({
      id: artikel.id,
      gruppe: artikel.artikelgruppe,
      nameBelege: artikel.nameBelege,
      nameLang: artikel.nameLang,
      artikelNr: artikel.artikelNr,
      vkEur: artikel.vkEur,
    })
    .from(artikel)
    .where(and(
      isNull(artikel.deletedAt),
      eq(artikel.datensatzInaktiv, false),
      inArray(artikel.artikelgruppe, [...gruppen] as ArtikelgruppeValue[]),
    ))
    .orderBy(asc(sql`lower(coalesce(${artikel.nameBelege}, ${artikel.nameLang}, ''))`));

  const byGruppe = new Map<string, SlotCandidate[]>();
  for (const r of rows) {
    const list = byGruppe.get(r.gruppe) ?? [];
    list.push({ id: r.id, name: r.nameBelege || r.nameLang || "–", artikelNr: r.artikelNr, vkEur: r.vkEur });
    byGruppe.set(r.gruppe, list);
  }

  const out: Record<string, SlotCandidate[]> = {};
  for (const s of SPEC_SLOTS) {
    const merged: SlotCandidate[] = [];
    for (const g of gruppenForSlot(s.key)) merged.push(...(byGruppe.get(g) ?? []));
    merged.sort((a, b) => a.name.localeCompare(b.name, "de"));
    out[s.key] = merged;
  }
  return out;
}

/* ------------------------------------------------------------------ schreiben */

async function assertWrite() {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  return user;
}

/**
 * Einen Slot setzen/ändern/leeren.
 * `artikelId === null` → Zeile (slotKey, reihenfolge) am Träger löschen.
 */
export async function setSlot(
  traeger: SpecTraeger,
  traegerId: string,
  slotKey: string,
  reihenfolge: number,
  artikelId: string | null,
  aufpreis: boolean,
) {
  const user = await assertWrite();
  if (!SPEC_SLOT_BY_KEY[slotKey] && !SLOT_GRUPPEN_OVERRIDE[slotKey]) {
    throw new DomainError("NOT_FOUND", `Unbekannter Slot: ${slotKey}`);
  }
  const col = TRAEGER_COL[traeger];

  if (artikelId === null) {
    await db.delete(specBelegung).where(and(eq(col, traegerId), eq(specBelegung.slotKey, slotKey), eq(specBelegung.reihenfolge, reihenfolge)));
    return;
  }

  // gehört der Artikel zur richtigen Gruppe?
  const [a] = await db.select({ gruppe: artikel.artikelgruppe }).from(artikel).where(eq(artikel.id, artikelId));
  if (!a) throw new DomainError("NOT_FOUND", "Artikel nicht gefunden.");
  if (!gruppenForSlot(slotKey).includes(a.gruppe)) {
    throw new DomainError("VALIDATION", `Artikel-Gruppe ${a.gruppe} passt nicht zum Slot ${slotKey}.`);
  }

  const existing = await db
    .select({ id: specBelegung.id })
    .from(specBelegung)
    .where(and(eq(col, traegerId), eq(specBelegung.slotKey, slotKey), eq(specBelegung.reihenfolge, reihenfolge)));

  if (existing.length) {
    await db
      .update(specBelegung)
      .set({ artikelId, aufpreis, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(specBelegung.id, existing[0].id));
  } else {
    await db.insert(specBelegung).values({
      [traeger === "modell" ? "modellArtikelId" : traeger === "angebot" ? "angebotId" : "auftragId"]: traegerId,
      slotKey,
      artikelId,
      aufpreis,
      reihenfolge,
      createdBy: user.id,
      updatedBy: user.id,
    });
  }
}

/** Nächste freie `reihenfolge` für einen (mehrfach-)Slot. */
export async function nextReihenfolge(traeger: SpecTraeger, traegerId: string, slotKey: string) {
  const [r] = await db
    .select({ max: sql<number>`coalesce(max(${specBelegung.reihenfolge}), -1)` })
    .from(specBelegung)
    .where(and(eq(TRAEGER_COL[traeger], traegerId), eq(specBelegung.slotKey, slotKey)));
  return (r?.max ?? -1) + 1;
}

/** Abschnitts-Freitext am Träger setzen. */
export async function setFreitext(
  traeger: SpecTraeger,
  traegerId: string,
  section: SpecSection,
  text: string | null,
) {
  const user = await assertWrite();
  const value = text?.trim() ? text.trim() : null;
  const col = FREITEXT_COL[section];
  if (traeger === "modell") {
    await db.update(artikel).set({ [col]: value, updatedAt: new Date(), updatedBy: user.id }).where(eq(artikel.id, traegerId));
  } else if (traeger === "angebot") {
    await db.update(angebot).set({ [col]: value, updatedAt: new Date(), updatedBy: user.id }).where(eq(angebot.id, traegerId));
  } else {
    await db.update(auftrag).set({ [col]: value, updatedAt: new Date(), updatedBy: user.id }).where(eq(auftrag.id, traegerId));
  }
}

/* ------------------------------------------------- Specs-Artikelliste (7y) */

export interface KalkZeile {
  slotKey: string;
  caption: string;
  section: SpecSection;
  aufpreis: boolean;
  artikelName: string | null;
  artikelNr: string | null;
  vkEur: number;
  net1: number;
  net2: number;
  ekNettoEur: number;
}

/**
 * Kalkulationsansicht des Modells (7y): je belegtem Slot der Spec-Artikel mit seinen
 * Tier-Preisen als Delta (0 bei Standard-Spec ohne Preiswirkung). Plus Modell-Basispreise + Summen.
 */
export async function specArtikelliste(modellId: string) {
  const [m] = await db
    .select({ vkEur: artikel.vkEur, net1: artikel.net1, net2: artikel.net2, nameBelege: artikel.nameBelege })
    .from(artikel)
    .where(eq(artikel.id, modellId));
  if (!m) throw new DomainError("NOT_FOUND", "Modell nicht gefunden.");

  const specRows = await db
    .select({
      slotKey: specBelegung.slotKey,
      aufpreis: specBelegung.aufpreis,
      artikelName: artikel.nameBelege,
      artikelNr: artikel.artikelNr,
      vkEur: artikel.vkEur,
      net1: artikel.net1,
      net2: artikel.net2,
      ekNettoEur: artikel.ekNettoEur,
    })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(eq(specBelegung.modellArtikelId, modellId))
    .orderBy(asc(specBelegung.slotKey), asc(specBelegung.reihenfolge));

  const zeilen: KalkZeile[] = specRows.map((r) => {
    const slot = SPEC_SLOT_BY_KEY[r.slotKey];
    return {
      slotKey: r.slotKey,
      caption: slot?.caption ?? r.slotKey,
      section: (slot?.section ?? "ASSEMBLY") as SpecSection,
      aufpreis: r.aufpreis,
      artikelName: r.artikelName,
      artikelNr: r.artikelNr,
      vkEur: Number(r.vkEur ?? 0),
      net1: Number(r.net1 ?? 0),
      net2: Number(r.net2 ?? 0),
      ekNettoEur: Number(r.ekNettoEur ?? 0),
    };
  });

  const basis = { vkEur: Number(m.vkEur ?? 0), net1: Number(m.net1 ?? 0), net2: Number(m.net2 ?? 0) };
  // Deltas nur der aufpreisrelevanten Zeilen
  const deltaSum = zeilen.reduce(
    (acc, z) => {
      if (z.aufpreis) {
        acc.vkEur += z.vkEur;
        acc.net1 += z.net1;
        acc.net2 += z.net2;
      }
      acc.ekNettoEur += z.ekNettoEur;
      return acc;
    },
    { vkEur: 0, net1: 0, net2: 0, ekNettoEur: 0 },
  );

  return {
    modellName: m.nameBelege,
    basis,
    zeilen,
    summe: {
      vkEur: Math.round((basis.vkEur + deltaSum.vkEur) * 100) / 100,
      net1: Math.round((basis.net1 + deltaSum.net1) * 100) / 100,
      net2: Math.round((basis.net2 + deltaSum.net2) * 100) / 100,
      ekNettoEur: Math.round(deltaSum.ekNettoEur * 100) / 100,
    },
    deltaSum: {
      vkEur: Math.round(deltaSum.vkEur * 100) / 100,
      net1: Math.round(deltaSum.net1 * 100) / 100,
      net2: Math.round(deltaSum.net2 * 100) / 100,
    },
  };
}
