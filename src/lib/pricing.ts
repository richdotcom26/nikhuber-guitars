/**
 * Steuer- & Vertriebsweg-Ableitung (ex Ninox 7b, MIGRATION „Schritt 4b").
 * Reines Modul (client- und serverseitig nutzbar) — die Kunden-Detailform
 * rechnet damit direkt im Browser für die Vorschau.
 *
 * Anwendung: EINMALIG als Default beim Wählen des Staats am Kunden
 * (bzw. Button „Preis/Steuer/Sprache autom."). Danach frei editierbar.
 * Nur für verkaufsrelevante Kontaktarten (KUNDE / HAENDLER / ARTIST).
 */
export type Region = "D" | "EU" | "WELT" | "ASIEN" | "USA";
export type Kontaktart =
  | "KUNDE" | "LIEFERANT" | "HAENDLER" | "ARTIST" | "HOLZHAENDLER" | "INDUSTRIE" | "SONSTIGE";
export type Vertriebsweg = "NET1" | "NET2" | "NET_US" | "VK_US" | "VK_EUR";

export interface TaxDefault {
  vertriebsweg: Vertriebsweg;
  steuerpflichtig: boolean;
}

// Kontaktart × Region → { vertriebsweg, steuerpflichtig }  (MIGRATION 7b, von Rainer bestätigt)
const MATRIX: Record<"KUNDE" | "HAENDLER" | "ARTIST", Record<Region, TaxDefault>> = {
  HAENDLER: {
    D:     { vertriebsweg: "NET1",   steuerpflichtig: true },
    EU:    { vertriebsweg: "NET1",   steuerpflichtig: false },
    WELT:  { vertriebsweg: "NET1",   steuerpflichtig: false },
    ASIEN: { vertriebsweg: "NET2",   steuerpflichtig: false },
    USA:   { vertriebsweg: "NET_US", steuerpflichtig: false },
  },
  KUNDE: {
    D:     { vertriebsweg: "VK_EUR", steuerpflichtig: true },
    EU:    { vertriebsweg: "VK_EUR", steuerpflichtig: true },
    WELT:  { vertriebsweg: "VK_EUR", steuerpflichtig: false },
    ASIEN: { vertriebsweg: "VK_EUR", steuerpflichtig: false },
    USA:   { vertriebsweg: "VK_US",  steuerpflichtig: false },
  },
  ARTIST: {
    D:     { vertriebsweg: "NET2",   steuerpflichtig: true },
    EU:    { vertriebsweg: "NET2",   steuerpflichtig: true },
    WELT:  { vertriebsweg: "NET2",   steuerpflichtig: false },
    ASIEN: { vertriebsweg: "NET2",   steuerpflichtig: false },
    USA:   { vertriebsweg: "VK_US",  steuerpflichtig: false },
  },
};

export function istVerkaufsrelevant(k: Kontaktart): k is "KUNDE" | "HAENDLER" | "ARTIST" {
  return k === "KUNDE" || k === "HAENDLER" || k === "ARTIST";
}

/** `null`, wenn Kontaktart nicht verkaufsrelevant oder Region unbekannt. */
export function taxDefault(kontaktart: Kontaktart, region: Region | null | undefined): TaxDefault | null {
  if (!region || !istVerkaufsrelevant(kontaktart)) return null;
  return MATRIX[kontaktart][region];
}

/** MwSt-Prozentsatz, wenn steuerpflichtig, sonst 0. */
export function mwstProzent(steuerpflichtig: boolean, mwstSatz: number): number {
  return steuerpflichtig ? mwstSatz : 0;
}
