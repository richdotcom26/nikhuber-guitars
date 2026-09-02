/** Gemeinsame Sortier-Helfer für Listen-Tabellen (server- und client-tauglich). */

export type SortDir = "asc" | "desc";
export interface SortSpec {
  key: string;
  dir: SortDir;
}

/**
 * `?sort=<key>&dir=<asc|desc>` gegen eine Whitelist parsen.
 * Unbekannte Werte fallen auf `fallback` zurück.
 */
export function parseSort(
  raw: { sort?: string; dir?: string } | undefined,
  allowed: readonly string[],
  fallback: SortSpec,
): SortSpec {
  const key = raw?.sort && allowed.includes(raw.sort) ? raw.sort : fallback.key;
  const dir: SortDir = raw?.dir === "asc" || raw?.dir === "desc" ? raw.dir : fallback.dir;
  return { key, dir };
}
