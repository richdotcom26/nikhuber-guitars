/** Client-sichere Auftrag-Konstanten (kein DB-Zugriff). */

export const AUFTRAGSART_VALUES = ["PRODUKTION", "NONE_GUITAR", "SERVICE"] as const;
export type Auftragsart = (typeof AUFTRAGSART_VALUES)[number];
export const AUFTRAGSART_LABEL: Record<Auftragsart, string> = {
  PRODUKTION: "Produktion",
  NONE_GUITAR: "None-Guitar",
  SERVICE: "Service",
};
export const AUFTRAGSART = AUFTRAGSART_VALUES.map((value) => ({ value, label: AUFTRAGSART_LABEL[value] }));

export const AUFTRAG_STATUS_VALUES = [
  "BACKORDER", "WERKSTATT", "BEI_NICL", "PROD_FERTIG", "SERVICE",
  "NONE_GUITAR", "ABGESCHLOSSEN", "ABGESCHL_OHNE_BEFUND", "STORNIERT",
] as const;
export type AuftragStatus = (typeof AUFTRAG_STATUS_VALUES)[number];
export const AUFTRAG_STATUS_LABEL: Record<AuftragStatus, string> = {
  BACKORDER: "Backorder",
  WERKSTATT: "In Werkstatt",
  BEI_NICL: "Bei Nicl (Hamburg)",
  PROD_FERTIG: "Produktion fertig",
  SERVICE: "Service",
  NONE_GUITAR: "None-Guitar",
  ABGESCHLOSSEN: "Abgeschlossen",
  ABGESCHL_OHNE_BEFUND: "Abgeschl. ohne Befund",
  STORNIERT: "Storniert",
};
export const AUFTRAG_STATUS = AUFTRAG_STATUS_VALUES.map((value) => ({ value, label: AUFTRAG_STATUS_LABEL[value] }));

export const AUFTRAG_STATUS_TONE: Record<AuftragStatus, "neutral" | "blue" | "green" | "amber" | "red" | "violet"> = {
  BACKORDER: "neutral",
  WERKSTATT: "blue",
  BEI_NICL: "blue",
  PROD_FERTIG: "violet",
  SERVICE: "amber",
  NONE_GUITAR: "amber",
  ABGESCHLOSSEN: "green",
  ABGESCHL_OHNE_BEFUND: "green",
  STORNIERT: "red",
};

export const PRODUKTIONSORT_VALUES = ["RODGAU", "HAMBURG"] as const;

export const SCHRITT_STATUS_VALUES = ["OFFEN", "ERLEDIGT", "WARTEN_AUF", "KISTE_VOLLSTAENDIG"] as const;
export type SchrittStatus = (typeof SCHRITT_STATUS_VALUES)[number];
export const SCHRITT_STATUS_LABEL: Record<SchrittStatus, string> = {
  OFFEN: "offen",
  ERLEDIGT: "erledigt",
  WARTEN_AUF: "Warten auf …",
  KISTE_VOLLSTAENDIG: "Kiste vollständig",
};

/** Fortschritt-% → Hintergrundfarbe (6 Stufen, 7h). */
export function fortschrittFarbe(p: number | null | undefined): string {
  if (p == null || p <= 0) return "transparent";
  if (p < 17) return "#eef7ec";
  if (p < 34) return "#d8f0d6";
  if (p < 51) return "#c1e6bf";
  if (p < 68) return "#a9dbaa";
  if (p < 85) return "#8fce93";
  return "#74c07c";
}
