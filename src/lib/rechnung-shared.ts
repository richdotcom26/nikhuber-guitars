/** Client-sichere Rechnungs-Konstanten (kein DB-Zugriff). */

export const RG_BELEGART_VALUES = ["RECHNUNG", "STORNORECHNUNG", "GUTSCHRIFT"] as const;
export type RgBelegart = (typeof RG_BELEGART_VALUES)[number];
export const RG_BELEGART_LABEL: Record<RgBelegart, string> = {
  RECHNUNG: "Rechnung",
  STORNORECHNUNG: "Stornorechnung",
  GUTSCHRIFT: "Gutschrift",
};

export const RG_STATUS_VALUES = [
  "OFFEN", "BEZAHLT", "STORNORECHNUNG", "GUTSCHRIFT", "RG_STORNIERT",
] as const;
export type RgStatus = (typeof RG_STATUS_VALUES)[number];
export const RG_STATUS_LABEL: Record<RgStatus, string> = {
  OFFEN: "Offen",
  BEZAHLT: "Bezahlt",
  STORNORECHNUNG: "Stornorechnung",
  GUTSCHRIFT: "Gutschrift",
  RG_STORNIERT: "Storniert",
};
export const RG_STATUS = RG_STATUS_VALUES.map((value) => ({ value, label: RG_STATUS_LABEL[value] }));
export const RG_STATUS_TONE: Record<RgStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  OFFEN: "amber",
  BEZAHLT: "green",
  STORNORECHNUNG: "red",
  GUTSCHRIFT: "blue",
  RG_STORNIERT: "red",
};

export const ZAHLUNGSSTATUS_VALUES = ["ANGEZAHLT", "TEILZAHLUNG", "BEZAHLT", "ANGEMAHNT"] as const;
export const BANK_VALUES = ["VVB", "CHASE", "PAYPAL"] as const;
