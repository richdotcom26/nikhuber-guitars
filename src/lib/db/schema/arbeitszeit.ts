import { boolean, date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Arbeitszeit-Protokoll der App-Entwicklung (Einstellungen → Arbeitszeit).
 * Ein Eintrag je Arbeitstag; Tagesgrenze 04:00 Uhr (Europe/Berlin), nicht Mitternacht.
 * Befüllt von scripts/arbeitszeit-sync.mjs aus Claude-Code-Sitzungsprotokollen + Git-Commits.
 */
export const arbeitstag = pgTable("arbeitstag", {
  tag: date("tag").primaryKey(),
  beginn: timestamp("beginn", { withTimezone: true }),
  ende: timestamp("ende", { withTimezone: true }),
  minuten: integer("minuten").default(0).notNull(),            // berechnete aktive Arbeitszeit
  zusatzMinuten: integer("zusatz_minuten").default(0).notNull(), // manuell nachgetragen (Arbeit ohne Claude)
  ereignisse: integer("ereignisse").default(0).notNull(),      // Anzahl Protokoll-Ereignisse + Commits (Sync verkleinert nie)
  quelle: text("quelle"),                                      // "Protokoll" | "Git (geschätzt)" | "Protokoll + Git" | "manuell"
  beschreibung: text("beschreibung"),
  beschreibungManuell: boolean("beschreibung_manuell").default(false).notNull(), // true → Sync überschreibt nicht
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
