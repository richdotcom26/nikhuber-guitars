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

/**
 * Berechneter Briefkopf (ex Ninox-Formel „Briefkopf" / „Briefkopfperson"):
 *   [Firma]
 *   Vorname Nachname   (bzw. nur Nachname)
 *   Strasse
 *   [Adresszusatz]
 *   PLZ Ort
 *   [Staat — nur wenn nicht Inland]
 * `briefkopfManuell` überschreibt alles. Leere Zeilen werden ausgelassen.
 */
export function berechneBriefkopf(k: {
  firma?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  strasse?: string | null;
  adresszusatz?: string | null;
  plz?: string | null;
  ort?: string | null;
  staatName?: string | null;
  istInland?: boolean | null;
  briefkopfManuell?: string | null;
}): string {
  if (k.briefkopfManuell?.trim()) return k.briefkopfManuell.trim();
  const person = [k.vorname, k.nachname].map((s) => s?.trim()).filter(Boolean).join(" ");
  const plzOrt = [k.plz?.trim(), k.ort?.trim()].filter(Boolean).join(" ");
  return [
    k.firma?.trim() || null,
    person || null,
    k.strasse?.trim() || null,
    k.adresszusatz?.trim() || null,
    plzOrt || null,
    !k.istInland ? (k.staatName?.trim() || null) : null,
  ].filter(Boolean).join("\n");
}

/**
 * Kundenanzeige in Fremd-Tabellen (Aufträge, Rechnungen, Angebote …): **Kurzname**,
 * sonst Firmenname, sonst „Vorname Nachname". `kurzname`/`firma` kommen live aus dem
 * Kunden-Datensatz, die `kd*`-Felder aus dem Beleg-Snapshot (falls kein Kunde verknüpft).
 */
export function kundeKurz(r: {
  kurzname?: string | null;
  firma?: string | null;
  kdFirma?: string | null;
  kdVorname?: string | null;
  kdNachname?: string | null;
}): string {
  return r.kurzname?.trim()
    || r.firma?.trim()
    || r.kdFirma?.trim()
    || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ").trim()
    || "–";
}
