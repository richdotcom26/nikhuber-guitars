import { sql } from "drizzle-orm";
import {
  boolean, check, integer, pgTable, text, unique, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { artikelgruppeEnum, specSectionEnum } from "./_enums";
import { artikel } from "./artikel";
import { angebot, auftrag } from "./belege";

/**
 * §3.4 Specs.
 *
 * `spec_slot`  = Registry-Tabelle (Metadaten der 47 Spec-Slots). Daten in `src/lib/specs/slots.ts`
 *                (SPEC_SLOTS), Seed via `scripts/seed.ts`.
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
  angebotId: uuid("angebot_id").references(() => angebot.id, { onDelete: "cascade" }),
  auftragId: uuid("auftrag_id").references(() => auftrag.id, { onDelete: "cascade" }),

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

// SPEC_SLOTS-Registry: src/lib/specs/slots.ts
// Freitexte je Abschnitt liegen am Träger (angebot/auftrag/artikel):
//   freitext_body / freitext_colour / freitext_neck / freitext_assembly
