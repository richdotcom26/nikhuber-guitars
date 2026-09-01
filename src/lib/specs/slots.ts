/**
 * SPEC_SLOTS — die *eine* Definition der Gitarren-Spec-Slots.
 * In Ninox 4× dupliziert (Modellvorlage-Copy, Positions-Generator, Holzpositionen, Specs-Artikelliste).
 * Abgeleitet aus den Aufträge-dchoice/dmulti-Feldern des Ninox-Schemas; Section aus den Formularen.
 *
 * Reine Daten, keine DB-Abhängigkeit — nutzbar im Frontend UND im Service-Layer.
 * `scripts/seed.ts` schreibt das in die Tabelle `spec_slot`.
 */

export type SpecSection = "BODY" | "FINISH_COLOUR" | "NECK" | "ASSEMBLY";

/** artikelgruppe-Enum-Wert, nach dem der Dropdown des Slots filtert. */
export type SpecGruppe =
  | "BODY" | "TOP" | "BACK_TOP" | "BODY_BINDING" | "HOLLOW_BODY" | "BRIDGE_TYPE"
  | "BODY_THICKNESS" | "CNC_CUSTOM" | "LEFTY" | "CNC_PU_CUSTOM"
  | "TOP_FINISH" | "COLOUR" | "BODY_FINISH" | "NECK_FINISH" | "CUSTOM_OPTIONS" | "COLOUR_SET"
  | "NECK" | "FRETBOARD" | "FRETS" | "INLAYS" | "HEADSTOCK" | "HEADSTOCK_INLAY"
  | "NECK_BINDING" | "NECK_CARVE" | "SCALE_LENGTH" | "NECK_OPTIONS"
  | "HARDWARE_COLOUR" | "PU_BRIDGE" | "PU_NECK" | "PU_MID" | "PU_RINGS" | "BRIDGE"
  | "TAILPIECE" | "TUNER" | "TUNER_BUTTONS" | "NUT" | "TRUSSROD_COVER" | "PICKGUARD"
  | "SWITCH" | "SWITCH_TIP" | "POTI_KNOBS" | "BACKPLATE" | "GURT_PINS" | "STRINGS" | "CASE";

export interface SpecSlot {
  key: string;
  caption: string;
  gruppe: SpecGruppe;
  section: SpecSection;
  /** Formularreihenfolge (aus Ninox order). */
  order: number;
  /** hat ein '_K'-Aufpreis-Flag. */
  aufpreis: boolean;
  /** (mehrfach)-Slot — mehrere Artikel möglich. */
  multi: boolean;
  /** Lacey-Act / CITES-relevant (7d). */
  holz: boolean;
}

export const SPEC_SLOTS: readonly SpecSlot[] = [
  // --- BODY ---
  { key: "body",            caption: "Body",            gruppe: "BODY",           section: "BODY", order: 106, aufpreis: true,  multi: false, holz: true  },
  { key: "top",             caption: "Top",             gruppe: "TOP",            section: "BODY", order: 108, aufpreis: true,  multi: false, holz: true  },
  { key: "back_top",        caption: "Back Top",        gruppe: "BACK_TOP",       section: "BODY", order: 110, aufpreis: true,  multi: false, holz: true  },
  { key: "body_binding",    caption: "Body Binding",    gruppe: "BODY_BINDING",   section: "BODY", order: 112, aufpreis: true,  multi: false, holz: false },
  { key: "hollow_body",     caption: "Hollow Body",     gruppe: "HOLLOW_BODY",    section: "BODY", order: 114, aufpreis: true,  multi: false, holz: false },
  { key: "bridge_type",     caption: "Bridge Type",     gruppe: "BRIDGE_TYPE",    section: "BODY", order: 116, aufpreis: true,  multi: false, holz: false },
  { key: "body_thickness",  caption: "Body Thickness",  gruppe: "BODY_THICKNESS", section: "BODY", order: 118, aufpreis: true,  multi: false, holz: false },
  { key: "cnc_custom",      caption: "CNC Custom",      gruppe: "CNC_CUSTOM",     section: "BODY", order: 120, aufpreis: true,  multi: false, holz: false },
  { key: "lefty",           caption: "Lefty",           gruppe: "LEFTY",          section: "BODY", order: 122, aufpreis: true,  multi: false, holz: false },
  { key: "cnc_pu_custom",   caption: "CNC PU Custom",   gruppe: "CNC_PU_CUSTOM",  section: "BODY", order: 124, aufpreis: false, multi: true,  holz: false },
  // --- FINISH / COLOUR ---
  { key: "top_finish",      caption: "Top Finish",      gruppe: "TOP_FINISH",     section: "FINISH_COLOUR", order: 129, aufpreis: true,  multi: false, holz: false },
  { key: "top_colour",      caption: "Top Colour",      gruppe: "COLOUR",         section: "FINISH_COLOUR", order: 131, aufpreis: true,  multi: false, holz: false },
  { key: "body_finish",     caption: "Body Finish",     gruppe: "BODY_FINISH",    section: "FINISH_COLOUR", order: 133, aufpreis: true,  multi: false, holz: false },
  { key: "body_colour",     caption: "Body Colour",     gruppe: "COLOUR",         section: "FINISH_COLOUR", order: 135, aufpreis: true,  multi: false, holz: false },
  { key: "neck_finish",     caption: "Neck Finish",     gruppe: "NECK_FINISH",    section: "FINISH_COLOUR", order: 137, aufpreis: true,  multi: false, holz: false },
  { key: "neck_colour",     caption: "Neck Colour",     gruppe: "COLOUR",         section: "FINISH_COLOUR", order: 139, aufpreis: true,  multi: false, holz: false },
  { key: "custom_options",  caption: "Custom Options",  gruppe: "CUSTOM_OPTIONS", section: "FINISH_COLOUR", order: 142, aufpreis: true,  multi: false, holz: false },
  { key: "colour",          caption: "Colour",          gruppe: "COLOUR",         section: "FINISH_COLOUR", order: 145, aufpreis: true,  multi: false, holz: false },
  { key: "colour_set",      caption: "Colour Set",      gruppe: "COLOUR_SET",     section: "FINISH_COLOUR", order: 147, aufpreis: false, multi: false, holz: false }, // steuert Menge der Colour-Position (1/2/3)
  // --- NECK ---
  { key: "neck",            caption: "Neck",            gruppe: "NECK",           section: "NECK", order: 153, aufpreis: true,  multi: false, holz: true  },
  { key: "fretboard",       caption: "Fretboard",       gruppe: "FRETBOARD",      section: "NECK", order: 155, aufpreis: true,  multi: false, holz: true  },
  { key: "frets",           caption: "Frets",           gruppe: "FRETS",          section: "NECK", order: 157, aufpreis: true,  multi: false, holz: false },
  { key: "inlays",          caption: "Inlays",          gruppe: "INLAYS",         section: "NECK", order: 159, aufpreis: true,  multi: false, holz: false },
  { key: "headstock",       caption: "Headstock",       gruppe: "HEADSTOCK",      section: "NECK", order: 161, aufpreis: true,  multi: false, holz: true  },
  { key: "headstock_inlay", caption: "Headstock Inlay", gruppe: "HEADSTOCK_INLAY",section: "NECK", order: 163, aufpreis: true,  multi: false, holz: false },
  { key: "neck_binding",    caption: "Neck Binding",    gruppe: "NECK_BINDING",   section: "NECK", order: 165, aufpreis: true,  multi: false, holz: false },
  { key: "neck_carve",      caption: "Neck Carve",      gruppe: "NECK_CARVE",     section: "NECK", order: 167, aufpreis: true,  multi: false, holz: false },
  { key: "scale_length",    caption: "Scale Length",    gruppe: "SCALE_LENGTH",   section: "NECK", order: 169, aufpreis: true,  multi: false, holz: false },
  { key: "neck_options",    caption: "Neck Options",    gruppe: "NECK_OPTIONS",   section: "NECK", order: 171, aufpreis: false, multi: true,  holz: false },
  // --- ASSEMBLY ---
  { key: "hardware_colour", caption: "Hardware Colour", gruppe: "HARDWARE_COLOUR",section: "ASSEMBLY", order: 176, aufpreis: true, multi: false, holz: false },
  { key: "pu_bridge",       caption: "PU Bridge",       gruppe: "PU_BRIDGE",      section: "ASSEMBLY", order: 178, aufpreis: true, multi: false, holz: false },
  { key: "pu_neck",         caption: "PU Neck",         gruppe: "PU_NECK",        section: "ASSEMBLY", order: 180, aufpreis: true, multi: false, holz: false },
  { key: "pu_mid",          caption: "PU Mid",          gruppe: "PU_MID",         section: "ASSEMBLY", order: 182, aufpreis: true, multi: false, holz: false },
  { key: "pu_rings",        caption: "PU Rings",        gruppe: "PU_RINGS",       section: "ASSEMBLY", order: 184, aufpreis: true, multi: false, holz: true  },
  { key: "bridge",          caption: "Bridge",          gruppe: "BRIDGE",         section: "ASSEMBLY", order: 186, aufpreis: true, multi: false, holz: false },
  { key: "tailpiece",       caption: "Tailpiece",       gruppe: "TAILPIECE",      section: "ASSEMBLY", order: 188, aufpreis: true, multi: false, holz: false },
  { key: "tuner",           caption: "Tuner",           gruppe: "TUNER",          section: "ASSEMBLY", order: 190, aufpreis: true, multi: false, holz: false },
  { key: "tuner_buttons",   caption: "Tuner Buttons",   gruppe: "TUNER_BUTTONS",  section: "ASSEMBLY", order: 192, aufpreis: true, multi: false, holz: true  },
  { key: "nut",             caption: "Nut",             gruppe: "NUT",            section: "ASSEMBLY", order: 194, aufpreis: true, multi: false, holz: false },
  { key: "trussrod_cover",  caption: "Trussrod Cover",  gruppe: "TRUSSROD_COVER", section: "ASSEMBLY", order: 196, aufpreis: true, multi: false, holz: true  },
  { key: "pickguard",       caption: "Pickguard",       gruppe: "PICKGUARD",      section: "ASSEMBLY", order: 198, aufpreis: true, multi: false, holz: false },
  { key: "switch",          caption: "Switch",          gruppe: "SWITCH",         section: "ASSEMBLY", order: 200, aufpreis: true, multi: false, holz: false },
  { key: "switch_tip",      caption: "Switch Tip",      gruppe: "SWITCH_TIP",     section: "ASSEMBLY", order: 202, aufpreis: true, multi: false, holz: true  },
  { key: "poti_knobs",      caption: "Poti Knobs",      gruppe: "POTI_KNOBS",     section: "ASSEMBLY", order: 204, aufpreis: true, multi: false, holz: true  },
  { key: "backplate",       caption: "Backplate",       gruppe: "BACKPLATE",      section: "ASSEMBLY", order: 206, aufpreis: true, multi: false, holz: true  },
  { key: "gurt_pins",       caption: "Gurt Pins",       gruppe: "GURT_PINS",      section: "ASSEMBLY", order: 208, aufpreis: true, multi: false, holz: false },
  { key: "strings",         caption: "Strings",         gruppe: "STRINGS",        section: "ASSEMBLY", order: 210, aufpreis: true, multi: false, holz: false },
  { key: "case",            caption: "Case",            gruppe: "CASE",           section: "ASSEMBLY", order: 212, aufpreis: true, multi: false, holz: false },
];

export const SPEC_SLOT_BY_KEY: Record<string, SpecSlot> = Object.fromEntries(
  SPEC_SLOTS.map((s) => [s.key, s]),
);

/** Die 12 Lacey-/CITES-relevanten Slots (7d). */
export const HOLZ_SLOT_KEYS: readonly string[] = SPEC_SLOTS.filter((s) => s.holz).map((s) => s.key);

export const SECTIONS: readonly SpecSection[] = ["BODY", "FINISH_COLOUR", "NECK", "ASSEMBLY"];

export const SECTION_LABEL: Record<SpecSection, string> = {
  BODY: "Body",
  FINISH_COLOUR: "Finish / Colour",
  NECK: "Neck",
  ASSEMBLY: "Assembly",
};

/** Slots einer Section, nach order sortiert. */
export function slotsOfSection(section: SpecSection): SpecSlot[] {
  return SPEC_SLOTS.filter((s) => s.section === section).sort((a, b) => a.order - b.order);
}

// Freitexte je Section liegen am Träger (angebot/auftrag/artikel):
//   freitext_body / freitext_colour / freitext_neck / freitext_assembly
