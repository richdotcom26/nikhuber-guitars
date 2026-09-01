import { sql } from "drizzle-orm";
import {
  boolean, check, integer, pgTable, text, unique, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { artikelgruppeEnum, specSectionEnum } from "./_enums";
import { artikel } from "./artikel";

/**
 * §3.4 Specs.
 *
 * `spec_slot`  = Registry-Tabelle (Metadaten der ~47 Spec-Slots). Wird aus SPEC_SLOTS geseedet
 *                und im Frontend als Konstante gespiegelt (/lib/specs).
 * `spec_belegung` = die konkrete Slot-Belegung — EINE Tabelle für Modell-Defaults UND Beleg-Specs
 *                   (E3). Copy/Generate/View laufen als `INSERT … SELECT` / `SELECT` darüber.
 */

export const specSlot = pgTable("spec_slot", {
  key: text("key").primaryKey(),                         // 'body', 'pu_bridge', …
  caption: text("caption").notNull(),                    // 'Body', 'PU Bridge'
  captionEn: text("caption_en"),
  gruppe: artikelgruppeEnum("gruppe").notNull(),         // Dropdown-Filter: artikel.artikelgruppe = gruppe
  section: specSectionEnum("section").notNull(),         // BODY | FINISH_COLOUR | NECK | ASSEMBLY
  reihenfolge: integer("reihenfolge").notNull(),         // Formularreihenfolge (aus Ninox order)
  aufpreisMoeglich: boolean("aufpreis_moeglich").default(true).notNull(), // hat '_K'-Flag
  mehrfach: boolean("mehrfach").default(false).notNull(),                 // (mehrfach)-Slot
  holz: boolean("holz").default(false).notNull(),        // Lacey/CITES-relevant (7d)
});

export const specBelegung = pgTable("spec_belegung", {
  id: uuid("id").primaryKey().defaultRandom(),
  // genau EIN Träger:
  modellArtikelId: uuid("modell_artikel_id").references(() => artikel.id, { onDelete: "cascade" }),
  angebotId: uuid("angebot_id"),   // -> angebot.id (relations, onDelete cascade)
  auftragId: uuid("auftrag_id"),   // -> auftrag.id (relations, onDelete cascade)

  slotKey: text("slot_key").notNull().references(() => specSlot.key),
  artikelId: uuid("artikel_id").notNull().references(() => artikel.id),
  aufpreis: boolean("aufpreis").default(false).notNull(),   // ex '<Slot>_K'
  reihenfolge: integer("reihenfolge").default(0).notNull(), // für mehrfach-Slots
  ...auditCols,
}, (t) => ({
  oneParent: check(
    "spec_belegung_one_parent",
    sql`((${t.modellArtikelId} IS NOT NULL)::int + (${t.angebotId} IS NOT NULL)::int + (${t.auftragId} IS NOT NULL)::int) = 1`,
  ),
  // Nicht-mehrfach-Slots: max. 1 Belegung je Träger+Slot (Teil-Unique via Index — TODO in Migration:
  //   CREATE UNIQUE INDEX ... WHERE slot ist nicht mehrfach). Hier nur Doku.
  uqModell: unique("spec_belegung_uq_modell").on(t.modellArtikelId, t.slotKey, t.reihenfolge),
  uqAngebot: unique("spec_belegung_uq_angebot").on(t.angebotId, t.slotKey, t.reihenfolge),
  uqAuftrag: unique("spec_belegung_uq_auftrag").on(t.auftragId, t.slotKey, t.reihenfolge),
}));

/**
 * SPEC_SLOTS — die eine Definition (Ninox dupliziert sie 4×).
 * Abgeleitet aus den Aufträge-dchoice/dmulti-Feldern (schema.json). Section aus den Ninox-Formularen.
 * Seed für `spec_slot` + Spiegel in /lib/specs/slots.ts.
 */
export const SPEC_SLOTS = [
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
] as const;

export const HOLZ_SLOT_KEYS = SPEC_SLOTS.filter((s) => s.holz).map((s) => s.key);
// = body, top, back_top, neck, fretboard, headstock, tuner_buttons,
//   trussrod_cover, switch_tip, pu_rings, poti_knobs, backplate   (12, 7d)

// Freitexte je Abschnitt liegen am Träger (angebot/auftrag/artikel):
//   freitext_body / freitext_colour / freitext_neck / freitext_assembly
