/** Client- und serverseitig nutzbare Artikel-Helfer (kein DB-Zugriff). */

/** Muss mit `artikelgruppeEnum` in src/lib/db/schema/_enums.ts übereinstimmen. */
export const ARTIKELGRUPPE_VALUES = [
  "MODEL",
  "BODY", "TOP", "BACK_TOP", "BODY_FINISH", "BODY_BINDING", "BODY_THICKNESS",
  "COLOUR", "COLOUR_SET", "TOP_FINISH", "TOP_COLOUR", "BODY_COLOUR", "NECK_COLOUR",
  "CUSTOM_OPTIONS", "HOLLOW_BODY", "BRIDGE_TYPE", "CNC_CUSTOM", "CNC_PU_CUSTOM", "LEFTY",
  "NECK", "NECK_FINISH", "NECK_BINDING", "NECK_CARVE", "NECK_OPTIONS", "SCALE_LENGTH",
  "FRETBOARD", "FRETS", "INLAYS", "HEADSTOCK", "HEADSTOCK_INLAY",
  "HARDWARE_COLOUR", "PU_BRIDGE", "PU_NECK", "PU_MID", "PU_RINGS", "PU",
  "BRIDGE", "TAILPIECE", "TUNER", "TUNER_BUTTONS", "NUT", "TRUSSROD_COVER",
  "PICKGUARD", "SWITCH", "SWITCH_TIP", "POTI_KNOBS", "BACKPLATE", "GURT_PINS",
  "STRINGS", "CASE", "FINISH_TYPE",
  "HARDWARE_PARTS", "VERBRAUCHSARTIKEL", "MERCHANDISE", "VERSAND", "RECHNUNG",
  "REPARATUR", "REPLACEMENT_PARTS", "SONSTIGES",
] as const;
export type ArtikelgruppeValue = (typeof ARTIKELGRUPPE_VALUES)[number];

/** Artikelgruppe-Enum-Wert → Anzeigetext ("PU_BRIDGE" → "PU Bridge"). */
export function gruppeLabel(v: string | null | undefined): string {
  if (!v) return "–";
  return v
    .split("_")
    .map((w) => (w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

export const ARTIKELTYP_LABEL: Record<string, string> = {
  HOLZ: "Holz / Fertigung",
  HANDELSWARE: "Handelsware / Lager",
};

/** Anzeigename eines Artikels. */
export function artikelName(a: {
  nameBelege?: string | null; nameLang?: string | null; nameKurz?: string | null;
}): string {
  return a.nameBelege?.trim() || a.nameLang?.trim() || a.nameKurz?.trim() || "–";
}
