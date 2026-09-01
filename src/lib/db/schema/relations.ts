import { relations } from "drizzle-orm";
import { staat, zahlungsbedingung, seriennummer } from "./stammdaten";
import { kunde, ansprechpartner, lieferadresse } from "./adressen";
import { artikel, artikelModell } from "./artikel";
import { specSlot, specBelegung } from "./specs";
import { angebot, auftrag, rechnung, belegPosition } from "./belege";
import { arbeitsschrittVorrat, arbeitsschritt } from "./fertigung";
import { holzart, holzVolumen } from "./compliance";
import {
  lagerort, holzInventar, lagerbestand, lagerbewegung,
  bestellung, bestellposition, inventur, inventurposition,
} from "./lager";
import { belegTemplate, mailversand, anhang } from "./kommunikation";
import { modellKalkulation } from "./planung";
import { appUser } from "./users";

/**
 * Drizzle-Relations für die `db.query.*`-API.
 * Nur Domänen-Navigation. `created_by`/`updated_by` → app_user sind NICHT verdrahtet
 * (bei Bedarf manuell joinen).
 */

// ---------------------------------------------------------------- Stammdaten
export const staatRelations = relations(staat, ({ one, many }) => ({
  defaultZahlungsbedingung: one(zahlungsbedingung, {
    fields: [staat.defaultZahlungsbedingungId],
    references: [zahlungsbedingung.id],
  }),
  kunden: many(kunde),
}));

export const zahlungsbedingungRelations = relations(zahlungsbedingung, ({ many }) => ({
  staaten: many(staat),
  kunden: many(kunde),
}));

export const seriennummerRelations = relations(seriennummer, ({ one }) => ({
  auftrag: one(auftrag, { fields: [seriennummer.auftragId], references: [auftrag.id] }),
}));

// ---------------------------------------------------------------- Adressen
export const kundeRelations = relations(kunde, ({ one, many }) => ({
  staat: one(staat, { fields: [kunde.staatId], references: [staat.id] }),
  zahlungsbedingung: one(zahlungsbedingung, {
    fields: [kunde.zahlungsbedingungId], references: [zahlungsbedingung.id],
  }),
  ansprechpartner: many(ansprechpartner),
  lieferadressen: many(lieferadresse),
  angebote: many(angebot),
  auftraege: many(auftrag),
  rechnungen: many(rechnung),
  artikelAlsLieferant: many(artikel, { relationName: "artikel_lieferant" }),
  holzInventar: many(holzInventar, { relationName: "holz_haendler" }),
  bestellungen: many(bestellung),
  mailversand: many(mailversand),
}));

export const ansprechpartnerRelations = relations(ansprechpartner, ({ one }) => ({
  kunde: one(kunde, { fields: [ansprechpartner.kundeId], references: [kunde.id] }),
}));

export const lieferadresseRelations = relations(lieferadresse, ({ one }) => ({
  kunde: one(kunde, { fields: [lieferadresse.kundeId], references: [kunde.id] }),
}));

// ---------------------------------------------------------------- Artikel
export const artikelRelations = relations(artikel, ({ one, many }) => ({
  lieferant: one(kunde, {
    fields: [artikel.lieferantId], references: [kunde.id], relationName: "artikel_lieferant",
  }),
  holzart: one(holzart, { fields: [artikel.holzartId], references: [holzart.id] }),
  // Modell-Zuordnung (M:N über artikel_modell), beide Richtungen:
  angebotenBeiModellen: many(artikelModell, { relationName: "am_option" }),
  optionenDiesesModells: many(artikelModell, { relationName: "am_modell" }),
  // Spec-Belegungen: als gewählter Spec-Artikel vs. als Modell-Default-Träger:
  specVerwendungen: many(specBelegung, { relationName: "spec_artikel" }),
  modellSpecs: many(specBelegung, { relationName: "spec_modell" }),
  holzVolumen: many(holzVolumen),
  kalkulation: one(modellKalkulation),
  belegPositionen: many(belegPosition),
  lagerbestand: one(lagerbestand),
  lagerbewegungen: many(lagerbewegung),
  bestellpositionen: many(bestellposition),
  inventurpositionen: many(inventurposition),
}));

export const artikelModellRelations = relations(artikelModell, ({ one }) => ({
  option: one(artikel, {
    fields: [artikelModell.optionArtikelId], references: [artikel.id], relationName: "am_option",
  }),
  modell: one(artikel, {
    fields: [artikelModell.modellArtikelId], references: [artikel.id], relationName: "am_modell",
  }),
}));

// ---------------------------------------------------------------- Specs
export const specSlotRelations = relations(specSlot, ({ many }) => ({
  belegungen: many(specBelegung),
}));

export const specBelegungRelations = relations(specBelegung, ({ one }) => ({
  slot: one(specSlot, { fields: [specBelegung.slotKey], references: [specSlot.key] }),
  artikel: one(artikel, {
    fields: [specBelegung.artikelId], references: [artikel.id], relationName: "spec_artikel",
  }),
  modellArtikel: one(artikel, {
    fields: [specBelegung.modellArtikelId], references: [artikel.id], relationName: "spec_modell",
  }),
  angebot: one(angebot, { fields: [specBelegung.angebotId], references: [angebot.id] }),
  auftrag: one(auftrag, { fields: [specBelegung.auftragId], references: [auftrag.id] }),
}));

// ---------------------------------------------------------------- Belege
export const angebotRelations = relations(angebot, ({ one, many }) => ({
  kunde: one(kunde, { fields: [angebot.kundeId], references: [kunde.id] }),
  kdStaat: one(staat, { fields: [angebot.kdStaatId], references: [staat.id] }),
  modellArtikel: one(artikel, { fields: [angebot.modellArtikelId], references: [artikel.id] }),
  drucktemplate: one(belegTemplate, {
    fields: [angebot.drucktemplateId], references: [belegTemplate.id],
  }),
  erzeugtAusAuftrag: one(auftrag, {
    fields: [angebot.erzeugtAusAuftragId], references: [auftrag.id], relationName: "angebot_aus_auftrag",
  }),
  positionen: many(belegPosition),
  specBelegungen: many(specBelegung),
  mailversand: many(mailversand),
  anhaenge: many(anhang),
}));

export const auftragRelations = relations(auftrag, ({ one, many }) => ({
  kunde: one(kunde, { fields: [auftrag.kundeId], references: [kunde.id] }),
  kdStaat: one(staat, { fields: [auftrag.kdStaatId], references: [staat.id] }),
  modellArtikel: one(artikel, { fields: [auftrag.modellArtikelId], references: [artikel.id] }),
  drucktemplate: one(belegTemplate, {
    fields: [auftrag.drucktemplateId], references: [belegTemplate.id],
  }),
  seriennummer: one(seriennummer, {
    fields: [auftrag.seriennummerId], references: [seriennummer.id],
  }),
  positionen: many(belegPosition),
  specBelegungen: many(specBelegung),
  arbeitsschritte: many(arbeitsschritt),
  rechnungen: many(rechnung),
  mailversand: many(mailversand),
  anhaenge: many(anhang),
  erzeugteAngebote: many(angebot, { relationName: "angebot_aus_auftrag" }),
  reserviertesHolz: many(holzInventar, { relationName: "holz_reserviert" }),
}));

export const rechnungRelations = relations(rechnung, ({ one, many }) => ({
  kunde: one(kunde, { fields: [rechnung.kundeId], references: [kunde.id] }),
  kdStaat: one(staat, { fields: [rechnung.kdStaatId], references: [staat.id] }),
  modellArtikel: one(artikel, { fields: [rechnung.modellArtikelId], references: [artikel.id] }),
  drucktemplate: one(belegTemplate, {
    fields: [rechnung.drucktemplateId], references: [belegTemplate.id],
  }),
  auftrag: one(auftrag, { fields: [rechnung.auftragId], references: [auftrag.id] }),
  referenzRechnung: one(rechnung, {
    fields: [rechnung.referenzRechnungId], references: [rechnung.id], relationName: "rechnung_referenz",
  }),
  abgeleiteteRechnungen: many(rechnung, { relationName: "rechnung_referenz" }),
  positionen: many(belegPosition),
  mailversand: many(mailversand),
  anhaenge: many(anhang),
}));

export const belegPositionRelations = relations(belegPosition, ({ one }) => ({
  angebot: one(angebot, { fields: [belegPosition.angebotId], references: [angebot.id] }),
  auftrag: one(auftrag, { fields: [belegPosition.auftragId], references: [auftrag.id] }),
  rechnung: one(rechnung, { fields: [belegPosition.rechnungId], references: [rechnung.id] }),
  artikel: one(artikel, { fields: [belegPosition.artikelId], references: [artikel.id] }),
}));

// ---------------------------------------------------------------- Fertigung
export const arbeitsschrittVorratRelations = relations(arbeitsschrittVorrat, ({ many }) => ({
  schritte: many(arbeitsschritt),
}));

export const arbeitsschrittRelations = relations(arbeitsschritt, ({ one }) => ({
  auftrag: one(auftrag, { fields: [arbeitsschritt.auftragId], references: [auftrag.id] }),
  vorrat: one(arbeitsschrittVorrat, {
    fields: [arbeitsschritt.vorratId], references: [arbeitsschrittVorrat.id],
  }),
  erledigtVon: one(appUser, {
    fields: [arbeitsschritt.erledigtVonId], references: [appUser.id],
  }),
}));

// ---------------------------------------------------------------- Compliance / Holz
export const holzartRelations = relations(holzart, ({ many }) => ({
  artikel: many(artikel),
  volumen: many(holzVolumen),
  inventar: many(holzInventar),
}));

export const holzVolumenRelations = relations(holzVolumen, ({ one }) => ({
  artikel: one(artikel, { fields: [holzVolumen.artikelId], references: [artikel.id] }),
}));

// ---------------------------------------------------------------- Lager
export const lagerortRelations = relations(lagerort, ({ many }) => ({
  holzInventar: many(holzInventar),
}));

export const holzInventarRelations = relations(holzInventar, ({ one }) => ({
  holzart: one(holzart, { fields: [holzInventar.holzartId], references: [holzart.id] }),
  lagerort: one(lagerort, { fields: [holzInventar.lagerortId], references: [lagerort.id] }),
  reserviertFuerAuftrag: one(auftrag, {
    fields: [holzInventar.reserviertFuerAuftragId], references: [auftrag.id],
    relationName: "holz_reserviert",
  }),
  holzhaendler: one(kunde, {
    fields: [holzInventar.holzhaendlerId], references: [kunde.id], relationName: "holz_haendler",
  }),
}));

export const lagerbestandRelations = relations(lagerbestand, ({ one }) => ({
  artikel: one(artikel, { fields: [lagerbestand.artikelId], references: [artikel.id] }),
}));

export const lagerbewegungRelations = relations(lagerbewegung, ({ one }) => ({
  artikel: one(artikel, { fields: [lagerbewegung.artikelId], references: [artikel.id] }),
  auftrag: one(auftrag, { fields: [lagerbewegung.auftragId], references: [auftrag.id] }),
  bestellung: one(bestellung, { fields: [lagerbewegung.bestellungId], references: [bestellung.id] }),
  inventur: one(inventur, { fields: [lagerbewegung.inventurId], references: [inventur.id] }),
}));

export const bestellungRelations = relations(bestellung, ({ one, many }) => ({
  lieferant: one(kunde, { fields: [bestellung.lieferantId], references: [kunde.id] }),
  positionen: many(bestellposition),
  bewegungen: many(lagerbewegung),
}));

export const bestellpositionRelations = relations(bestellposition, ({ one }) => ({
  bestellung: one(bestellung, {
    fields: [bestellposition.bestellungId], references: [bestellung.id],
  }),
  artikel: one(artikel, { fields: [bestellposition.artikelId], references: [artikel.id] }),
}));

export const inventurRelations = relations(inventur, ({ many }) => ({
  positionen: many(inventurposition),
  bewegungen: many(lagerbewegung),
}));

export const inventurpositionRelations = relations(inventurposition, ({ one }) => ({
  inventur: one(inventur, { fields: [inventurposition.inventurId], references: [inventur.id] }),
  artikel: one(artikel, { fields: [inventurposition.artikelId], references: [artikel.id] }),
}));

// ---------------------------------------------------------------- Kommunikation
export const belegTemplateRelations = relations(belegTemplate, ({ many }) => ({
  angebote: many(angebot),
  auftraege: many(auftrag),
  rechnungen: many(rechnung),
}));

export const mailversandRelations = relations(mailversand, ({ one, many }) => ({
  angebot: one(angebot, { fields: [mailversand.angebotId], references: [angebot.id] }),
  auftrag: one(auftrag, { fields: [mailversand.auftragId], references: [auftrag.id] }),
  rechnung: one(rechnung, { fields: [mailversand.rechnungId], references: [rechnung.id] }),
  kunde: one(kunde, { fields: [mailversand.kundeId], references: [kunde.id] }),
  anhaenge: many(anhang),
}));

export const anhangRelations = relations(anhang, ({ one }) => ({
  mailversand: one(mailversand, {
    fields: [anhang.mailversandId], references: [mailversand.id],
  }),
  angebot: one(angebot, { fields: [anhang.angebotId], references: [angebot.id] }),
  auftrag: one(auftrag, { fields: [anhang.auftragId], references: [auftrag.id] }),
  rechnung: one(rechnung, { fields: [anhang.rechnungId], references: [rechnung.id] }),
}));

// ---------------------------------------------------------------- Planung
export const modellKalkulationRelations = relations(modellKalkulation, ({ one }) => ({
  artikel: one(artikel, { fields: [modellKalkulation.artikelId], references: [artikel.id] }),
}));

// ---------------------------------------------------------------- Benutzer
export const appUserRelations = relations(appUser, ({ many }) => ({
  erledigteSchritte: many(arbeitsschritt),
}));
