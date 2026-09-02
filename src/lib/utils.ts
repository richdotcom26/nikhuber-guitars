import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-Klassen zusammenführen (Konflikte gewinnt die letzte). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zahl als EUR/USD formatieren (de-DE). `null`/`undefined` -> "–". */
export function formatMoney(
  value: number | string | null | undefined,
  waehrung: "EUR" | "USD" = "EUR",
): string {
  if (value == null || value === "") return "–";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: waehrung }).format(n);
}

/** Datum (Date | ISO | 'YYYY-MM-DD') als de-DE `TT.MM.JJJJ`. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "–";
  const d = value instanceof Date ? value : new Date(value.length <= 10 ? value + "T00:00:00Z" : value);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
