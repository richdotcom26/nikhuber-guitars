import {
  boolean, integer, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { ticketPrioEnum, ticketStatusEnum, ticketTypEnum } from "./_enums";
import { appUser } from "./users";

/**
 * Ticketsystem für die Web-App selbst: Bugs, Wünsche, Fragen.
 * Erfasst Beschreibung, Bearbeiter, Zeitaufwand und einen Kommentar-Verlauf
 * (inkl. Rückfragen). Optionale E-Mail-Benachrichtigung bei „erledigt" und Rückfrage.
 */
export const ticket = pgTable("ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  typ: ticketTypEnum("typ").default("BUG").notNull(),
  titel: text("titel").notNull(),
  beschreibung: text("beschreibung"),
  status: ticketStatusEnum("status").default("NEU").notNull(),
  prioritaet: ticketPrioEnum("prioritaet").default("MITTEL").notNull(),
  erstelltVonId: uuid("erstellt_von_id").references(() => appUser.id),
  zugewiesenAnId: uuid("zugewiesen_an_id").references(() => appUser.id),
  aufwandMinuten: integer("aufwand_minuten"),      // Zeit, die die Umsetzung gekostet hat
  erledigtAm: timestamp("erledigt_am", { withTimezone: true }),
  ...auditCols,
});

export const ticketKommentar = pgTable("ticket_kommentar", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => ticket.id, { onDelete: "cascade" }),
  autorId: uuid("autor_id").references(() => appUser.id),
  text: text("text").notNull(),
  istRueckfrage: boolean("ist_rueckfrage").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
