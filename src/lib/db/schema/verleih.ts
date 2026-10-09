import {
  date, index, integer, numeric, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { kunde } from "./adressen";
import { auftrag } from "./belege";

/**
 * Verleih-/Testgitarren: ein Vorgang = eine Gitarre (Auftrag mit Besonderes „Verleih-/Testgitarre")
 * geht an einen Kontakt (kunde) und kommt zurück. Übergabevereinbarung als PDF, optional per Link
 * elektronisch unterschrieben (einfache elektronische Signatur: Name + Unterschrift + Zeitstempel + IP).
 */
export const verleih = pgTable("verleih", {
  id: uuid("id").primaryKey().defaultRandom(),
  auftragId: uuid("auftrag_id").notNull().references(() => auftrag.id),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id),
  versendetAm: date("versendet_am"),
  verfuegbarBis: date("verfuegbar_bis"),            // Rückgabe spätestens (aus der Übergabevereinbarung)
  zurueckAm: date("zurueck_am"),
  zweck: text("zweck"),                             // z. B. Test, Messe, Endorsement
  zubehoer: text("zubehoer"),                       // z. B. Koffer, Gurt
  wert: numeric("wert", { precision: 12, scale: 2 }), // Wert der Gitarre (Haftung/Versicherung), EUR
  bemerkung: text("bemerkung"),
  // Übergabevereinbarung / elektronische Unterschrift
  vereinbarungAnhangId: uuid("vereinbarung_anhang_id"),     // zuletzt erzeugtes PDF (ohne Unterschrift)
  unterschriftToken: text("unterschrift_token").unique(),   // geheimer Link /unterschrift/<token>
  unterschriftAngefordertAm: timestamp("unterschrift_angefordert_am", { withTimezone: true }),
  unterschriebenAm: timestamp("unterschrieben_am", { withTimezone: true }),
  unterschriebenName: text("unterschrieben_name"),
  unterschriftIp: text("unterschrift_ip"),
  unterschriebenAnhangId: uuid("unterschrieben_anhang_id"), // unterschriebenes PDF
  // Erinnerungen
  letzteErinnerungAm: timestamp("letzte_erinnerung_am", { withTimezone: true }),
  erinnerungen: integer("erinnerungen").default(0).notNull(),
  ...auditCols,
}, (t) => ({
  auftragIdx: index("verleih_auftrag_idx").on(t.auftragId),
  kundeIdx: index("verleih_kunde_idx").on(t.kundeId),
}));

/**
 * Auftrags-Verlauf (Protokoll): Statuswechsel, Bauplandatum, Auftragsbestätigung gesendet/unterschrieben …
 * Nur anfügen, nie ändern. Abgeleitete Daten (Werkstattbeginn, Endmontage, Rechnung, Zahlung) kommen
 * zusätzlich live aus den Belegen (lib/domain/auftrag-verlauf).
 */
export const auftragEreignis = pgTable("auftrag_ereignis", {
  id: uuid("id").primaryKey().defaultRandom(),
  auftragId: uuid("auftrag_id").notNull().references(() => auftrag.id, { onDelete: "cascade" }),
  art: text("art").notNull(),          // STATUS | BAUPLAN | AB_GESENDET | AB_UNTERSCHRIEBEN | …
  von: text("von"),
  nach: text("nach"),
  text: text("text"),
  zeit: timestamp("zeit", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id"),
}, (t) => ({ auftragIdx: index("auftrag_ereignis_auftrag_idx").on(t.auftragId, t.zeit) }));
