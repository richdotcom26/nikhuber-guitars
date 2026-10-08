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

/** Betrag ohne Währungszeichen im deutschen Format „1.234,56" (für Eingabefelder). Leer bei null. */
export function formatBetrag(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/**
 * Eingabe → Dezimalstring mit Punkt (für Number()/numeric). Versteht „1.234,56", „1234,56",
 * „1234.56" und „1 234,56 €": Mit Komma → Punkte sind Tausendertrenner; ohne Komma und mit
 * mehreren Punkten → ebenfalls Tausendertrenner; sonst ist ein einzelner Punkt das Dezimalzeichen.
 */
export function dezimal(s: string): string {
  let t = s.trim().replace(/[\s €$]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, "");
  return t;
}

/** Lesbare Textfarbe (schwarz/weiß) für einen Hex-Hintergrund. */
export function kontrastText(hex: string | null | undefined): string {
  if (!hex) return "#111111";
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#111111";
  // relative Helligkeit (YIQ)
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#111111" : "#ffffff";
}

/** Alle Datums-/Zeitangaben der App beziehen sich auf deutsche Zeit (Server läuft in UTC). */
export const ZEITZONE = "Europe/Berlin";

/** Heutiges Datum in deutscher Zeit als `YYYY-MM-DD` (für Datumsfelder wie Auftragsdatum). */
export function heuteBerlin(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZEITZONE }).format(jetzt);
}

/** Aktuelles Jahr in deutscher Zeit (für Belegnummern). */
export function jahrBerlin(jetzt: Date = new Date()): number {
  return Number(heuteBerlin(jetzt).slice(0, 4));
}

/**
 * Datum als de-DE `TT.MM.JJJJ`. Reine Kalenderdaten (`YYYY-MM-DD`) werden unverändert angezeigt,
 * Zeitstempel (Date / ISO mit Uhrzeit) in deutscher Zeit.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "–";
  const nurDatum = typeof value === "string" && value.length <= 10;
  const d = value instanceof Date ? value : new Date(nurDatum ? value + "T00:00:00Z" : value);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: nurDatum ? "UTC" : ZEITZONE,
  }).format(d);
}

/** Zeitstempel (Date | ISO) als de-DE `TT.MM.JJJJ, HH:MM` in deutscher Zeit. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "–";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZEITZONE,
  }).format(d);
}
