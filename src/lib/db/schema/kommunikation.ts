import {
  boolean, date, integer, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import {
  anhangArtEnum, docArtEnum, mailArtEnum, mailStatusEnum, spracheEnum,
} from "./_enums";
import { angebot, auftrag, rechnung } from "./belege";
import { kunde } from "./adressen";

/**
 * §3.8 Kommunikation / Dokumente.
 * Beleg-Renderer `renderBeleg(record, profil)` erzeugt PDF (+ ZUGFeRD) in einer Vercel Function.
 */

export const belegTemplate = pgTable("beleg_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  belegart: docArtEnum("belegart").notNull(),
  name: text("name").notNull(),
  html: text("html").notNull(),          // Handlebars; Sprache + Steuerblock via {{#if}}
  aktiv: boolean("aktiv").default(true).notNull(),
  ...auditCols,
});

export const mailTemplate = pgTable("mail_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  belegart: docArtEnum("belegart").notNull(),
  sprache: spracheEnum("sprache").notNull(),
  betreff: text("betreff"),
  bodyHtml: text("body_html"),           // Platzhalter {{briefanrede}} {{auftragsnummer}} {{model}} {{rechnungsnummer}}
  ...auditCols,
});

export const mailversand = pgTable("mailversand", {
  id: uuid("id").primaryKey().defaultRandom(),
  art: mailArtEnum("art").notNull(),
  status: mailStatusEnum("status").default("ENTWURF").notNull(),
  angebotId: uuid("angebot_id").references(() => angebot.id, { onDelete: "set null" }),
  auftragId: uuid("auftrag_id").references(() => auftrag.id, { onDelete: "set null" }),
  rechnungId: uuid("rechnung_id").references(() => rechnung.id, { onDelete: "set null" }),
  kundeId: uuid("kunde_id").references(() => kunde.id),
  an: text("an"),
  cc: text("cc"),
  bcc: text("bcc"),
  betreff: text("betreff"),
  bodyHtml: text("body_html"),
  wiedervorlage: date("wiedervorlage"),
  ...auditCols,   // erzeugen != senden — Versand ist separater Schritt
});

export const anhang = pgTable("anhang", {
  id: uuid("id").primaryKey().defaultRandom(),
  mailversandId: uuid("mailversand_id").references(() => mailversand.id, { onDelete: "cascade" }),
  angebotId: uuid("angebot_id").references(() => angebot.id, { onDelete: "cascade" }),
  auftragId: uuid("auftrag_id").references(() => auftrag.id, { onDelete: "cascade" }),
  rechnungId: uuid("rechnung_id").references(() => rechnung.id, { onDelete: "cascade" }),
  art: anhangArtEnum("art"),
  dateiname: text("dateiname"),
  pfad: text("pfad"),                    // Supabase-Storage-Key
  groesse: integer("groesse"),
  mime: text("mime"),
  ...auditCols,
});
