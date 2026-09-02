import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enum-Katalog (ZIELMODELL §5). Alt-Zahlencodes aus Ninox werden NICHT übernommen —
 * beim Import je Feld auf diese sprechenden Werte gemappt.
 * Werte final gegen die echten Ninox-Choice-Listen abgleichen.
 */

// --- Stammdaten / Adressen -------------------------------------------------
export const regionEnum = pgEnum("region", ["D", "EU", "WELT", "ASIEN", "USA"]);
export const spracheEnum = pgEnum("sprache", ["DE", "EN"]);
export const waehrungEnum = pgEnum("waehrung", ["EUR", "USD"]);
export const kontaktartEnum = pgEnum("kontaktart", [
  "KUNDE", "LIEFERANT", "HAENDLER", "ARTIST", "HOLZHAENDLER", "INDUSTRIE", "SONSTIGE",
]);
export const vertriebswegEnum = pgEnum("vertriebsweg", [
  "NET1", "NET2", "NET_US", "VK_US", "VK_EUR",
]);
export const anredeEnum = pgEnum("anrede", ["HERR", "FRAU", "MR", "MRS"]);
export const apPositionEnum = pgEnum("ap_position", [
  "ALLGEMEIN", "MITARBEITER", "RECHNUNGSKONTAKT",
]);

// --- Artikel -------------------------------------------------------------
// ~55 Werte; "Nut" (24/37) und "Sonstiges" (49/70) dedupliziert.
// Beim Import vervollständigen; hier die im Bestand belegten:
export const artikelgruppeEnum = pgEnum("artikelgruppe", [
  "MODEL",
  "BODY", "TOP", "BACK_TOP", "BODY_FINISH", "BODY_BINDING", "BODY_THICKNESS",
  "COLOUR", "COLOUR_SET", "TOP_FINISH", "TOP_COLOUR", "BODY_COLOUR", "NECK_COLOUR",
  "CUSTOM_OPTIONS", "HOLLOW_BODY", "BRIDGE_TYPE", "CNC_CUSTOM", "CNC_PU_CUSTOM", "LEFTY",
  "NECK", "NECK_FINISH", "NECK_BINDING", "NECK_CARVE", "NECK_OPTIONS", "SCALE_LENGTH",
  "FRETBOARD", "FRETS", "INLAYS", "HEADSTOCK", "HEADSTOCK_INLAY",
  "HARDWARE_COLOUR", "PU_BRIDGE", "PU_NECK", "PU_MID", "PU_RINGS", "PU",
  "BRIDGE", "TAILPIECE", "TUNER", "TUNER_BUTTONS", "NUT", "TRUSSROD_COVER",
  "PICKGUARD", "SWITCH", "SWITCH_TIP", "POTI_KNOBS", "BACKPLATE", "GURT_PINS",
  "STRINGS", "CASE", "FINISH_TYPE",
  "HARDWARE_PARTS", "VERBRAUCHSARTIKEL", "MERCHANDISE", "VERSAND", "RECHNUNG",
  "REPARATUR", "REPLACEMENT_PARTS", "SONSTIGES",
]);
// E9: von 4 Alt-Werten auf 2 reduziert; null = Modell / reine Konfig-/Finish-Option
export const artikeltypEnum = pgEnum("artikeltyp", ["HOLZ", "HANDELSWARE"]);

// --- Specs -------------------------------------------------------------
export const specSectionEnum = pgEnum("spec_section", [
  "BODY", "FINISH_COLOUR", "NECK", "ASSEMBLY",
]);

// --- Belege / Auftrag -------------------------------------------------------
export const angebotStatusEnum = pgEnum("angebot_status", [
  "NEU", "VERSENDET_OFFEN", "AUFTRAG", "VERLOREN", "VERWORFEN",
]);
export const auftragsartEnum = pgEnum("auftragsart", [
  "PRODUKTION", "NONE_GUITAR", "SERVICE",
]);
export const auftragStatusEnum = pgEnum("auftrag_status", [
  "BACKORDER", "WERKSTATT", "BEI_NICL", "PROD_FERTIG", "SERVICE",
  "NONE_GUITAR", "ABGESCHLOSSEN", "ABGESCHL_OHNE_BEFUND", "STORNIERT",
]);
export const produktionsortEnum = pgEnum("produktionsort", ["RODGAU", "HAMBURG"]);
export const zaehlerArtEnum = pgEnum("zaehler_art", ["ANGEBOT", "AUFTRAG", "RECHNUNG"]);

// --- Rechnung / Zahlung -------------------------------------------------------
export const rechnungBelegartEnum = pgEnum("rechnung_belegart", [
  "RECHNUNG", "STORNORECHNUNG", "GUTSCHRIFT",
]);
export const rechnungStatusEnum = pgEnum("rechnung_status", [
  "OFFEN", "BEZAHLT", "STORNORECHNUNG", "GUTSCHRIFT", "RG_STORNIERT",
]);
export const zahlungsstatusEnum = pgEnum("zahlungsstatus", [
  "ANGEZAHLT", "TEILZAHLUNG", "BEZAHLT", "ANGEMAHNT",
]);
export const bankEnum = pgEnum("bank", ["VVB", "CHASE", "PAYPAL"]);

// --- Fertigung -------------------------------------------------------------
export const schrittStatusEnum = pgEnum("schritt_status", [
  "OFFEN", "ERLEDIGT", "WARTEN_AUF", "KISTE_VOLLSTAENDIG",
]);
export const vorratTypEnum = pgEnum("vorrat_typ", ["WERKSTATT", "OFFICE"]);
export const vorratGruppeEnum = pgEnum("vorrat_gruppe", [
  "HOLZAUSWAHL", "HOLZ_VERLEIMEN", "CNC", "HOLZSCHLIFF", "LACKIEREN",
  "OBERFLAECHE", "ENDMONTAGE", "ENDKONTROLLE_VERSAND", "PFUSCH",
]);

// --- Dokumente / Mail -------------------------------------------------------
export const docArtEnum = pgEnum("doc_art", [
  "ANGEBOT", "AUFTRAGSBESTAETIGUNG", "RECHNUNG", "LIEFERSCHEIN",
  "ZERTIFIKAT", "CITES", "LACEY",
]);
export const mailArtEnum = pgEnum("mail_art", [
  "ANGEBOT", "AUFTRAGSBESTAETIGUNG", "RECHNUNG", "GUTSCHRIFT", "SONSTIGES",
  "MAIL_EINGANG", "MAIL_AUSGANG", "TELEFONAT", "ZAHLUNGSERINNERUNG", "LEAD",
]);
export const mailStatusEnum = pgEnum("mail_status", [
  "ENTWURF", "VERSENDET", "FEHLER", "ERFOLG",
]);
export const anhangArtEnum = pgEnum("anhang_art", [
  "BELEG_PDF", "BILD", "CITES", "LACEY", "ZERTIFIKAT", "SONSTIGES",
]);

// --- Holzinventar -------------------------------------------------------
export const holzQualitaetEnum = pgEnum("holz_qualitaet", ["STANDARD", "EXCEPTIONAL"]);
export const holzDickeEnum = pgEnum("holz_dicke", ["DUENN", "DICK"]);
export const holzGroesseEnum = pgEnum("holz_groesse", ["STANDARD", "RIETBERGEN"]);
export const holzPieceEnum = pgEnum("holz_piece", ["EIN_PC", "ZWEI_PC"]);
export const holzVerwendungEnum = pgEnum("holz_verwendung", [
  "TOP", "BODY", "NECK", "FRETBOARD",
]);
export const holzCncEnum = pgEnum("holz_cnc", [
  "STANDARD", "DICK_59", "HOLLOW_BODY", "HONEYCOMB",
]);
export const holzStatusEnum = pgEnum("holz_status", ["FREI", "RESERVIERT", "VERBAUT", "VERKAUFT"]);

// --- Lager / Bestellung / Inventur -------------------------------------------------------
export const bewegungsartEnum = pgEnum("bewegungsart", ["ZUGANG", "ABGANG", "KORREKTUR"]);
export const bestellstatusEnum = pgEnum("bestellstatus", [
  "ENTWURF", "BESTELLT", "TEIL_GELIEFERT", "GELIEFERT",
]);
export const inventurstatusEnum = pgEnum("inventurstatus", ["OFFEN", "ABGESCHLOSSEN"]);
export const einheitEnum = pgEnum("einheit", [
  "STUECK", "KG", "L", "G", "M", "ROLLE", "SATZ", "PAAR", "ML",
]);
export const betriebsmittelKatEnum = pgEnum("betriebsmittel_kat", [
  "SCHLEIFMITTEL", "INLAYS", "KLEBEBAND", "ARBEITSSCHUTZ", "LACK_BEIZE",
  "HILFSMITTEL_LACK", "PACKRAUM", "KLEBER", "MERCH", "ELEKTRONIK",
  "TONABNEHMER", "HARDWARE", "MECHANIK",
]);

// --- ToDo (ex TE ToDo) -------------------------------------------------------------
export const todoPrioEnum = pgEnum("todo_prio", ["DRINGEND", "GELEGENTLICH"]);
export const todoStatusEnum = pgEnum("todo_status", [
  "BESTELLUNG", "IN_ARBEIT", "KLAEREN", "ERLEDIGT",
]);

// --- Benutzer -------------------------------------------------------------
export const rolleEnum = pgEnum("rolle", ["ADMIN", "BUERO", "WERKSTATT"]);
