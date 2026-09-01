import { sql } from "drizzle-orm";
import {
  boolean, integer, numeric, pgTable, primaryKey, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols, softDelete } from "./_common";
import {
  artikelgruppeEnum, artikeltypEnum, betriebsmittelKatEnum, einheitEnum,
} from "./_enums";
import { kunde } from "./adressen";

/**
 * §3.3 Artikel. Ex WB (179 Felder) → Kern.
 * Für Options-Artikel (Nicht-Modell) sind vk_eur/vk_us die AUFPREISE (können negativ sein).
 * Für Modell-Artikel (artikelgruppe = MODEL) sind es die Basispreise.
 */
export const artikel = pgTable("artikel", {
  id: uuid("id").primaryKey().defaultRandom(),
  artikelNr: text("artikel_nr").unique(),        // 'A#####'
  nrLfd: integer("nr_lfd").unique(),             // ex WB.T7 "Nr" — Referenzschlüssel der Spec-Slots (Import!)

  artikelgruppe: artikelgruppeEnum("artikelgruppe").notNull(),
  artikeltyp: artikeltypEnum("artikeltyp"),      // E9: HOLZ | HANDELSWARE | null (Modell/Konfig)

  nameKurz: text("name_kurz"),
  nameLang: text("name_lang"),
  nameBelege: text("name_belege"),              // für Belege (ex WB.X)
  nameZertifikat: text("name_zertifikat"),
  beschreibung: text("beschreibung"),
  bildAssetId: uuid("bild_asset_id"),           // -> anhang.id (relations)

  // Preise Eingabe:
  vkEur: numeric("vk_eur", { precision: 12, scale: 2 }),
  vkUs: numeric("vk_us", { precision: 12, scale: 2 }),
  bruttoFuerNetto: boolean("brutto_fuer_netto").default(false).notNull(),
  nichtRabattierfaehig: boolean("nicht_rabattierfaehig").default(false).notNull(),

  // Preise abgeleitet (ZIELMODELL §6). GENERATED, sofern Postgres den Ausdruck erlaubt;
  // sonst als Service beim Speichern setzen. /1.19 -> ggf. an firma_setting.mwst_satz koppeln (E16).
  // TODO: als GENERATED STORED umsetzen oder Service — je nach dem, ob Subquery auf firma_setting nötig.
  vkEurNet: numeric("vk_eur_net", { precision: 12, scale: 2 }),
  net1: numeric("net1", { precision: 12, scale: 2 }),
  net2: numeric("net2", { precision: 12, scale: 2 }),
  netUs: numeric("net_us", { precision: 12, scale: 2 }),
  usdEurFaktor: numeric("usd_eur_faktor", { precision: 8, scale: 4 })
    .generatedAlwaysAs(sql`CASE WHEN vk_eur IS NOT NULL AND vk_eur <> 0 THEN round(vk_us / vk_eur, 4) END`),

  // Einkauf / Lieferant:
  ekNettoEur: numeric("ek_netto_eur", { precision: 12, scale: 2 }),
  ekNettoUsd: numeric("ek_netto_usd", { precision: 12, scale: 2 }),
  hersteller: text("hersteller"),
  lieferantId: uuid("lieferant_id").references(() => kunde.id), // kontaktart=LIEFERANT
  lieferantArtikelNr: text("lieferant_artikel_nr"),
  bestandMin: numeric("bestand_min", { precision: 12, scale: 3 }),
  bestandMax: numeric("bestand_max", { precision: 12, scale: 3 }),

  // NKS / Holz:
  geschuetztesHolzCites: boolean("geschuetztes_holz_cites").default(false).notNull(), // ex WB.LE
  holzartId: uuid("holzart_id"),               // -> holzart.id (relations); "NKS Holzart"
  gewichtKg: numeric("gewicht_kg", { precision: 10, scale: 3 }),

  datensatzInaktiv: boolean("datensatz_inaktiv").default(false).notNull(), // Archiv (Modell-Liste-Filter, 7x)
  schreibgeschuetzt: boolean("schreibgeschuetzt").default(false).notNull(),
  ...auditCols,
  ...softDelete,
});

/**
 * M:N — "diese Option wird bei folgenden Modellen zur Auswahl angeboten"
 * (ex WB.Z7 Modelselect, 6.3). Nur für Nicht-Modell-Artikel relevant.
 */
export const artikelModell = pgTable("artikel_modell", {
  optionArtikelId: uuid("option_artikel_id").notNull().references(() => artikel.id, { onDelete: "cascade" }),
  modellArtikelId: uuid("modell_artikel_id").notNull().references(() => artikel.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.optionArtikelId, t.modellArtikelId] }),
}));

/**
 * §3.10 Werkstatt-Verbrauchsmaterial. Ex OF Inventar (303 Sätze).
 * NICHT im Artikelstamm/BOM — kein verkaufsfähiges Teil.
 */
export const betriebsmittel = pgTable("betriebsmittel", {
  id: uuid("id").primaryKey().defaultRandom(),
  bezeichnung: text("bezeichnung").notNull(),
  artikelnummer: text("artikelnummer"),
  hersteller: text("hersteller"),
  lieferant: text("lieferant"),
  produktkategorie: betriebsmittelKatEnum("produktkategorie"),
  einheit: einheitEnum("einheit"),
  menge: numeric("menge", { precision: 12, scale: 3 }).default("0").notNull(),
  einkaufspreis: numeric("einkaufspreis", { precision: 12, scale: 2 }),
  wert: numeric("wert", { precision: 12, scale: 2 })
    .generatedAlwaysAs(sql`round(coalesce(menge,0) * coalesce(einkaufspreis,0), 2)`),
  anmerkungen: text("anmerkungen"),
  ...auditCols,
});
