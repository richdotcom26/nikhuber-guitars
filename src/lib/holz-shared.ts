/** Client-sichere Holzbestand-Konstanten (kein DB-Zugriff). */

export const HOLZ_STATUS_VALUES = ["FREI", "RESERVIERT", "VERBAUT", "VERKAUFT"] as const;
export type HolzStatus = (typeof HOLZ_STATUS_VALUES)[number];
export const HOLZ_STATUS_LABEL: Record<HolzStatus, string> = {
  FREI: "Frei",
  RESERVIERT: "Reserviert",
  VERBAUT: "Verbaut",
  VERKAUFT: "Verkauft",
};
export const HOLZ_STATUS = HOLZ_STATUS_VALUES.map((value) => ({ value, label: HOLZ_STATUS_LABEL[value] }));
export const HOLZ_STATUS_TONE: Record<HolzStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  FREI: "green",
  RESERVIERT: "amber",
  VERBAUT: "neutral",
  VERKAUFT: "blue",
};

export const HOLZ_QUALITAET = [
  { value: "STANDARD", label: "Standard" },
  { value: "EXCEPTIONAL", label: "Exceptional" },
] as const;
export const HOLZ_DICKE = [
  { value: "DUENN", label: "Dünn" },
  { value: "DICK", label: "Dick" },
] as const;
export const HOLZ_GROESSE = [
  { value: "STANDARD", label: "Standard" },
  { value: "RIETBERGEN", label: "Rietbergen" },
] as const;
export const HOLZ_PIECE = [
  { value: "EIN_PC", label: "1pc" },
  { value: "ZWEI_PC", label: "2pc" },
] as const;
export const HOLZ_VERWENDUNG = [
  { value: "TOP", label: "Top" },
  { value: "BODY", label: "Body" },
  { value: "NECK", label: "Neck" },
  { value: "FRETBOARD", label: "Fretboard" },
] as const;
export const HOLZ_CNC = [
  { value: "STANDARD", label: "Standard" },
  { value: "DICK_59", label: "59 dick" },
  { value: "HOLLOW_BODY", label: "Hollow Body" },
  { value: "HONEYCOMB", label: "Honeycomb" },
] as const;

/** Scan-/QR-fähigen Inventar-Code erzeugen (5 Zeichen, ohne verwechselbare 0/O/1/I). */
export function neueInventarId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
