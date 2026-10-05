/** Client-sichere Rechnungs-Konstanten (kein DB-Zugriff). */

/** Belegtyp. „Gutschrift" heißt jetzt Rechnungskorrektur (umsatzsteuerlich sauberer, § 14 Abs. 2 UStG). */
export const RG_BELEGART_VALUES = ["RECHNUNG", "STORNORECHNUNG", "RECHNUNGSKORREKTUR"] as const;
export type RgBelegart = (typeof RG_BELEGART_VALUES)[number];
export const RG_BELEGART_LABEL: Record<RgBelegart, string> = {
  RECHNUNG: "Rechnung",
  STORNORECHNUNG: "Stornorechnung",
  RECHNUNGSKORREKTUR: "Rechnungskorrektur",
};

/** Aktive Status: ENTWURF (frei editierbar, ohne Nummer) → GEBUCHT (gesperrt) → BEZAHLT / STORNIERT. */
export const RG_STATUS_VALUES = ["ENTWURF", "GEBUCHT", "BEZAHLT", "STORNIERT"] as const;
export type RgStatus = (typeof RG_STATUS_VALUES)[number];
export const RG_STATUS_LABEL: Record<RgStatus, string> = {
  ENTWURF: "Entwurf",
  GEBUCHT: "Gebucht",
  BEZAHLT: "Bezahlt",
  STORNIERT: "Storniert",
};
export const RG_STATUS = RG_STATUS_VALUES.map((value) => ({ value, label: RG_STATUS_LABEL[value] }));
export const RG_STATUS_TONE: Record<RgStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  ENTWURF: "neutral",
  GEBUCHT: "amber",
  BEZAHLT: "green",
  STORNIERT: "red",
};

export const ZAHLUNGSSTATUS_VALUES = ["ANGEZAHLT", "TEILZAHLUNG", "BEZAHLT", "ANGEMAHNT"] as const;
export const BANK_VALUES = ["VVB", "CHASE", "PAYPAL"] as const;
