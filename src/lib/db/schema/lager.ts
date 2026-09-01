import { sql } from "drizzle-orm";
import {
  boolean, date, integer, numeric, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import {
  bestellstatusEnum, bewegungsartEnum, holzCncEnum, holzDickeEnum,
  holzGroesseEnum, holzPieceEnum, holzQualitaetEnum, holzStatusEnum,
  holzVerwendungEnum, inventurstatusEnum,
} from "./_enums";
import { artikel } from "./artikel";
import { holzart } from "./compliance";
import { kunde } from "./adressen";
import { auftrag } from "./belege";

/**
 * §3.9 Holzinventar (physische Blanks — ex FF Holzbestand, 33 Felder)
 * §3.10 Lagerhaltung / Bestellung / Inventur (nur artikeltyp = HANDELSWARE)
 */

export const lagerort = pgTable("lagerort", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  bezeichnung: text("bezeichnung"),
  ...auditCols,
});

export const holzInventar = pgTable("holz_inventar", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventarId: text("inventar_id").notNull().unique(),          // scan-/QR-fähig ('JFYNY')
  holzartId: uuid("holzart_id").references(() => holzart.id),
  unterart: text("unterart"),
  struktur: text("struktur"),
  qualitaet: holzQualitaetEnum("qualitaet"),
  dicke: holzDickeEnum("dicke"),
  groesse: holzGroesseEnum("groesse"),
  piece: holzPieceEnum("piece"),
  fuer: holzVerwendungEnum("fuer"),                            // ex X1 multi {Top|Body|Neck|Fretboard} — TODO: multi?
  cnc: holzCncEnum("cnc"),
  gewichtG: integer("gewicht_g"),
  besonderes: text("besonderes"),
  bemerkung: text("bemerkung"),
  eingangAm: date("eingang_am"),
  lagerortId: uuid("lagerort_id").references(() => lagerort.id),
  status: holzStatusEnum("status").default("FREI").notNull(),
  statusGeaendertAm: date("status_geaendert_am"),
  reserviertFuerAuftragId: uuid("reserviert_fuer_auftrag_id").references(() => auftrag.id),
  holzhaendlerId: uuid("holzhaendler_id").references(() => kunde.id), // kontaktart=HOLZHAENDLER
  einkaufspreis: numeric("einkaufspreis", { precision: 12, scale: 2 }),
  profitMargin: numeric("profit_margin", { precision: 12, scale: 2 }),
  verkaufspreis: numeric("verkaufspreis", { precision: 12, scale: 2 }),
  bildAssetId: uuid("bild_asset_id"),
  qrAssetId: uuid("qr_asset_id"),
  ...auditCols,
});

// ---- Lagerhaltung (Handelsware) ----
export const lagerbestand = pgTable("lagerbestand", {
  artikelId: uuid("artikel_id").primaryKey().references(() => artikel.id, { onDelete: "cascade" }),
  menge: numeric("menge", { precision: 12, scale: 3 }).default("0").notNull(),
  // alternativ als View über lagerbewegung — Entscheidung beim Bau
});

export const lagerbewegung = pgTable("lagerbewegung", {
  id: uuid("id").primaryKey().defaultRandom(),
  artikelId: uuid("artikel_id").notNull().references(() => artikel.id),
  menge: numeric("menge", { precision: 12, scale: 3 }).notNull(),
  art: bewegungsartEnum("art").notNull(),
  auftragId: uuid("auftrag_id").references(() => auftrag.id),
  bestellungId: uuid("bestellung_id"),   // -> bestellung.id (relations)
  inventurId: uuid("inventur_id"),       // -> inventur.id (relations)
  datum: date("datum").defaultNow().notNull(),
  bemerkung: text("bemerkung"),
  ...auditCols,
});

export const bestellung = pgTable("bestellung", {
  id: uuid("id").primaryKey().defaultRandom(),
  lieferantId: uuid("lieferant_id").notNull().references(() => kunde.id),
  status: bestellstatusEnum("status").default("ENTWURF").notNull(),
  bestelldatum: date("bestelldatum"),
  lieferdatumErwartet: date("lieferdatum_erwartet"),
  bemerkung: text("bemerkung"),
  ...auditCols,
});

export const bestellposition = pgTable("bestellposition", {
  id: uuid("id").primaryKey().defaultRandom(),
  bestellungId: uuid("bestellung_id").notNull().references(() => bestellung.id, { onDelete: "cascade" }),
  artikelId: uuid("artikel_id").notNull().references(() => artikel.id),
  menge: numeric("menge", { precision: 12, scale: 3 }).notNull(),
  ekPreis: numeric("ek_preis", { precision: 12, scale: 2 }),
  mengeGeliefert: numeric("menge_geliefert", { precision: 12, scale: 3 }).default("0").notNull(),
});

export const inventur = pgTable("inventur", {
  id: uuid("id").primaryKey().defaultRandom(),
  stichtag: date("stichtag").notNull(),
  status: inventurstatusEnum("status").default("OFFEN").notNull(),
  bemerkung: text("bemerkung"),
  ...auditCols,
});

export const inventurposition = pgTable("inventurposition", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventurId: uuid("inventur_id").notNull().references(() => inventur.id, { onDelete: "cascade" }),
  artikelId: uuid("artikel_id").notNull().references(() => artikel.id),
  sollMenge: numeric("soll_menge", { precision: 12, scale: 3 }),
  istMenge: numeric("ist_menge", { precision: 12, scale: 3 }),
  differenz: numeric("differenz", { precision: 12, scale: 3 })
    .generatedAlwaysAs(sql`coalesce(ist_menge,0) - coalesce(soll_menge,0)`),
});

/*
Bestellvorschlag = VIEW:
CREATE VIEW bestellvorschlag AS
SELECT a.id AS artikel_id, a.name_belege, a.lieferant_id,
       lb.menge AS bestand, a.bestand_min, a.bestand_max,
       (coalesce(a.bestand_max,0) - coalesce(lb.menge,0)) AS vorschlagsmenge
FROM   artikel a
LEFT   JOIN lagerbestand lb ON lb.artikel_id = a.id
WHERE  a.artikeltyp = 'HANDELSWARE'
  AND  coalesce(lb.menge,0) < coalesce(a.bestand_min,0);
*/
