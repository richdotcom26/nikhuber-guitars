import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean, check, date, index, integer, numeric, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import {
  angebotStatusEnum, auftragStatusEnum, auftragsartEnum, bankEnum,
  produktionsortEnum, rechnungBelegartEnum, rechnungStatusEnum,
  regionEnum, spracheEnum, vertriebswegEnum, waehrungEnum, zahlungsstatusEnum,
} from "./_enums";
import { artikel } from "./artikel";
import { kunde } from "./adressen";
import { seriennummer, staat } from "./stammdaten";

/**
 * §3.5 Belege. Drei Header-Tabellen (Auftrag = Fertigung, Rechnung = Zahlung),
 * gemeinsame Kinder `beleg_position` (E4) und `spec_belegung` (E3).
 *
 * Kunden-SNAPSHOT (kd_*) wird beim Kundenwählen eingefroren — behebt die Ninox-Inkonsistenz
 * (Angebot snapshottet, Auftrag nicht). Zusätzlich `kunde_id` für Navigation.
 * Summen: Service (`/lib/domain`) berechnet + schreibt bei jeder Positions-/Rabattänderung (E5).
 */

// gemeinsame Snapshot-/Kopf-Spalten (Konvention, in allen drei Header-Tabellen).
// FACTORY: pro Tabelle frische Column-Builder — geteilte Builder-Instanzen mit .unique()/.references()
// würden sonst denselben Constraint-Namen dreimal erzeugen.
const kopf = () => ({
  nummer: text("nummer").notNull(),  // 'AN-2026-2544' / 'A-2026-4773' / 'RG-2026-3722'
  // NICHT unique: Ninox-Altbestand hat Dubletten. Neuvergabe ist über `zaehler` eindeutig (Service).
  kundeId: uuid("kunde_id").references(() => kunde.id),
  kdFirma: text("kd_firma"),
  kdVorname: text("kd_vorname"),
  kdNachname: text("kd_nachname"),
  kdStrasse: text("kd_strasse"),
  kdPlz: text("kd_plz"),
  kdOrt: text("kd_ort"),
  kdStaatId: uuid("kd_staat_id").references(() => staat.id),
  kdRegion: regionEnum("kd_region"),
  kdWaehrung: waehrungEnum("kd_waehrung"),
  kdSprache: spracheEnum("kd_sprache"),
  kdUstId: text("kd_ust_id"),
  kdSteuerpflichtig: boolean("kd_steuerpflichtig"),
  kdVertriebsweg: vertriebswegEnum("kd_vertriebsweg"),
  kdSonderrabattProzent: numeric("kd_sonderrabatt_prozent", { precision: 6, scale: 3 }), // Snapshot; Vorrang vor Vertriebsweg (§6)
  kdBriefkopf: text("kd_briefkopf"),

  modellArtikelId: uuid("modell_artikel_id").references(() => artikel.id), // ex MODELLARTIKEL

  freitextBody: text("freitext_body"),
  freitextColour: text("freitext_colour"),
  freitextNeck: text("freitext_neck"),
  freitextAssembly: text("freitext_assembly"),

  // Summen (Service):
  summePositionen: numeric("summe_positionen", { precision: 12, scale: 2 }),
  gesamtrabattProzent: numeric("gesamtrabatt_prozent", { precision: 6, scale: 3 }).default("0").notNull(),
  gesamtrabattWert: numeric("gesamtrabatt_wert", { precision: 12, scale: 2 }).default("0").notNull(),
  gesamtrabattAktiv: boolean("gesamtrabatt_aktiv").default(false).notNull(),
  summeNetto: numeric("summe_netto", { precision: 12, scale: 2 }),
  summeMwst: numeric("summe_mwst", { precision: 12, scale: 2 }),
  summeBrutto: numeric("summe_brutto", { precision: 12, scale: 2 }),

  drucktemplateId: uuid("drucktemplate_id"),               // -> beleg_template.id (relations)
});

// -------------------------------------------------------------------- ANGEBOT
export const angebot = pgTable("angebot", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...kopf(),
  status: angebotStatusEnum("status").default("NEU").notNull(),
  angebotsdatum: date("angebotsdatum"),
  kopftext: text("kopftext"),                              // "Angebots Text"
  erzeugtAusAuftragId: uuid("erzeugt_aus_auftrag_id")
    .references((): AnyPgColumn => auftrag.id),             // echte FK statt Freitext (7m)
  positionenAnzeigen: boolean("positionen_anzeigen").default(false).notNull(),
  schreibschutz: boolean("schreibschutz").default(false).notNull(),
  ...auditCols,
}, (t) => ({ nummerIdx: index("angebot_nummer_idx").on(t.nummer) }));

// -------------------------------------------------------------------- AUFTRAG
export const auftrag = pgTable("auftrag", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...kopf(),
  auftragsart: auftragsartEnum("auftragsart").default("PRODUKTION").notNull(),
  status: auftragStatusEnum("status").default("BACKORDER").notNull(),
  angebotId: uuid("angebot_id").references((): AnyPgColumn => angebot.id), // ex String "Übernahme aus Angebot" (7e)
  auftragsdatum: date("auftragsdatum"),
  prio: integer("prio"),
  besonderes: text("besonderes"),                          // ex GF (nur 1 Satz) → Freitext/Enum, TODO
  spezialauftrag: text("spezialauftrag"),                  // TODO: Enum?
  produktionsort: produktionsortEnum("produktionsort"),

  bauplandatum: date("bauplandatum"),                      // Monatserster (7i)
  // 'YYYY/MM' aus bauplandatum — Service setzt beim Speichern (to_char ist nicht IMMUTABLE,
  // taugt daher nicht als GENERATED-Spalte). Filterfeld der Auftragsliste (7c) → Index.
  bauplanMonat: text("bauplan_monat"),

  seriennummerId: uuid("seriennummer_id").references(() => seriennummer.id),

  // Fertigungs-Fortschritt (Service, 7h):
  fortschrittProzent: integer("fortschritt_prozent"),
  standHeWert: numeric("stand_he_wert", { precision: 12, scale: 2 }),   // = umsatzerwartung * fortschritt/100 (7h — Bug-frei neu)
  arbeitsstunden: numeric("arbeitsstunden", { precision: 8, scale: 2 }), // Σ arbeitsschritt.dauer_minuten/60 (E13)
  umsatzerwartung: numeric("umsatzerwartung", { precision: 12, scale: 2 }), // EUR-normiert (7k)

  // CITES / Compliance (Service, 7d/7j):
  citesArtikelanzahl: integer("cites_artikelanzahl").default(0).notNull(),
  citesDokumentnr: text("cites_dokumentnr"),
  wiederausfuhrNoneeu: boolean("wiederausfuhr_noneeu"),
  gesamtgewichtHolzKg: numeric("gesamtgewicht_holz_kg", { precision: 10, scale: 3 }),
  gesamtgewichtBrazrwKg: numeric("gesamtgewicht_brazrw_kg", { precision: 10, scale: 3 }),
  citesDokumentAssetId: uuid("cites_dokument_asset_id"),
  laceyDokumentAssetId: uuid("lacey_dokument_asset_id"),
  zertifikatAssetId: uuid("zertifikat_asset_id"),
  lieferscheinAssetId: uuid("lieferschein_asset_id"),

  // Zeitstempel:
  werkstattbeginn: date("werkstattbeginn"),
  endmontagedatum: date("endmontagedatum"),
  versanddatum: date("versanddatum"),
  rechnungsdatum: date("rechnungsdatum"),
  zahlungsdatum: date("zahlungsdatum"),
  sernrVergebenAm: date("sernr_vergeben_am"),
  modellvorlageVergebenAt: timestamp("modellvorlage_vergeben_at", { withTimezone: true }),
  schreibschutz: boolean("schreibschutz").default(false).notNull(),

  anzahlung: numeric("anzahlung", { precision: 12, scale: 2 }),
  endrechnungVorab: boolean("endrechnung_vorab").default(false).notNull(),
  positionenAnzeigen: boolean("positionen_anzeigen").default(false).notNull(),
  ...auditCols,
}, (t) => ({ nummerIdx: index("auftrag_nummer_idx").on(t.nummer) }));

// -------------------------------------------------------------------- RECHNUNG
export const rechnung = pgTable("rechnung", {
  id: uuid("id").primaryKey().defaultRandom(),
  ...kopf(),
  belegart: rechnungBelegartEnum("belegart").default("RECHNUNG").notNull(),
  status: rechnungStatusEnum("status").default("OFFEN").notNull(),
  zahlungsstatus: zahlungsstatusEnum("zahlungsstatus"),
  rechnungsdatum: date("rechnungsdatum"),
  lieferdatum: date("lieferdatum"),
  auftragId: uuid("auftrag_id").references(() => auftrag.id),      // echte FK (BC.G1)
  referenzRechnungId: uuid("referenz_rechnung_id")
    .references((): AnyPgColumn => rechnung.id),                   // Storno/Gutschrift -> Original
  teilgutschrift: boolean("teilgutschrift").default(false).notNull(), // GUTSCHRIFT-Untervariante (Ninox: Nummernpräfix "TGS")
  // Nummer bei Storno/Gutschrift = Präfix (S/GS/TGS) + Original.nummer — verbraucht keinen zaehler.

  anzahlungBeruecksichtigen: boolean("anzahlung_beruecksichtigen").default(false).notNull(),
  anzahlungBrutto: numeric("anzahlung_brutto", { precision: 12, scale: 2 }),
  anzahlungDatum: date("anzahlung_datum"),
  rechnungsbetrag: numeric("rechnungsbetrag", { precision: 12, scale: 2 }),  // Brutto - Anzahlung

  // Zahlung — MANUELL erfasst (Rolle BUERO, "Johannes"); keine Bank-Anbindung.
  zahlungsdatum: date("zahlungsdatum"),
  zahlbetrag: numeric("zahlbetrag", { precision: 12, scale: 2 }),
  zahlungAnBank: bankEnum("zahlung_an_bank"),
  differenzZahlung: numeric("differenz_zahlung", { precision: 12, scale: 2 }), // Service: zahlbetrag - rechnungsbetrag
  abzugProzent: numeric("abzug_prozent", { precision: 6, scale: 3 }),          // Skonto/Abzug

  gebuchtBeimSteuerbuero: boolean("gebucht_beim_steuerbuero").default(false).notNull(), // sperrt Positions-Änderung (7v)
  reportMonat: text("report_monat"),                              // 'YYYY-MM' -> Reporting
  bemerkungRechnung: text("bemerkung_rechnung"),

  // E-Rechnung (7dd): erzeugtes ZUGFeRD-PDF unveränderbar archivieren
  erechnungAssetId: uuid("erechnung_asset_id"),
  ...auditCols,
}, (t) => ({ nummerIdx: index("rechnung_nummer_idx").on(t.nummer) }));

// -------------------------------------------------------------- BELEG_POSITION
export const belegPosition = pgTable("beleg_position", {
  id: uuid("id").primaryKey().defaultRandom(),
  angebotId: uuid("angebot_id").references(() => angebot.id, { onDelete: "cascade" }),
  auftragId: uuid("auftrag_id").references(() => auftrag.id, { onDelete: "cascade" }),
  rechnungId: uuid("rechnung_id").references(() => rechnung.id, { onDelete: "cascade" }),

  posNr: integer("pos_nr"),
  artikelId: uuid("artikel_id").references(() => artikel.id),       // ex 'ARTIKEL AUSWÄHLEN'
  artikelName: text("artikel_name"),                                // Snapshot (name_belege)
  artikelBeschreibung: text("artikel_beschreibung"),                // Snapshot
  anzahl: numeric("anzahl", { precision: 10, scale: 2 }).default("1").notNull(),
  einzelpreis: numeric("einzelpreis", { precision: 12, scale: 2 }), // eingefroren (§6)
  rabattProzent: numeric("rabatt_prozent", { precision: 6, scale: 3 }).default("0").notNull(), // pro Zeile
  gesamtpreis: numeric("gesamtpreis", { precision: 12, scale: 2 })
    .generatedAlwaysAs(sql`round(coalesce(anzahl,0) * coalesce(einzelpreis,0) * (1 - coalesce(rabatt_prozent,0) / 100), 2)`),
  reRelevant: boolean("re_relevant").default(true).notNull(),       // Druck/Summen/Nummerierung
  vkRetailWert: numeric("vk_retail_wert", { precision: 12, scale: 2 }),
  herkunftSlotKey: text("herkunft_slot_key"),                       // welcher Spec-Slot diese Position erzeugte
  ...auditCols,
}, (t) => ({
  oneParent: check(
    "beleg_position_one_parent",
    sql`((${t.angebotId} IS NOT NULL)::int + (${t.auftragId} IS NOT NULL)::int + (${t.rechnungId} IS NOT NULL)::int) = 1`,
  ),
}));
