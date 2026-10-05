import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { belegPosition, rechnung } from "@/lib/db/schema";
import { DomainError } from "./errors";

/**
 * Abrechnungsstand eines Auftrags: welche Menge jeder Auftragsposition ist schon berechnet?
 * Zählt nur gebuchte Belege (GEBUCHT/BEZAHLT/STORNIERT). Stornorechnungen und
 * Rechnungskorrekturen zählen negativ — ein Storno gibt die Menge wieder frei.
 */
export async function berechneteMengen(auftragId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      quelle: belegPosition.quellPositionId,
      menge: sql<string>`sum(case when ${rechnung.belegart} = 'RECHNUNG' then ${belegPosition.anzahl} else -${belegPosition.anzahl} end)`,
    })
    .from(belegPosition)
    .innerJoin(rechnung, eq(rechnung.id, belegPosition.rechnungId))
    .where(and(
      eq(rechnung.auftragId, auftragId),
      inArray(rechnung.status, ["GEBUCHT", "BEZAHLT", "STORNIERT"]),
      sql`${belegPosition.quellPositionId} is not null`,
    ))
    .groupBy(belegPosition.quellPositionId);
  return new Map(rows.map((r) => [r.quelle!, Number(r.menge)]));
}

export interface PositionStand {
  id: string;
  anzahl: number;
  berechnet: number;
  offen: number;
}

/** Je RE-relevanter Auftragsposition: Menge, berechnet, offen. */
export async function abrechnungsStand(auftragId: string) {
  const [pos, mengen] = await Promise.all([
    db
      .select({ id: belegPosition.id, anzahl: belegPosition.anzahl, reRelevant: belegPosition.reRelevant })
      .from(belegPosition)
      .where(eq(belegPosition.auftragId, auftragId)),
    berechneteMengen(auftragId),
  ]);
  const positionen: PositionStand[] = pos
    .filter((p) => p.reRelevant)
    .map((p) => {
      const anzahl = Number(p.anzahl);
      const berechnet = mengen.get(p.id) ?? 0;
      return { id: p.id, anzahl, berechnet, offen: Math.max(anzahl - berechnet, 0) };
    });
  const teilweise = positionen.some((p) => p.berechnet > 0);
  const vollstaendig = positionen.length > 0 && positionen.every((p) => p.offen <= 0);
  return { positionen, byId: new Map(positionen.map((p) => [p.id, p])), teilweise, vollstaendig };
}

/**
 * Auftragspositionen dürfen geändert werden, solange der Auftrag nicht vollständig berechnet ist.
 * Bereits (teil-)berechnete Positionen: nicht löschen, Preis/Rabatt nicht ändern, Menge nicht unter
 * die berechnete Menge senken. Ganz-Beleg-Operationen (generieren, alle löschen) nur ohne Berechnung.
 */
export async function assertAuftragPositionenAenderbar(
  auftragId: string,
  op:
    | { art: "ganz" }
    | { art: "neu" }
    | { art: "loeschen"; posId: string }
    | { art: "aendern"; posId: string; anzahl?: number; preisOderRabatt?: boolean },
) {
  const stand = await abrechnungsStand(auftragId);
  if (stand.vollstaendig) {
    throw new DomainError("STATE", "Der Auftrag ist vollständig berechnet — Positionen sind gesperrt. Änderungen nur über Storno/Korrektur der Rechnung.");
  }
  if (op.art === "ganz" && stand.teilweise) {
    throw new DomainError("STATE", "Der Auftrag ist schon teilweise berechnet — Positionen können nicht neu generiert oder komplett gelöscht werden.");
  }
  if (op.art === "loeschen" || op.art === "aendern") {
    const p = stand.byId.get(op.posId);
    if (!p || p.berechnet <= 0) return;
    if (op.art === "loeschen") {
      throw new DomainError("STATE", "Diese Position ist schon berechnet und kann nicht gelöscht werden.");
    }
    if (op.preisOderRabatt) {
      throw new DomainError("STATE", "Diese Position ist schon berechnet — Preis und Rabatt sind gesperrt.");
    }
    if (op.anzahl != null && op.anzahl < p.berechnet) {
      throw new DomainError("STATE", `Menge kann nicht unter die schon berechnete Menge (${p.berechnet}) gesenkt werden.`);
    }
  }
}
