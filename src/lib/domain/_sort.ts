import "server-only";
import { asc, desc } from "drizzle-orm";
import type { SortSpec } from "@/lib/table-sort";

// Sortier-Ziel = Drizzle-Spalte oder SQL-Ausdruck. Bewusst locker typisiert.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Target = any;

/**
 * ORDER-BY-Liste aus einer Spalten-Map + `SortSpec` bauen.
 * `tiebreak` (meist `created_at desc`) hält die Reihenfolge stabil und
 * greift, wenn `sort.key` unbekannt ist.
 */
export function orderByFor(
  map: Record<string, Target>,
  sort: SortSpec | undefined,
  tiebreak: Target,
  tiebreakDir: "asc" | "desc" = "desc",
): Target[] {
  const tb = tiebreakDir === "asc" ? asc : desc;
  const target = sort ? map[sort.key] : undefined;
  if (!target) return [tb(tiebreak)];
  const dir = sort!.dir === "asc" ? asc : desc;
  return target === tiebreak ? [dir(target)] : [dir(target), tb(tiebreak)];
}
