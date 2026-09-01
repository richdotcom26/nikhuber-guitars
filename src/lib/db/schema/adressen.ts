import {
  boolean, integer, numeric, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols, softDelete } from "./_common";
import {
  anredeEnum, apPositionEnum, kontaktartEnum, regionEnum,
  spracheEnum, vertriebswegEnum, waehrungEnum,
} from "./_enums";
import { staat } from "./stammdaten";

/**
 * §3.2 Adressen. Ex MC (103 Felder) → genutzte Kernfelder.
 * region / vertriebsweg / steuerpflichtig / waehrung / sprache / zahlungsbedingung
 * werden beim Setzen von staat_id als DEFAULT abgeleitet (Service, ex 7b),
 * bleiben danach frei editierbar (E7).
 */
export const kunde = pgTable("kunde", {
  id: uuid("id").primaryKey().defaultRandom(),
  kundenNr: text("kunden_nr").unique(),
  kontaktart: kontaktartEnum("kontaktart").notNull(),

  firma: text("firma"),
  vorname: text("vorname"),
  nachname: text("nachname"),
  kurzname: text("kurzname"),
  strasse: text("strasse"),
  adresszusatz: text("adresszusatz"),
  plz: text("plz"),
  ort: text("ort"),
  staatId: uuid("staat_id").references(() => staat.id),

  // abgeleitete Defaults (danach editierbar):
  region: regionEnum("region"),
  vertriebsweg: vertriebswegEnum("vertriebsweg"),
  steuerpflichtig: boolean("steuerpflichtig"),
  waehrung: waehrungEnum("waehrung"),
  sprache: spracheEnum("sprache"),
  zahlungsbedingungId: uuid("zahlungsbedingung_id"), // -> zahlungsbedingung.id (relations)
  ustIdNr: text("ust_id_nr"),

  // Sonderrabatt: manuell eingebbar für Artists/Musiker/besondere Händler.
  // Wenn gesetzt → HAT VORRANG vor der Vertriebsweg-Standardlogik:
  //   einzelpreis = retail-Netto (vk_eur_net bzw. vk_us) * (1 - sonderrabatt_prozent/100)
  sonderrabattProzent: numeric("sonderrabatt_prozent", { precision: 6, scale: 3 }),

  email: text("email"),
  emailRechnungCc: text("email_rechnung_cc"),
  telefon: text("telefon"),
  mobil: text("mobil"),
  url: text("url"),
  briefanrede: text("briefanrede"),          // ex MC.R4
  briefkopfManuell: text("briefkopf_manuell"), // Override; sonst berechnet (Service)

  seriennummerAufRechnung: boolean("seriennummer_auf_rechnung").default(false).notNull(),

  person2Name: text("person2_name"),
  person2Email: text("person2_email"),
  person2Telefon: text("person2_telefon"),
  person2Bemerkung: text("person2_bemerkung"),

  bemerkung: text("bemerkung"),

  // KPIs (Service/Materialized, ex Umsätze-Tab): letzte 12M, je Jahr, Ø Zahldauer — TODO SERVICE
  ...auditCols,
  ...softDelete,
});

/** Ex SE. Ansprechpartner je Kunde. */
export const ansprechpartner = pgTable("ansprechpartner", {
  id: uuid("id").primaryKey().defaultRandom(),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id, { onDelete: "cascade" }),
  anrede: anredeEnum("anrede"),
  vorname: text("vorname"),
  nachname: text("nachname"),
  briefanredeIndividuell: text("briefanrede_individuell"),
  email: text("email"),
  telefon: text("telefon"),
  mobil: text("mobil"),
  telefax: text("telefax"),
  position: apPositionEnum("position"),
  primaereEmail: boolean("primaere_email").default(false).notNull(), // Empfänger AB/Rechnung (7n/7v)
  fuerBriefkopf: boolean("fuer_briefkopf").default(false).notNull(),
  ...auditCols,
});

/** Ex NC / "Weitere Lieferadressen". */
export const lieferadresse = pgTable("lieferadresse", {
  id: uuid("id").primaryKey().defaultRandom(),
  kundeId: uuid("kunde_id").notNull().references(() => kunde.id, { onDelete: "cascade" }),
  nr: integer("nr"),
  firma: text("firma"),
  vorname: text("vorname"),
  nachname: text("nachname"),
  strasse: text("strasse"),
  plz: text("plz"),
  ort: text("ort"),
  land: text("land"),
  ...auditCols,
});
