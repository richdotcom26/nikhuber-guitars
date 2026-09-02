/** Client-sichere Betriebsmittel-Konstanten (kein DB-Zugriff). */

export const BM_KATEGORIE_VALUES = [
  "SCHLEIFMITTEL", "INLAYS", "KLEBEBAND", "ARBEITSSCHUTZ", "LACK_BEIZE",
  "HILFSMITTEL_LACK", "PACKRAUM", "KLEBER", "MERCH", "ELEKTRONIK",
  "TONABNEHMER", "HARDWARE", "MECHANIK",
] as const;
export type BmKategorie = (typeof BM_KATEGORIE_VALUES)[number];

export const BM_KATEGORIE_LABEL: Record<BmKategorie, string> = {
  SCHLEIFMITTEL: "Schleifmittel",
  INLAYS: "Inlays",
  KLEBEBAND: "Klebeband",
  ARBEITSSCHUTZ: "Arbeitsschutz",
  LACK_BEIZE: "Lack / Beize",
  HILFSMITTEL_LACK: "Hilfsmittel Lack",
  PACKRAUM: "Packraum",
  KLEBER: "Kleber / Leime",
  MERCH: "Merch",
  ELEKTRONIK: "Elektronik",
  TONABNEHMER: "Tonabnehmer",
  HARDWARE: "Hardwareteile",
  MECHANIK: "Mechanik",
};
export const BM_KATEGORIE = BM_KATEGORIE_VALUES.map((value) => ({ value, label: BM_KATEGORIE_LABEL[value] }));

export const EINHEIT_VALUES = [
  "STUECK", "KG", "L", "G", "M", "ROLLE", "SATZ", "PAAR", "ML",
] as const;
export type Einheit = (typeof EINHEIT_VALUES)[number];

export const EINHEIT_LABEL: Record<Einheit, string> = {
  STUECK: "Stück",
  KG: "kg",
  L: "l",
  G: "g",
  M: "m",
  ROLLE: "Rolle",
  SATZ: "Satz",
  PAAR: "Paar",
  ML: "ml",
};
export const EINHEIT = EINHEIT_VALUES.map((value) => ({ value, label: EINHEIT_LABEL[value] }));
