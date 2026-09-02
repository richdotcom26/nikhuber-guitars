/**
 * Client- und serverseitig nutzbare Adress-Konstanten/Helfer (kein DB-Zugriff).
 * Der Service `src/lib/domain/adressen.ts` re-exportiert das Nötige.
 */
export const KONTAKTART_VALUES = [
  "KUNDE", "HAENDLER", "ARTIST", "LIEFERANT", "HOLZHAENDLER", "INDUSTRIE", "SONSTIGE",
] as const;
export type KontaktartValue = (typeof KONTAKTART_VALUES)[number];

export const KONTAKTART_LABEL: Record<KontaktartValue, string> = {
  KUNDE: "Kunde",
  HAENDLER: "Händler",
  ARTIST: "Artist",
  LIEFERANT: "Lieferant",
  HOLZHAENDLER: "Holzhändler",
  INDUSTRIE: "Industrie",
  SONSTIGE: "Sonstige",
};

export const KONTAKTARTEN = KONTAKTART_VALUES.map((value) => ({
  value,
  label: KONTAKTART_LABEL[value],
}));

export const REGION_VALUES = ["D", "EU", "WELT", "ASIEN", "USA"] as const;
export const VERTRIEBSWEG_VALUES = ["NET1", "NET2", "NET_US", "VK_US", "VK_EUR"] as const;

/** Anzeigename: Firma, sonst „Vorname Nachname", sonst Kurzname. */
export function anzeigename(k: {
  firma?: string | null; vorname?: string | null; nachname?: string | null; kurzname?: string | null;
}): string {
  if (k.firma?.trim()) return k.firma.trim();
  const n = [k.vorname, k.nachname].filter(Boolean).join(" ").trim();
  return n || k.kurzname?.trim() || "—";
}
