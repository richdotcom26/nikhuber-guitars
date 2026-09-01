import { sql } from "drizzle-orm";
import {
  boolean, date, integer, numeric, pgTable, primaryKey, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { regionEnum, spracheEnum, waehrungEnum, zaehlerArtEnum } from "./_enums";

/**
 * §3.1 Stammdaten / Settings
 * Ex Ninox: Stammdaten (LC) + Allgemein (NF) → ein Singleton.
 */
export const firmaSetting = pgTable("firma_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  firma: text("firma").notNull(),
  strasse: text("strasse"),
  plz: text("plz"),
  ort: text("ort"),
  land: text("land"),
  steuerNr: text("steuer_nr"),
  bank: text("bank"),

  mwstSatz: numeric("mwst_satz", { precision: 6, scale: 3 }).default("19.0").notNull(),
  usdEurFaktor: numeric("usd_eur_faktor", { precision: 8, scale: 4 }).default("0.92").notNull(), // ex 3× hartkodiert + WB.A6

  // Rabatt-%-Sätze für die Artikelstamm-Preispflege (ex NF.N / NF.O / NF.E)
  haendlerrabattNet1: numeric("haendlerrabatt_net1", { precision: 6, scale: 3 }).default("35.0").notNull(),
  haendlerrabattNet2: numeric("haendlerrabatt_net2", { precision: 6, scale: 3 }).default("40.0").notNull(),
  usHaendlerrabatt: numeric("us_haendlerrabatt", { precision: 6, scale: 3 }).default("30.0").notNull(),
  // US-Preisermittlungs-Wasserfall (Kalkulationshilfe, ex NF.B / NF.C / NF.K)
  importFaktor: numeric("import_faktor", { precision: 8, scale: 4 }),
  dollarkursFaktor: numeric("dollarkurs_faktor", { precision: 8, scale: 4 }),
  versandButz: numeric("versand_butz", { precision: 12, scale: 2 }),

  serienStart: integer("serien_start").default(4900).notNull(), // E6: monoton ab hier
  htsCode: text("hts_code").default("92079010").notNull(),        // Lacey (7q)
  laceyUnterzeichner: text("lacey_unterzeichner").default("Elly Müller").notNull(), // (7q)

  kostensatzStunde: numeric("kostensatz_stunde", { precision: 12, scale: 2 }), // Kalkulation (§9.2)
  ...auditCols,
});

/** Ex Staaten (JD), ~52 Länder. */
export const staat = pgTable("staat", {
  id: uuid("id").primaryKey().defaultRandom(),
  kuerzel: text("kuerzel"),          // ISO-2 ("DE", "NL", "US")
  name: text("name").notNull(),
  region: regionEnum("region").notNull(),
  defaultSprache: spracheEnum("default_sprache"),
  defaultWaehrung: waehrungEnum("default_waehrung"),
  defaultZahlungsbedingungId: uuid("default_zahlungsbedingung_id"), // -> zahlungsbedingung.id (relations)
  ...auditCols,
});

/** Ex Zahlungsbedingungen (ED). */
export const zahlungsbedingung = pgTable("zahlungsbedingung", {
  id: uuid("id").primaryKey().defaultRandom(),
  bezeichnung: text("bezeichnung").notNull(),
  bezeichnungEn: text("bezeichnung_en"),
  ...auditCols,
});

/**
 * Belegnummern-Zähler. Ersetzt Ninox `max(counter)+1` + Stammdaten-Startwerte.
 * Vergabe: SELECT ... FOR UPDATE; stand := stand + 1;
 *   nummer := <prefix>-<jahr>-lpad(stand,4,'0')   (AN- / A- / RG-)
 */
export const zaehler = pgTable("zaehler", {
  art: zaehlerArtEnum("art").notNull(),
  jahr: integer("jahr").notNull(),
  stand: integer("stand").default(0).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.art, t.jahr] }),
}));

/**
 * Seriennummer-Sequenz (E6: monoton). Statt Ninox-Lücken-Reuse.
 * `lfd` kommt aus einer Postgres-SEQUENCE `seriennummer_lfd_seq` START WITH <max(bestand)+1> MINVALUE 4900.
 * Gelöschte Seriennummer => Zeile bleibt (auftrag_id = null, geloescht = true) => dauerhafte Lücke.
 */
export const seriennummer = pgTable("seriennummer", {
  id: uuid("id").primaryKey().defaultRandom(),
  lfd: integer("lfd").notNull().unique(),
  jahrPraefix: text("jahr_praefix").notNull(),   // "5" (Jahr <= 2025) | "26" (>= 2026)
  anzeige: text("anzeige").generatedAlwaysAs(sql`jahr_praefix || ' ' || lfd`), // "26 5404"
  auftragId: uuid("auftrag_id"),                  // -> auftrag.id (relations); null = gelöscht/frei
  manuell: boolean("manuell").default(false).notNull(),
  vergebenAm: date("vergeben_am"),
  geloescht: boolean("geloescht").default(false).notNull(),
  ...auditCols,
});
