CREATE TYPE "public"."angebot_status" AS ENUM('NEU', 'VERSENDET_OFFEN', 'AUFTRAG', 'VERLOREN', 'VERWORFEN');--> statement-breakpoint
CREATE TYPE "public"."anhang_art" AS ENUM('BELEG_PDF', 'BILD', 'CITES', 'LACEY', 'ZERTIFIKAT', 'SONSTIGES');--> statement-breakpoint
CREATE TYPE "public"."anrede" AS ENUM('HERR', 'FRAU', 'MR', 'MRS');--> statement-breakpoint
CREATE TYPE "public"."ap_position" AS ENUM('ALLGEMEIN', 'MITARBEITER', 'RECHNUNGSKONTAKT');--> statement-breakpoint
CREATE TYPE "public"."artikelgruppe" AS ENUM('MODEL', 'BODY', 'TOP', 'BACK_TOP', 'BODY_FINISH', 'BODY_BINDING', 'BODY_THICKNESS', 'COLOUR', 'COLOUR_SET', 'TOP_FINISH', 'TOP_COLOUR', 'BODY_COLOUR', 'NECK_COLOUR', 'CUSTOM_OPTIONS', 'HOLLOW_BODY', 'BRIDGE_TYPE', 'CNC_CUSTOM', 'CNC_PU_CUSTOM', 'LEFTY', 'NECK', 'NECK_FINISH', 'NECK_BINDING', 'NECK_CARVE', 'NECK_OPTIONS', 'SCALE_LENGTH', 'FRETBOARD', 'FRETS', 'INLAYS', 'HEADSTOCK', 'HEADSTOCK_INLAY', 'HARDWARE_COLOUR', 'PU_BRIDGE', 'PU_NECK', 'PU_MID', 'PU_RINGS', 'PU', 'BRIDGE', 'TAILPIECE', 'TUNER', 'TUNER_BUTTONS', 'NUT', 'TRUSSROD_COVER', 'PICKGUARD', 'SWITCH', 'SWITCH_TIP', 'POTI_KNOBS', 'BACKPLATE', 'GURT_PINS', 'STRINGS', 'CASE', 'FINISH_TYPE', 'HARDWARE_PARTS', 'VERBRAUCHSARTIKEL', 'MERCHANDISE', 'VERSAND', 'RECHNUNG', 'REPARATUR', 'REPLACEMENT_PARTS', 'SONSTIGES');--> statement-breakpoint
CREATE TYPE "public"."artikeltyp" AS ENUM('HOLZ', 'HANDELSWARE');--> statement-breakpoint
CREATE TYPE "public"."auftrag_status" AS ENUM('BACKORDER', 'WERKSTATT', 'BEI_NICL', 'PROD_FERTIG', 'SERVICE', 'NONE_GUITAR', 'ABGESCHLOSSEN', 'ABGESCHL_OHNE_BEFUND', 'STORNIERT');--> statement-breakpoint
CREATE TYPE "public"."auftragsart" AS ENUM('PRODUKTION', 'NONE_GUITAR', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."bank" AS ENUM('VVB', 'CHASE', 'PAYPAL');--> statement-breakpoint
CREATE TYPE "public"."bestellstatus" AS ENUM('ENTWURF', 'BESTELLT', 'TEIL_GELIEFERT', 'GELIEFERT');--> statement-breakpoint
CREATE TYPE "public"."betriebsmittel_kat" AS ENUM('SCHLEIFMITTEL', 'INLAYS', 'KLEBEBAND', 'ARBEITSSCHUTZ', 'LACK_BEIZE', 'HILFSMITTEL_LACK', 'PACKRAUM', 'KLEBER', 'MERCH', 'ELEKTRONIK', 'TONABNEHMER', 'HARDWARE', 'MECHANIK');--> statement-breakpoint
CREATE TYPE "public"."bewegungsart" AS ENUM('ZUGANG', 'ABGANG', 'KORREKTUR');--> statement-breakpoint
CREATE TYPE "public"."doc_art" AS ENUM('ANGEBOT', 'AUFTRAGSBESTAETIGUNG', 'RECHNUNG', 'LIEFERSCHEIN', 'ZERTIFIKAT', 'CITES', 'LACEY');--> statement-breakpoint
CREATE TYPE "public"."einheit" AS ENUM('STUECK', 'KG', 'L', 'G', 'M', 'ROLLE', 'SATZ', 'PAAR', 'ML');--> statement-breakpoint
CREATE TYPE "public"."holz_cnc" AS ENUM('STANDARD', 'DICK_59', 'HOLLOW_BODY', 'HONEYCOMB');--> statement-breakpoint
CREATE TYPE "public"."holz_dicke" AS ENUM('DUENN', 'DICK');--> statement-breakpoint
CREATE TYPE "public"."holz_groesse" AS ENUM('STANDARD', 'RIETBERGEN');--> statement-breakpoint
CREATE TYPE "public"."holz_piece" AS ENUM('EIN_PC', 'ZWEI_PC');--> statement-breakpoint
CREATE TYPE "public"."holz_qualitaet" AS ENUM('STANDARD', 'EXCEPTIONAL');--> statement-breakpoint
CREATE TYPE "public"."holz_status" AS ENUM('FREI', 'RESERVIERT', 'VERBAUT', 'VERKAUFT');--> statement-breakpoint
CREATE TYPE "public"."holz_verwendung" AS ENUM('TOP', 'BODY', 'NECK', 'FRETBOARD');--> statement-breakpoint
CREATE TYPE "public"."inventurstatus" AS ENUM('OFFEN', 'ABGESCHLOSSEN');--> statement-breakpoint
CREATE TYPE "public"."kontaktart" AS ENUM('KUNDE', 'LIEFERANT', 'HAENDLER', 'ARTIST', 'HOLZHAENDLER', 'INDUSTRIE', 'SONSTIGE');--> statement-breakpoint
CREATE TYPE "public"."mail_art" AS ENUM('ANGEBOT', 'AUFTRAGSBESTAETIGUNG', 'RECHNUNG', 'GUTSCHRIFT', 'SONSTIGES', 'MAIL_EINGANG', 'MAIL_AUSGANG', 'TELEFONAT', 'ZAHLUNGSERINNERUNG', 'LEAD');--> statement-breakpoint
CREATE TYPE "public"."mail_status" AS ENUM('ENTWURF', 'VERSENDET', 'FEHLER', 'ERFOLG');--> statement-breakpoint
CREATE TYPE "public"."produktionsort" AS ENUM('RODGAU', 'HAMBURG');--> statement-breakpoint
CREATE TYPE "public"."rechnung_belegart" AS ENUM('RECHNUNG', 'STORNORECHNUNG', 'GUTSCHRIFT');--> statement-breakpoint
CREATE TYPE "public"."rechnung_status" AS ENUM('OFFEN', 'BEZAHLT', 'STORNORECHNUNG', 'GUTSCHRIFT', 'RG_STORNIERT');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('D', 'EU', 'WELT', 'ASIEN', 'USA');--> statement-breakpoint
CREATE TYPE "public"."rolle" AS ENUM('ADMIN', 'BUERO', 'WERKSTATT');--> statement-breakpoint
CREATE TYPE "public"."schritt_status" AS ENUM('OFFEN', 'ERLEDIGT', 'WARTEN_AUF', 'KISTE_VOLLSTAENDIG');--> statement-breakpoint
CREATE TYPE "public"."spec_section" AS ENUM('BODY', 'FINISH_COLOUR', 'NECK', 'ASSEMBLY');--> statement-breakpoint
CREATE TYPE "public"."sprache" AS ENUM('DE', 'EN');--> statement-breakpoint
CREATE TYPE "public"."todo_prio" AS ENUM('DRINGEND', 'GELEGENTLICH');--> statement-breakpoint
CREATE TYPE "public"."todo_status" AS ENUM('BESTELLUNG', 'IN_ARBEIT', 'KLAEREN', 'ERLEDIGT');--> statement-breakpoint
CREATE TYPE "public"."vertriebsweg" AS ENUM('NET1', 'NET2', 'NET_US', 'VK_US', 'VK_EUR');--> statement-breakpoint
CREATE TYPE "public"."vorrat_gruppe" AS ENUM('HOLZAUSWAHL', 'HOLZ_VERLEIMEN', 'CNC', 'HOLZSCHLIFF', 'LACKIEREN', 'OBERFLAECHE', 'ENDMONTAGE', 'ENDKONTROLLE_VERSAND', 'PFUSCH');--> statement-breakpoint
CREATE TYPE "public"."vorrat_typ" AS ENUM('WERKSTATT', 'OFFICE');--> statement-breakpoint
CREATE TYPE "public"."waehrung" AS ENUM('EUR', 'USD');--> statement-breakpoint
CREATE TYPE "public"."zaehler_art" AS ENUM('ANGEBOT', 'AUFTRAG', 'RECHNUNG');--> statement-breakpoint
CREATE TYPE "public"."zahlungsstatus" AS ENUM('ANGEZAHLT', 'TEILZAHLUNG', 'BEZAHLT', 'ANGEMAHNT');--> statement-breakpoint
CREATE TABLE "firma_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firma" text NOT NULL,
	"strasse" text,
	"plz" text,
	"ort" text,
	"land" text,
	"steuer_nr" text,
	"bank" text,
	"mwst_satz" numeric(6, 3) DEFAULT '19.0' NOT NULL,
	"usd_eur_faktor" numeric(8, 4) DEFAULT '0.92' NOT NULL,
	"haendlerrabatt_net1" numeric(6, 3) DEFAULT '35.0' NOT NULL,
	"haendlerrabatt_net2" numeric(6, 3) DEFAULT '40.0' NOT NULL,
	"us_haendlerrabatt" numeric(6, 3) DEFAULT '30.0' NOT NULL,
	"import_faktor" numeric(8, 4),
	"dollarkurs_faktor" numeric(8, 4),
	"versand_butz" numeric(12, 2),
	"serien_start" integer DEFAULT 4900 NOT NULL,
	"hts_code" text DEFAULT '92079010' NOT NULL,
	"lacey_unterzeichner" text DEFAULT 'Elly Müller' NOT NULL,
	"kostensatz_stunde" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "seriennummer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lfd" integer NOT NULL,
	"jahr_praefix" text NOT NULL,
	"anzeige" text GENERATED ALWAYS AS ((jahr_praefix || ' ' || lfd::text)) STORED,
	"auftrag_id" uuid,
	"manuell" boolean DEFAULT false NOT NULL,
	"vergeben_am" date,
	"geloescht" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "seriennummer_praefix_lfd_uq" UNIQUE("jahr_praefix","lfd")
);
--> statement-breakpoint
CREATE TABLE "staat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kuerzel" text,
	"name" text NOT NULL,
	"region" "region" NOT NULL,
	"default_sprache" "sprache",
	"default_waehrung" "waehrung",
	"default_zahlungsbedingung_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "zaehler" (
	"art" "zaehler_art" NOT NULL,
	"jahr" integer NOT NULL,
	"stand" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "zaehler_art_jahr_pk" PRIMARY KEY("art","jahr")
);
--> statement-breakpoint
CREATE TABLE "zahlungsbedingung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bezeichnung" text NOT NULL,
	"bezeichnung_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ansprechpartner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunde_id" uuid NOT NULL,
	"anrede" "anrede",
	"vorname" text,
	"nachname" text,
	"briefanrede_individuell" text,
	"email" text,
	"telefon" text,
	"mobil" text,
	"telefax" text,
	"position" "ap_position",
	"primaere_email" boolean DEFAULT false NOT NULL,
	"fuer_briefkopf" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "kunde" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunden_nr" text,
	"kontaktart" "kontaktart" NOT NULL,
	"firma" text,
	"vorname" text,
	"nachname" text,
	"kurzname" text,
	"strasse" text,
	"adresszusatz" text,
	"plz" text,
	"ort" text,
	"staat_id" uuid,
	"region" "region",
	"vertriebsweg" "vertriebsweg",
	"steuerpflichtig" boolean,
	"waehrung" "waehrung",
	"sprache" "sprache",
	"zahlungsbedingung_id" uuid,
	"ust_id_nr" text,
	"sonderrabatt_prozent" numeric(6, 3),
	"email" text,
	"email_rechnung_cc" text,
	"telefon" text,
	"mobil" text,
	"url" text,
	"briefanrede" text,
	"briefkopf_manuell" text,
	"seriennummer_auf_rechnung" boolean DEFAULT false NOT NULL,
	"person2_name" text,
	"person2_email" text,
	"person2_telefon" text,
	"person2_bemerkung" text,
	"bemerkung" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lieferadresse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kunde_id" uuid NOT NULL,
	"nr" integer,
	"firma" text,
	"vorname" text,
	"nachname" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"land" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "artikel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artikel_nr" text,
	"nr_lfd" integer,
	"artikelgruppe" "artikelgruppe" NOT NULL,
	"artikeltyp" "artikeltyp",
	"name_kurz" text,
	"name_lang" text,
	"name_belege" text,
	"name_zertifikat" text,
	"beschreibung" text,
	"bild_asset_id" uuid,
	"freitext_body" text,
	"freitext_colour" text,
	"freitext_neck" text,
	"freitext_assembly" text,
	"vk_eur" numeric(12, 2),
	"vk_us" numeric(12, 2),
	"brutto_fuer_netto" boolean DEFAULT false NOT NULL,
	"nicht_rabattierfaehig" boolean DEFAULT false NOT NULL,
	"vk_eur_net" numeric(12, 2),
	"net1" numeric(12, 2),
	"net2" numeric(12, 2),
	"net_us" numeric(12, 2),
	"usd_eur_faktor" numeric(8, 4) GENERATED ALWAYS AS (CASE WHEN vk_eur IS NOT NULL AND vk_eur <> 0 THEN round(vk_us / vk_eur, 4) END) STORED,
	"ek_netto_eur" numeric(12, 2),
	"ek_netto_usd" numeric(12, 2),
	"hersteller" text,
	"lieferant_id" uuid,
	"lieferant_artikel_nr" text,
	"bestand_min" numeric(12, 3),
	"bestand_max" numeric(12, 3),
	"modellgruppe_id" uuid,
	"geschuetztes_holz_cites" boolean DEFAULT false NOT NULL,
	"holzart_id" uuid,
	"gewicht_kg" numeric(10, 3),
	"datensatz_inaktiv" boolean DEFAULT false NOT NULL,
	"schreibgeschuetzt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "artikel_nr_lfd_unique" UNIQUE("nr_lfd")
);
--> statement-breakpoint
CREATE TABLE "artikel_modell" (
	"option_artikel_id" uuid NOT NULL,
	"modell_artikel_id" uuid NOT NULL,
	CONSTRAINT "artikel_modell_option_artikel_id_modell_artikel_id_pk" PRIMARY KEY("option_artikel_id","modell_artikel_id")
);
--> statement-breakpoint
CREATE TABLE "betriebsmittel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bezeichnung" text NOT NULL,
	"artikelnummer" text,
	"hersteller" text,
	"lieferant" text,
	"produktkategorie" "betriebsmittel_kat",
	"einheit" "einheit",
	"menge" numeric(12, 3) DEFAULT '0' NOT NULL,
	"einkaufspreis" numeric(12, 2),
	"wert" numeric(12, 2) GENERATED ALWAYS AS (round(coalesce(menge,0) * coalesce(einkaufspreis,0), 2)) STORED,
	"anmerkungen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "spec_belegung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modell_artikel_id" uuid,
	"angebot_id" uuid,
	"auftrag_id" uuid,
	"slot_key" text NOT NULL,
	"artikel_id" uuid NOT NULL,
	"aufpreis" boolean DEFAULT false NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "spec_belegung_uq_modell" UNIQUE("modell_artikel_id","slot_key","reihenfolge"),
	CONSTRAINT "spec_belegung_uq_angebot" UNIQUE("angebot_id","slot_key","reihenfolge"),
	CONSTRAINT "spec_belegung_uq_auftrag" UNIQUE("auftrag_id","slot_key","reihenfolge"),
	CONSTRAINT "spec_belegung_one_parent" CHECK ((("spec_belegung"."modell_artikel_id" IS NOT NULL)::int + ("spec_belegung"."angebot_id" IS NOT NULL)::int + ("spec_belegung"."auftrag_id" IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE TABLE "spec_slot" (
	"key" text PRIMARY KEY NOT NULL,
	"caption" text NOT NULL,
	"caption_en" text,
	"gruppe" "artikelgruppe" NOT NULL,
	"section" "spec_section" NOT NULL,
	"reihenfolge" integer NOT NULL,
	"aufpreis_moeglich" boolean DEFAULT true NOT NULL,
	"mehrfach" boolean DEFAULT false NOT NULL,
	"holz" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "angebot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" text NOT NULL,
	"kunde_id" uuid,
	"kd_firma" text,
	"kd_vorname" text,
	"kd_nachname" text,
	"kd_strasse" text,
	"kd_plz" text,
	"kd_ort" text,
	"kd_staat_id" uuid,
	"kd_region" "region",
	"kd_waehrung" "waehrung",
	"kd_sprache" "sprache",
	"kd_ust_id" text,
	"kd_steuerpflichtig" boolean,
	"kd_vertriebsweg" "vertriebsweg",
	"kd_sonderrabatt_prozent" numeric(6, 3),
	"kd_briefkopf" text,
	"modell_artikel_id" uuid,
	"freitext_body" text,
	"freitext_colour" text,
	"freitext_neck" text,
	"freitext_assembly" text,
	"summe_positionen" numeric(12, 2),
	"gesamtrabatt_prozent" numeric(6, 3) DEFAULT '0' NOT NULL,
	"gesamtrabatt_wert" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gesamtrabatt_aktiv" boolean DEFAULT false NOT NULL,
	"summe_netto" numeric(12, 2),
	"summe_mwst" numeric(12, 2),
	"summe_brutto" numeric(12, 2),
	"drucktemplate_id" uuid,
	"status" "angebot_status" DEFAULT 'NEU' NOT NULL,
	"angebotsdatum" date,
	"kopftext" text,
	"erzeugt_aus_auftrag_id" uuid,
	"positionen_anzeigen" boolean DEFAULT false NOT NULL,
	"schreibschutz" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "auftrag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" text NOT NULL,
	"kunde_id" uuid,
	"kd_firma" text,
	"kd_vorname" text,
	"kd_nachname" text,
	"kd_strasse" text,
	"kd_plz" text,
	"kd_ort" text,
	"kd_staat_id" uuid,
	"kd_region" "region",
	"kd_waehrung" "waehrung",
	"kd_sprache" "sprache",
	"kd_ust_id" text,
	"kd_steuerpflichtig" boolean,
	"kd_vertriebsweg" "vertriebsweg",
	"kd_sonderrabatt_prozent" numeric(6, 3),
	"kd_briefkopf" text,
	"modell_artikel_id" uuid,
	"freitext_body" text,
	"freitext_colour" text,
	"freitext_neck" text,
	"freitext_assembly" text,
	"summe_positionen" numeric(12, 2),
	"gesamtrabatt_prozent" numeric(6, 3) DEFAULT '0' NOT NULL,
	"gesamtrabatt_wert" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gesamtrabatt_aktiv" boolean DEFAULT false NOT NULL,
	"summe_netto" numeric(12, 2),
	"summe_mwst" numeric(12, 2),
	"summe_brutto" numeric(12, 2),
	"drucktemplate_id" uuid,
	"auftragsart" "auftragsart" DEFAULT 'PRODUKTION' NOT NULL,
	"status" "auftrag_status" DEFAULT 'BACKORDER' NOT NULL,
	"angebot_id" uuid,
	"auftragsdatum" date,
	"prio" integer,
	"besonderes" text,
	"spezialauftrag" text,
	"produktionsort" "produktionsort",
	"bauplandatum" date,
	"bauplan_monat" text,
	"seriennummer_id" uuid,
	"fortschritt_prozent" integer,
	"stand_he_wert" numeric(12, 2),
	"arbeitsstunden" numeric(8, 2),
	"umsatzerwartung" numeric(12, 2),
	"cites_artikelanzahl" integer DEFAULT 0 NOT NULL,
	"cites_dokumentnr" text,
	"wiederausfuhr_noneeu" boolean,
	"gesamtgewicht_holz_kg" numeric(10, 3),
	"gesamtgewicht_brazrw_kg" numeric(10, 3),
	"cites_dokument_asset_id" uuid,
	"lacey_dokument_asset_id" uuid,
	"zertifikat_asset_id" uuid,
	"lieferschein_asset_id" uuid,
	"werkstattbeginn" date,
	"endmontagedatum" date,
	"versanddatum" date,
	"rechnungsdatum" date,
	"zahlungsdatum" date,
	"sernr_vergeben_am" date,
	"modellvorlage_vergeben_at" timestamp with time zone,
	"schreibschutz" boolean DEFAULT false NOT NULL,
	"anzahlung" numeric(12, 2),
	"endrechnung_vorab" boolean DEFAULT false NOT NULL,
	"positionen_anzeigen" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "beleg_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"angebot_id" uuid,
	"auftrag_id" uuid,
	"rechnung_id" uuid,
	"pos_nr" integer,
	"artikel_id" uuid,
	"artikel_name" text,
	"artikel_beschreibung" text,
	"anzahl" numeric(10, 2) DEFAULT '1' NOT NULL,
	"einzelpreis" numeric(12, 2),
	"rabatt_prozent" numeric(6, 3) DEFAULT '0' NOT NULL,
	"gesamtpreis" numeric(12, 2) GENERATED ALWAYS AS (round(coalesce(anzahl,0) * coalesce(einzelpreis,0) * (1 - coalesce(rabatt_prozent,0) / 100), 2)) STORED,
	"re_relevant" boolean DEFAULT true NOT NULL,
	"vk_retail_wert" numeric(12, 2),
	"herkunft_slot_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "beleg_position_one_parent" CHECK ((("beleg_position"."angebot_id" IS NOT NULL)::int + ("beleg_position"."auftrag_id" IS NOT NULL)::int + ("beleg_position"."rechnung_id" IS NOT NULL)::int) = 1)
);
--> statement-breakpoint
CREATE TABLE "rechnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nummer" text NOT NULL,
	"kunde_id" uuid,
	"kd_firma" text,
	"kd_vorname" text,
	"kd_nachname" text,
	"kd_strasse" text,
	"kd_plz" text,
	"kd_ort" text,
	"kd_staat_id" uuid,
	"kd_region" "region",
	"kd_waehrung" "waehrung",
	"kd_sprache" "sprache",
	"kd_ust_id" text,
	"kd_steuerpflichtig" boolean,
	"kd_vertriebsweg" "vertriebsweg",
	"kd_sonderrabatt_prozent" numeric(6, 3),
	"kd_briefkopf" text,
	"modell_artikel_id" uuid,
	"freitext_body" text,
	"freitext_colour" text,
	"freitext_neck" text,
	"freitext_assembly" text,
	"summe_positionen" numeric(12, 2),
	"gesamtrabatt_prozent" numeric(6, 3) DEFAULT '0' NOT NULL,
	"gesamtrabatt_wert" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gesamtrabatt_aktiv" boolean DEFAULT false NOT NULL,
	"summe_netto" numeric(12, 2),
	"summe_mwst" numeric(12, 2),
	"summe_brutto" numeric(12, 2),
	"drucktemplate_id" uuid,
	"belegart" "rechnung_belegart" DEFAULT 'RECHNUNG' NOT NULL,
	"status" "rechnung_status" DEFAULT 'OFFEN' NOT NULL,
	"zahlungsstatus" "zahlungsstatus",
	"rechnungsdatum" date,
	"lieferdatum" date,
	"auftrag_id" uuid,
	"referenz_rechnung_id" uuid,
	"teilgutschrift" boolean DEFAULT false NOT NULL,
	"anzahlung_beruecksichtigen" boolean DEFAULT false NOT NULL,
	"anzahlung_brutto" numeric(12, 2),
	"anzahlung_datum" date,
	"rechnungsbetrag" numeric(12, 2),
	"zahlungsdatum" date,
	"zahlbetrag" numeric(12, 2),
	"zahlung_an_bank" "bank",
	"differenz_zahlung" numeric(12, 2),
	"abzug_prozent" numeric(6, 3),
	"gebucht_beim_steuerbuero" boolean DEFAULT false NOT NULL,
	"report_monat" text,
	"bemerkung_rechnung" text,
	"erechnung_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "arbeitsschritt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auftrag_id" uuid NOT NULL,
	"vorrat_id" uuid NOT NULL,
	"status" "schritt_status" DEFAULT 'OFFEN' NOT NULL,
	"erledigt_am" timestamp with time zone,
	"erledigt_von_id" uuid,
	"ma_import" text,
	"bemerkung_bearbeiter" text,
	"warten_auf" text,
	"dauer_minuten" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "arbeitsschritt_vorrat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nr" integer NOT NULL,
	"workstep" text NOT NULL,
	"workstep_en" text,
	"reihenfolge" integer NOT NULL,
	"typ" "vorrat_typ",
	"part" text,
	"part_farbe" text,
	"gruppe" "vorrat_gruppe",
	CONSTRAINT "arbeitsschritt_vorrat_nr_unique" UNIQUE("nr")
);
--> statement-breakpoint
CREATE TABLE "holz_volumen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artikel_id" uuid NOT NULL,
	"artikelgruppe" "artikelgruppe",
	"volumen_m3" numeric(12, 7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "holzart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holz" text NOT NULL,
	"holzart_grob" text,
	"botanischer_name" text,
	"herkunft" text,
	"holzdichte" numeric(8, 3),
	"species" text,
	"genus" text,
	"info" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "bestellposition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bestellung_id" uuid NOT NULL,
	"artikel_id" uuid NOT NULL,
	"menge" numeric(12, 3) NOT NULL,
	"ek_preis" numeric(12, 2),
	"menge_geliefert" numeric(12, 3) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bestellung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lieferant_id" uuid NOT NULL,
	"status" "bestellstatus" DEFAULT 'ENTWURF' NOT NULL,
	"bestelldatum" date,
	"lieferdatum_erwartet" date,
	"bemerkung" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "holz_inventar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventar_id" text NOT NULL,
	"holzart_id" uuid,
	"unterart" text,
	"struktur" text,
	"qualitaet" "holz_qualitaet",
	"dicke" "holz_dicke",
	"groesse" "holz_groesse",
	"piece" "holz_piece",
	"fuer" "holz_verwendung",
	"cnc" "holz_cnc",
	"gewicht_g" integer,
	"besonderes" text,
	"bemerkung" text,
	"eingang_am" date,
	"lagerort_id" uuid,
	"status" "holz_status" DEFAULT 'FREI' NOT NULL,
	"status_geaendert_am" date,
	"reserviert_fuer_auftrag_id" uuid,
	"holzhaendler_id" uuid,
	"einkaufspreis" numeric(12, 2),
	"profit_margin" numeric(12, 2),
	"verkaufspreis" numeric(12, 2),
	"bild_asset_id" uuid,
	"qr_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "holz_inventar_inventar_id_unique" UNIQUE("inventar_id")
);
--> statement-breakpoint
CREATE TABLE "holz_struktur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "holz_struktur_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "holz_unterart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holzart_grob" text,
	"name" text NOT NULL,
	"reihenfolge" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "inventur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stichtag" date NOT NULL,
	"status" "inventurstatus" DEFAULT 'OFFEN' NOT NULL,
	"bemerkung" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "inventurposition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventur_id" uuid NOT NULL,
	"artikel_id" uuid NOT NULL,
	"soll_menge" numeric(12, 3),
	"ist_menge" numeric(12, 3),
	"differenz" numeric(12, 3) GENERATED ALWAYS AS (coalesce(ist_menge,0) - coalesce(soll_menge,0)) STORED
);
--> statement-breakpoint
CREATE TABLE "lagerbestand" (
	"artikel_id" uuid PRIMARY KEY NOT NULL,
	"menge" numeric(12, 3) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lagerbewegung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artikel_id" uuid NOT NULL,
	"menge" numeric(12, 3) NOT NULL,
	"art" "bewegungsart" NOT NULL,
	"auftrag_id" uuid,
	"bestellung_id" uuid,
	"inventur_id" uuid,
	"datum" date DEFAULT now() NOT NULL,
	"bemerkung" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "lagerort" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"bezeichnung" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "lagerort_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "anhang" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailversand_id" uuid,
	"angebot_id" uuid,
	"auftrag_id" uuid,
	"rechnung_id" uuid,
	"artikel_id" uuid,
	"holz_inventar_id" uuid,
	"todo_id" uuid,
	"art" "anhang_art",
	"dateiname" text,
	"pfad" text,
	"groesse" integer,
	"mime" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "beleg_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"belegart" "doc_art" NOT NULL,
	"name" text NOT NULL,
	"html" text NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "mail_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"belegart" "doc_art" NOT NULL,
	"sprache" "sprache" NOT NULL,
	"betreff" text,
	"body_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "mailversand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"art" "mail_art" NOT NULL,
	"status" "mail_status" DEFAULT 'ENTWURF' NOT NULL,
	"angebot_id" uuid,
	"auftrag_id" uuid,
	"rechnung_id" uuid,
	"kunde_id" uuid,
	"an" text,
	"cc" text,
	"bcc" text,
	"betreff" text,
	"body_html" text,
	"wiedervorlage" date,
	"gesendet_am" timestamp with time zone,
	"fehler_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "modell_kalkulation" (
	"artikel_id" uuid PRIMARY KEY NOT NULL,
	"kleinteile_pauschale" numeric(12, 2),
	"plan_arbeitsstunden" numeric(8, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "modellgruppe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"min_menge_monat" integer,
	"max_menge_monat" integer,
	"durchschnittspreis_eur" numeric(12, 2),
	"durchschnittspreis_usd" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "modellgruppe_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "report_monat" (
	"monat" text PRIMARY KEY NOT NULL,
	"anzahl_gitarren" integer,
	"umsatz_gitarren_eur" numeric(14, 2),
	"umsatz_gitarren_usd" numeric(14, 2),
	"umsatz_non_guitar_eur" numeric(14, 2),
	"skonto_eur" numeric(14, 2),
	"storno_eur" numeric(14, 2),
	"umsatz_gesamt_eur" numeric(14, 2),
	"umsatz_kumuliert_eur" numeric(14, 2),
	"kostendeckung_monat_eur" numeric(14, 2),
	"kostenziel_monat_eur" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aufgabe" text NOT NULL,
	"empfaenger_id" uuid,
	"absender_id" uuid,
	"prio" "todo_prio" DEFAULT 'GELEGENTLICH' NOT NULL,
	"status" "todo_status" DEFAULT 'BESTELLUNG' NOT NULL,
	"auftrag_id" uuid,
	"faellig_bis" date,
	"in_arbeit_seit" date,
	"erledigt_am" date,
	"erinnerung" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"rolle" "rolle" DEFAULT 'WERKSTATT' NOT NULL,
	"kann_werkstatt" boolean DEFAULT true NOT NULL,
	"kann_todo" boolean DEFAULT true NOT NULL,
	"initialen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "staat" ADD CONSTRAINT "staat_default_zahlungsbedingung_id_zahlungsbedingung_id_fk" FOREIGN KEY ("default_zahlungsbedingung_id") REFERENCES "public"."zahlungsbedingung"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ansprechpartner" ADD CONSTRAINT "ansprechpartner_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kunde" ADD CONSTRAINT "kunde_staat_id_staat_id_fk" FOREIGN KEY ("staat_id") REFERENCES "public"."staat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kunde" ADD CONSTRAINT "kunde_zahlungsbedingung_id_zahlungsbedingung_id_fk" FOREIGN KEY ("zahlungsbedingung_id") REFERENCES "public"."zahlungsbedingung"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lieferadresse" ADD CONSTRAINT "lieferadresse_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artikel" ADD CONSTRAINT "artikel_lieferant_id_kunde_id_fk" FOREIGN KEY ("lieferant_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artikel_modell" ADD CONSTRAINT "artikel_modell_option_artikel_id_artikel_id_fk" FOREIGN KEY ("option_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artikel_modell" ADD CONSTRAINT "artikel_modell_modell_artikel_id_artikel_id_fk" FOREIGN KEY ("modell_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_belegung" ADD CONSTRAINT "spec_belegung_modell_artikel_id_artikel_id_fk" FOREIGN KEY ("modell_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_belegung" ADD CONSTRAINT "spec_belegung_angebot_id_angebot_id_fk" FOREIGN KEY ("angebot_id") REFERENCES "public"."angebot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_belegung" ADD CONSTRAINT "spec_belegung_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_belegung" ADD CONSTRAINT "spec_belegung_slot_key_spec_slot_key_fk" FOREIGN KEY ("slot_key") REFERENCES "public"."spec_slot"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_belegung" ADD CONSTRAINT "spec_belegung_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angebot" ADD CONSTRAINT "angebot_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angebot" ADD CONSTRAINT "angebot_kd_staat_id_staat_id_fk" FOREIGN KEY ("kd_staat_id") REFERENCES "public"."staat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angebot" ADD CONSTRAINT "angebot_modell_artikel_id_artikel_id_fk" FOREIGN KEY ("modell_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "angebot" ADD CONSTRAINT "angebot_erzeugt_aus_auftrag_id_auftrag_id_fk" FOREIGN KEY ("erzeugt_aus_auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_kd_staat_id_staat_id_fk" FOREIGN KEY ("kd_staat_id") REFERENCES "public"."staat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_modell_artikel_id_artikel_id_fk" FOREIGN KEY ("modell_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_angebot_id_angebot_id_fk" FOREIGN KEY ("angebot_id") REFERENCES "public"."angebot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_seriennummer_id_seriennummer_id_fk" FOREIGN KEY ("seriennummer_id") REFERENCES "public"."seriennummer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beleg_position" ADD CONSTRAINT "beleg_position_angebot_id_angebot_id_fk" FOREIGN KEY ("angebot_id") REFERENCES "public"."angebot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beleg_position" ADD CONSTRAINT "beleg_position_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beleg_position" ADD CONSTRAINT "beleg_position_rechnung_id_rechnung_id_fk" FOREIGN KEY ("rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beleg_position" ADD CONSTRAINT "beleg_position_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_kd_staat_id_staat_id_fk" FOREIGN KEY ("kd_staat_id") REFERENCES "public"."staat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_modell_artikel_id_artikel_id_fk" FOREIGN KEY ("modell_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_referenz_rechnung_id_rechnung_id_fk" FOREIGN KEY ("referenz_rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arbeitsschritt" ADD CONSTRAINT "arbeitsschritt_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arbeitsschritt" ADD CONSTRAINT "arbeitsschritt_vorrat_id_arbeitsschritt_vorrat_id_fk" FOREIGN KEY ("vorrat_id") REFERENCES "public"."arbeitsschritt_vorrat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arbeitsschritt" ADD CONSTRAINT "arbeitsschritt_erledigt_von_id_app_user_id_fk" FOREIGN KEY ("erledigt_von_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holz_volumen" ADD CONSTRAINT "holz_volumen_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bestellposition" ADD CONSTRAINT "bestellposition_bestellung_id_bestellung_id_fk" FOREIGN KEY ("bestellung_id") REFERENCES "public"."bestellung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bestellposition" ADD CONSTRAINT "bestellposition_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bestellung" ADD CONSTRAINT "bestellung_lieferant_id_kunde_id_fk" FOREIGN KEY ("lieferant_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holz_inventar" ADD CONSTRAINT "holz_inventar_holzart_id_holzart_id_fk" FOREIGN KEY ("holzart_id") REFERENCES "public"."holzart"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holz_inventar" ADD CONSTRAINT "holz_inventar_lagerort_id_lagerort_id_fk" FOREIGN KEY ("lagerort_id") REFERENCES "public"."lagerort"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holz_inventar" ADD CONSTRAINT "holz_inventar_reserviert_fuer_auftrag_id_auftrag_id_fk" FOREIGN KEY ("reserviert_fuer_auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holz_inventar" ADD CONSTRAINT "holz_inventar_holzhaendler_id_kunde_id_fk" FOREIGN KEY ("holzhaendler_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventurposition" ADD CONSTRAINT "inventurposition_inventur_id_inventur_id_fk" FOREIGN KEY ("inventur_id") REFERENCES "public"."inventur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventurposition" ADD CONSTRAINT "inventurposition_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lagerbestand" ADD CONSTRAINT "lagerbestand_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lagerbewegung" ADD CONSTRAINT "lagerbewegung_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lagerbewegung" ADD CONSTRAINT "lagerbewegung_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anhang" ADD CONSTRAINT "anhang_mailversand_id_mailversand_id_fk" FOREIGN KEY ("mailversand_id") REFERENCES "public"."mailversand"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anhang" ADD CONSTRAINT "anhang_angebot_id_angebot_id_fk" FOREIGN KEY ("angebot_id") REFERENCES "public"."angebot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anhang" ADD CONSTRAINT "anhang_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anhang" ADD CONSTRAINT "anhang_rechnung_id_rechnung_id_fk" FOREIGN KEY ("rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailversand" ADD CONSTRAINT "mailversand_angebot_id_angebot_id_fk" FOREIGN KEY ("angebot_id") REFERENCES "public"."angebot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailversand" ADD CONSTRAINT "mailversand_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailversand" ADD CONSTRAINT "mailversand_rechnung_id_rechnung_id_fk" FOREIGN KEY ("rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailversand" ADD CONSTRAINT "mailversand_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modell_kalkulation" ADD CONSTRAINT "modell_kalkulation_artikel_id_artikel_id_fk" FOREIGN KEY ("artikel_id") REFERENCES "public"."artikel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "angebot_nummer_idx" ON "angebot" USING btree ("nummer");--> statement-breakpoint
CREATE INDEX "auftrag_nummer_idx" ON "auftrag" USING btree ("nummer");--> statement-breakpoint
CREATE INDEX "rechnung_nummer_idx" ON "rechnung" USING btree ("nummer");--> statement-breakpoint
CREATE INDEX "anhang_auftrag_idx" ON "anhang" USING btree ("auftrag_id");--> statement-breakpoint
CREATE INDEX "anhang_artikel_idx" ON "anhang" USING btree ("artikel_id");--> statement-breakpoint
CREATE INDEX "todo_empfaenger_idx" ON "todo" USING btree ("empfaenger_id");--> statement-breakpoint
CREATE INDEX "todo_status_idx" ON "todo" USING btree ("status");