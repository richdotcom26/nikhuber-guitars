# Zielmodell · Nik Huber Guitars Web-App

Begleitdokument zu [MIGRATION.md](MIGRATION.md). Hält den **Entwurf** des Zielsystems fest
(Architektur, Datenmodell, Konventionen, offene Entscheidungen). Wird iterativ ergänzt/geändert.
Stand: 2026-09-01 · Status: **Erstentwurf, zur Diskussion**

> Legende: ✅ entschieden · 🟡 Vorschlag (Empfehlung im Text) · ❓ offen, braucht Input

---

## 1. Architektur & Tech-Stack   (DSGVO-Haltung A: Supabase-Frankfurt + Vercel)

Eigenständiges Projekt, **nicht** auf dWERK-Infrastruktur. Start **kostenlos**, produktiv dann bezahlter
Plan. Daten in der EU (Frankfurt), AVV je Anbieter, EU-US-DPF.

| Baustein | Wahl | Status | Begründung / Konsequenz |
|---|---|---|---|
| **DB** | **Supabase Postgres**, Region `eu-central-1` (Frankfurt) | ✅ | „nur Postgres" darunter → kompletter Entwurf (§3/§4) gilt; kaum Lock-in (`pg_dump`) |
| DB-Zugriff | **Drizzle ORM** + `postgres.js` gegen den Supabase-Pooler (`fra1`) | ✅ | Views/`GENERATED` als First-Class; Schema-as-Code, Drizzle-Kit-Migrations |
| **Auth** | **Supabase Auth** (E-Mail/Passwort), ~25 Mitarbeiter; Profil in `app_user` | ✅ | EU-gehostet, kein separater IdP. Rolle als Claim + `app_user.rolle` |
| **Datei-Ablage** | **Supabase Storage** (Buckets `anhang`, `belege`, `holz`) | ✅ | alles PII an *einem* EU-Ort, *ein* AVV; signierte URLs |
| Datenzugriffsmodell | **serverseitig** in Next.js (Route Handler / Server Actions) via Drizzle + direkter PG-Connection (service_role); **Autorisierung im Service-Layer** (`/lib/domain`); RLS optional als Sicherheitsnetz | ✅ | hält den `/lib/domain`-Entwurf intakt; Anon-Key nie fürs Data-Access |
| Frontend/Hosting | **Next.js (App Router) auf Vercel**, Functions gepinnt auf `fra1` | ✅ | Hobby zum Bauen; **Pro** (~20 $/M) sobald kommerziell/produktiv |
| Sprache | TypeScript | ✅ | |
| UI | React + Tailwind + shadcn/ui | 🟡 | Formulare/Tabellen; Dark-Mode später |
| Tabellen/Grid | TanStack Table | 🟡 | Listenansichten mit Filter/Sort |
| **Beleg-PDF + E-Rechnung** | HTML-Template → Puppeteer (`@sparticuz/chromium`) in einer **Vercel Function** (`fra1`); ZUGFeRD-XML einbetten. Fallback: kleiner Node-Render-Dienst (EU) | 🟡 | Vercel-Limits (Größe/Timeout) prüfen |
| Excel-Export | `exceljs` in einer Vercel Function | 🟡 | direkter Download, ersetzt CSV-in-Link-Feld (7z) |
| Hintergrundjobs | **Vercel Cron** → geschützte Route Handler (Report-Refresh, Mail-Queue, Nummern-Housekeeping) | 🟡 | Alternative: Supabase `pg_cron` |
| Barcode/QR | `bwip-js` (Vercel Function / clientseitig) | 🟡 | Etikettendruck Holzinventar |
| E-Mail-Versand | Provider mit EU-Option + AVV (z. B. **Brevo** / Postmark-EU) | 🟡 | Mailversand-Queue (§3.8) |

### Projektstruktur (grob)
```
/app            Next.js Routes (UI + API)
  /(nav)/todo /adressen /angebote /auftraege /rechnungen
        /seriennummern /artikel /modelle /holzbestand
  /(verwaltung)/…   Sekundärbereiche
  /api/pdf          Puppeteer + ZUGFeRD
  /api/excel        exceljs
  /api/cron/…       Vercel-Cron-Ziele
/lib
  /db              Drizzle-Schema + Migrations  (→ Supabase Postgres)
  /supabase        Auth- + Storage-Clients (server + browser)
  /domain          Service-Layer (Geschäftslogik, ex-Ninox-Trigger)  ← Autorisierung hier
  /specs           SPEC_SLOTS-Registry (§3.4)
  /pricing         Tier-Lookup + Artikelstamm-Preispflege (§6)
  /documents       Beleg-Renderer (HTML-Templates + ZUGFeRD)
  /import          ETL aus dem Ninox-Backup → Supabase
```

### DSGVO-Betrieb (Kurzcheck)
- AVV mit **Supabase** und **Vercel** abschließen; E-Mail-Provider mit EU-Option + AVV.
- Region überall Frankfurt/EU; keine PII in Logs/URLs.
- Löschkonzept (Kunde/Kontakt), Auskunfts-/Exportfunktion, Aufbewahrungsfristen (Rechnungen 8 J., GoBD).
- Verzeichnis von Verarbeitungstätigkeiten führen (unabhängig vom Stack Pflicht).

---

## 2. Konventionen

- **Domänensprache = Deutsch** (Tabellen/Spalten: `auftrag`, `angebot`, `rechnung`, `artikel`, `kunde`).
  Der Bestand ist durchgängig deutsch benannt; englische Fachbegriffe nur wo etabliert (`spec`, `slot`).
- **Technische Felder englisch**: `id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`.
- `snake_case`, Singular-Tabellennamen. PK = `id uuid default gen_random_uuid()`.
- Geld: `numeric(12,2)`, Währung separat je Beleg. Prozente `numeric(6,3)`.
- Enums: Postgres-`enum`-Typen (Werte s. §5). Alt-Zahlencodes aus Ninox **nicht** übernehmen.
- **Soft-Delete** per `deleted_at` bei Stammdaten (Kunde, Artikel); Belege werden nie hart gelöscht.
- Audit-Spalten überall; gefüllt aus der Session (§7r).

---

## 3. Datenmodell — Überblick

Domänen-Blöcke (Details in §3.1–§3.9):

1. **Stammdaten/Settings** — `firma_setting`, `staat`, `zahlungsbedingung`, `zaehler`
2. **Adressen** — `kunde`, `ansprechpartner`, `lieferadresse`
3. **Artikel** — `artikel`, `artikel_lieferant`, `artikel_modell` (M:N Option↔Modell)
4. **Specs** — `spec_belegung` (eine Tabelle für Modell **und** Beleg-Specs) + Code-Registry `SPEC_SLOTS`
5. **Belege** — `angebot`, `auftrag`, `rechnung` + gemeinsame Kinder `beleg_position`
6. **Fertigung** — `arbeitsschritt_vorrat`, `arbeitsschritt`
7. **Compliance/Holz** — `holzart` (NKS), `holz_volumen`, View `holzposition`
8. **Kommunikation** — `mailversand`, `mail_anhang`, `mail_template`, `anhang`
9. **Holzinventar** — `holz_inventar`, `lagerort`
10. **Lagerhaltung/Bestellung/Inventur** (Handelsware) — `lagerbestand`, `lagerbewegung`, `bestellung(+position)`, `inventur(+position)`; separat `betriebsmittel` (Werkstatt-Verbrauchsmaterial)
11. **Benutzer** — `app_user`, Rollen
12. **Reporting** — nur Views/Materialized Views, keine Tabellen

### Beziehungsskizze (Kern)
```
kunde 1─* angebot ─┐
kunde 1─* auftrag ─┼─* beleg_position
kunde 1─* rechnung ┘
angebot 1─* spec_belegung        auftrag 1─* spec_belegung
angebot 0..1─1 auftrag (erzeugt_aus)     auftrag 1─* rechnung
auftrag 1─* arbeitsschritt ─* arbeitsschritt_vorrat
auftrag 1─* holzposition (VIEW über spec_belegung + artikel + holzart)
artikel (artikelgruppe='model') 1─* spec_belegung   // Modell-Defaults
artikel *─* artikel_modell *─ artikel(model)         // "Option bei diesen Modellen"
```

---

## 3.1 Stammdaten / Settings

```sql
firma_setting            -- Singleton (ex Stammdaten LC + Allgemein NF)
  id, firma, strasse, plz, ort, land, steuer_nr, bank,
  mwst_satz            numeric(6,3)  default 19.0,
  usd_eur_faktor       numeric(8,4)  default 0.92,   -- ex 3× hartkodiert (7k) + WB.A6
  haendler_eu_rabatt   numeric(6,3)  default 35.0,   -- "Händler EU 35%"
  haendler_noneu_rabatt numeric(6,3) default 40.0,   -- "Händler nicht-EU 40%"
  net_us_rabatt        numeric(6,3)  default 30.0,
  serien_start         int default 4900,
  hts_code             text default '92079010',       -- Lacey (7q)
  lacey_unterzeichner  text default 'Elly Müller',     -- (7q)

staat                  -- ex Staaten JD (52 Länder)
  id, kuerzel, name, region region_enum,     -- D | EU | WELT | ASIEN | USA
  default_sprache sprache_enum, default_waehrung waehrung_enum,
  default_zahlungsbedingung_id -> zahlungsbedingung

zahlungsbedingung      -- ex ED
  id, bezeichnung, bezeichnung_en

zaehler                -- Belegnummern, ersetzt Ninox max()+1 / Stammdaten-Counter
  art zaehler_art_enum,     -- ANGEBOT | AUFTRAG | RECHNUNG
  jahr int,
  stand int,
  primary key (art, jahr)
  -- Vergabe: SELECT ... FOR UPDATE; stand+1; Format 'AN-'||jahr||'-'||lpad(stand,4,'0')
```

---

## 3.2 Adressen

```sql
kunde                  -- ex Adressen MC (103 Felder → nur die genutzten)
  id, kunden_nr text unique,
  kontaktart kontaktart_enum,          -- KUNDE|LIEFERANT|HAENDLER|ARTIST|HOLZHAENDLER|INDUSTRIE|SONSTIGE
  firma, vorname, nachname, kurzname,
  strasse, adresszusatz, plz, ort, staat_id -> staat,
  -- abgeleitete Defaults (beim Setzen von staat_id gesetzt, danach editierbar — §8/7b):
  region region_enum, vertriebsweg vertriebsweg_enum, steuerpflichtig boolean,
  waehrung waehrung_enum, sprache sprache_enum, zahlungsbedingung_id -> zahlungsbedingung,
  ust_id_nr text,
  email, email_rechnung_cc, telefon, mobil, url,
  briefanrede text,                    -- ex MC.R4
  briefkopf_manuell text,              -- Override; sonst berechnet aus Adresse
  seriennummer_auf_rechnung boolean,
  person2_name, person2_email, person2_telefon, person2_bemerkung,
  bemerkung,
  ... audit, deleted_at

ansprechpartner        -- ex SE
  id, kunde_id -> kunde,
  anrede anrede_enum, vorname, nachname, briefanrede_individuell,
  email, telefon, mobil, telefax,
  position ap_position_enum,           -- ALLGEMEIN|MITARBEITER|RECHNUNGSKONTAKT
  primaere_email boolean,              -- Empfänger für AB/Rechnung (7n/7v)
  fuer_briefkopf boolean

lieferadresse          -- ex NC / "Weitere Lieferadressen"
  id, kunde_id -> kunde, firma, vorname, nachname, strasse, plz, ort, land
```

---

## 3.3 Artikel

```sql
artikel                -- ex WB (179 Felder → Kern)
  id, artikel_nr text unique,          -- 'A#####'
  nr_lfd int unique,                   -- ex WB.T7 "Nr" — Alt-Referenzschlüssel der Spec-Slots (§7 Import)
  artikelgruppe artikelgruppe_enum,    -- MODEL | BODY | TOP | NECK | … (§5, ~55 Werte, "Nut"/"Sonstiges" dedupliziert)
  artikeltyp artikeltyp_enum null,     -- E9: HOLZ | HANDELSWARE  (null bei Modell + reinen Konfig-/Finish-Optionen)
                                        --   HOLZ       → Eigenfertigung, NKS-Holzart, CITES/Lacey
                                        --   HANDELSWARE → zugekauft: Lagerhaltung, Bestellvorschläge, Inventur
  name_kurz, name_lang, name_belege, name_zertifikat,
  beschreibung,
  bild_asset_id -> anhang,
  -- Preise (Eingabe):
  vk_eur numeric(12,2), vk_us numeric(12,2),
  brutto_fuer_netto boolean, nicht_rabattierfaehig boolean,
  -- Preise abgeleitet → GENERATED oder pricing-Service (§6):
  vk_eur_net, net1, net2, net_us,       -- (GENERATED STORED, Formel aus firma_setting-Rabatten)
  -- Einkauf/Lieferant:
  ek_netto_eur numeric(12,2), ek_netto_usd numeric(12,2),
  hersteller text, lieferant_id -> kunde (kontaktart=LIEFERANT),
  lieferant_artikel_nr, bestand_min, bestand_max,
  -- NKS / Holz:
  geschuetztes_holz_cites boolean,      -- ex WB.LE
  holzart_id -> holzart,                -- ex WB.SF (NKS Holzart)
  gewicht_kg numeric(10,3),
  datensatz_inaktiv boolean,            -- Archiv-Flag (Modell-Liste-Filter, 7x)
  schreibgeschuetzt boolean,
  ... audit

artikel_modell         -- M:N: "diese Option wird bei folgenden Modellen angeboten" (ex WB.Z7 Modelselect, 6.3)
  option_artikel_id -> artikel,
  modell_artikel_id  -> artikel (artikelgruppe=MODEL),
  primary key (option_artikel_id, modell_artikel_id)
```

**Preis-Deltas der Options-Artikel:** `vk_eur` etc. eines Nicht-Modell-Artikels ist der **Aufpreis**
(kann negativ sein, z. B. „Body Finish – Open Pore" −305 €, 7y). Modellpreis = Modell-`vk_eur` +
Σ Deltas der aufpreisrelevanten Specs.

---

## 3.4 Specs — `spec_belegung` + Registry

**Entscheidung 🟡: eine normalisierte Kind-Tabelle statt ~90 Flachspalten je Beleg.**
Grund: Das System **kopiert Specs ständig zwischen Trägern** (Modellvorlage→Beleg 7·2, Angebot↔Auftrag
7e/7m) und **iteriert sie** (Positions-Generator Schritt 3, Holzpositionen 7d, Specs-Artikelliste 7y,
CITES-Zählung 7d). Als Kind-Tabelle sind Copy/Generate/View je ein `INSERT … SELECT` bzw. `SELECT`.
`(mehrfach)`-Slots = einfach mehrere Zeilen. Der Specs-Editor pivotiert clientseitig über die Registry.

```sql
spec_belegung
  id,
  -- genau EIN Träger (CHECK):
  modell_artikel_id -> artikel   null,   -- Modell-Default-Specs
  angebot_id        -> angebot   null,
  auftrag_id        -> auftrag   null,
  slot_key    text,                       -- 'body','top','pu_bridge',…  (aus SPEC_SLOTS)
  artikel_id  -> artikel,                  -- der gewählte Spec-Artikel (Gruppe passend zum Slot)
  aufpreis    boolean default false,       -- ex '<Slot>_K' — in Beleg/Rechnung als Position führen
  reihenfolge int,                         -- für (mehrfach)-Slots
  constraint one_parent check (num_nonnull(modell_artikel_id, angebot_id, auftrag_id) = 1)

-- Abschnitts-Freitexte liegen am Träger selbst, nicht pro Slot:
--   <angebot|auftrag|artikel>.freitext_body / _colour / _neck / _assembly
```

**Registry (Code, `/lib/specs/slots.ts`) — die *eine* Definition, die in Ninox 4× dupliziert ist:**
```ts
export const SPEC_SLOTS = [
  { key:'body',        caption:'Body',        gruppe:'BODY',        section:'BODY',    order:10, aufpreis:true,  multi:false, holz:true  },
  { key:'top',         caption:'Top',         gruppe:'TOP',         section:'BODY',    order:20, aufpreis:true,  multi:false, holz:true  },
  { key:'back_top',    caption:'Back Top',    gruppe:'BACK_TOP',    section:'BODY',    order:30, aufpreis:true,  multi:false, holz:true  },
  // … ~55 Einträge; section ∈ BODY|FINISH_COLOUR|NECK|ASSEMBLY
  { key:'cnc_pu_custom', caption:'CNC PU Custom', gruppe:'CNC_PU_CUSTOM', section:'BODY', order:95, aufpreis:false, multi:true, holz:false },
] as const;

export const HOLZ_SLOTS = SPEC_SLOTS.filter(s => s.holz).map(s => s.key);
// = body, top, back_top, neck, fretboard, headstock, tuner_buttons,
//   trussrod_cover, switch_tip, pu_rings, poti_knobs, backplate   (12, 7d)
```
- Dropdown je Slot = `artikel WHERE artikelgruppe = slot.gruppe AND NOT datensatz_inaktiv`
  – im Auftrag zusätzlich `OR (artikelgruppe='SONSTIGES' AND EXISTS artikel_modell mit dem gewählten Modell)` (6.3).
- Optional gespiegelt als DB-Tabelle `spec_slot` (nur Metadaten) falls die UI sie dynamisch laden soll.

---

## 3.5 Belege — `angebot` / `auftrag` / `rechnung`

**Drei Header-Tabellen** (unterscheiden sich stark: Auftrag=Fertigung, Rechnung=Zahlung),
**gemeinsame Kinder** `beleg_position` und `spec_belegung`.

### Gemeinsame Kopf-Spalten (Konvention, in allen drei)
```
id, nummer text unique,                 -- 'AN-2026-2544' / 'A-2026-4773' / 'RG-2026-3722'
kunde_id -> kunde,                       -- Navigation
-- KUNDEN-SNAPSHOT zum Ausstellungszeitpunkt (behebt 7j-Inkonsistenz):
kd_firma, kd_vorname, kd_nachname, kd_strasse, kd_plz, kd_ort,
kd_staat_id, kd_region, kd_waehrung, kd_sprache, kd_ust_id,
kd_steuerpflichtig boolean, kd_vertriebsweg vertriebsweg_enum,
kd_briefkopf text,                       -- eingefroren
modell_artikel_id -> artikel,            -- geladenes Modell (ex MODELLARTIKEL)
-- Summen (numeric(12,2), per Service neu berechnet bei Positions-/Rabattänderung — §6):
summe_positionen, gesamtrabatt_prozent, gesamtrabatt_wert, gesamtrabatt_aktiv boolean,
summe_netto, summe_mwst, summe_brutto,
drucktemplate_id -> beleg_template,
freitext_body, freitext_colour, freitext_neck, freitext_assembly,
... audit
```

### `angebot` (ex YC)
```
+ status angebot_status_enum,            -- NEU|VERSENDET_OFFEN|AUFTRAG|VERLOREN|VERWORFEN
  angebotsdatum date, kopftext text,     -- "Angebots Text"
  erzeugt_aus_auftrag_id -> auftrag null -- echte FK statt Freitext (7m)
```

### `auftrag` (ex A, 252 Felder → Kern)
```
+ auftragsart auftragsart_enum,          -- PRODUKTION | NONE_GUITAR | SERVICE  (E8: "Promotion" wird NICHT modelliert)
  status auftrag_status_enum,            -- BACKORDER|WERKSTATT|BEI_NICL|PROD_FERTIG|SERVICE|
                                         --   NONE_GUITAR|ABGESCHLOSSEN|ABGESCHL_OHNE_BEFUND|STORNIERT
  auftragsdatum date, prio int, besonderes_id -> …, spezialauftrag_id -> …,
  produktionsort produktionsort_enum,    -- RODGAU|HAMBURG
  bauplandatum date,                     -- Monatserster (7i); bauplan_monat = to_char(bauplandatum,'YYYY/MM') GENERATED
  -- Seriennummer:
  seriennummer_id -> seriennummer null,  -- Vergabe monoton (E6): DB-Sequenz, keine Lücken-Wiederverwendung
  -- Fertigungs-Fortschritt (GENERATED/Service, 7h):
  fortschritt_prozent int, stand_he_wert numeric(12,2),
  arbeitsstunden numeric(8,2),           -- E13: Σ arbeitsschritt.dauer_minuten / 60 (Service)
  umsatzerwartung numeric(12,2),         -- EUR-normiert (7k)
  -- CITES/Compliance:
  cites_artikelanzahl int, cites_dokumentnr text, wiederausfuhr_noneeu boolean,
  gesamtgewicht_holz_kg numeric(10,3), gesamtgewicht_brazrw_kg numeric(10,3),
  cites_dokument_asset_id, lacey_dokument_asset_id, zertifikat_asset_id, lieferschein_asset_id,
  -- Zeitstempel:
  werkstattbeginn date, endmontagedatum date, versanddatum date,
  rechnungsdatum date, zahlungsdatum date, sernr_vergeben_am date,
  modellvorlage_vergeben_at timestamptz, schreibschutz boolean,
  anzahlung numeric(12,2), endrechnung_vorab boolean
```

### `rechnung` (ex BC)
```
+ belegart rechnung_belegart_enum,       -- RECHNUNG|STORNORECHNUNG|GUTSCHRIFT
  status rechnung_status_enum,           -- OFFEN|BEZAHLT|STORNORECHNUNG|GUTSCHRIFT|RG_STORNIERT
  zahlungsstatus zahlungsstatus_enum,    -- ANGEZAHLT|TEILZAHLUNG|BEZAHLT|ANGEMAHNT
  rechnungsdatum date, lieferdatum date,
  auftrag_id -> auftrag,                  -- echte FK (war schon so: BC.G1)
  referenz_rechnung_id -> rechnung null,  -- Storno/Gutschrift → Original (ex String "Referenz zu RE")
  anzahlung_beruecksichtigen boolean, anzahlung_brutto numeric(12,2), anzahlung_datum date,
  rechnungsbetrag numeric(12,2),         -- Brutto − Anzahlung
  -- Zahlung:
  zahlungsdatum date, zahlbetrag numeric(12,2), zahlung_an_bank bank_enum,  -- VVB|CHASE|PAYPAL
  differenz_zahlung numeric(12,2), abzug_prozent numeric(6,3),
  -- Zahlung wird MANUELL erfasst (Rolle BUERO, „Johannes"): Kontoabgleich per Hand,
  --   keine Bank-Anbindung/kein Auto-Matching. differenz_zahlung/zahlungsstatus per Service aus zahlbetrag vs. rechnungsbetrag.
  gebucht_beim_steuerbuero boolean,      -- sperrt Positions-Änderungen (7v-Hinweis)
  report_monat text                      -- 'YYYY-MM' → Reporting-View
```

### `beleg_position` (ex ZC/AC/CC — eine Tabelle)
```sql
beleg_position
  id,
  angebot_id  -> angebot  null,
  auftrag_id  -> auftrag  null,
  rechnung_id -> rechnung null,
  constraint one_parent check (num_nonnull(angebot_id, auftrag_id, rechnung_id) = 1),
  pos_nr int,
  artikel_id -> artikel,                 -- Referenz (ex 'ARTIKEL AUSWÄHLEN')
  artikel_name text,                     -- Snapshot (ex .'Artikelname Belege')
  artikel_beschreibung text,             -- Snapshot
  anzahl numeric(10,2) default 1,
  einzelpreis numeric(12,2),             -- eingefroren (kundentier-abhängig, §6)
  rabatt_prozent numeric(6,3) default 0, -- pro Zeile (Screenshot 13·5)
  gesamtpreis numeric(12,2),             -- = anzahl*einzelpreis*(1-rabatt/100)  GENERATED
  re_relevant boolean default true,      -- steuert Druck/Summen/Nummerierung
  vk_retail_wert numeric(12,2),          -- Listenwert-Referenz
  herkunft_slot_key text null            -- welcher Spec-Slot diese Position erzeugt hat (für Regenerate/Diff)
```

---

## 3.6 Fertigung

```sql
arbeitsschritt_vorrat  -- ex PB (Schritt-Katalog)
  id, nr int unique,                     -- 81 Montage, 84 Reparatur, 93 Cites, 94 F&W, 95 Rechnung, 96 Ausfuhr, 99 Versendet
  workstep text, workstep_en text,
  reihenfolge int,                       -- "Order" (29 = Kiste packen, Sonderfall 7h/7s/7t)
  typ vorrat_typ_enum,                   -- WERKSTATT | OFFICE
  part text, part_farbe text,            -- Farb-Banding der Zeile (7u)
  gruppe vorrat_gruppe_enum              -- Holzauswahl|CNC|Lackieren|Endmontage|Endkontrolle/Versand|…

arbeitsschritt         -- ex D (je Auftrag)
  id, auftrag_id -> auftrag, vorrat_id -> arbeitsschritt_vorrat,
  status schritt_status_enum,            -- OFFEN | ERLEDIGT | WARTEN_AUF | KISTE_VOLLSTAENDIG
  erledigt_am timestamptz, erledigt_von_id -> app_user null,  -- ex MA (kein Freitext mehr, 7r)
  bemerkung_bearbeiter text,
  warten_auf text null,
  dauer_minuten int null,                -- E13: optionale manuelle Zeiterfassung (kein Timer)
  -- ThisNext ist ABGELEITET (7s/7t): kleinste offene reihenfolge ≠ 29 je Auftrag → nicht gespeichert
```

**State-Machine (Service, ex Ninox-Trigger 7g + 7s):**
- Neuer `auftrag` (Art PRODUKTION): Standard-Schritte aus `arbeitsschritt_vorrat WHERE typ IN (WERKSTATT,OFFICE)`
  minus {93,94,96}. Art NONE_GUITAR/SERVICE: keine Schritte, Status NONE_GUITAR/SERVICE.
- Schritt → ERLEDIGT: Stempel setzen; erster Schritt & Auftrag=BACKORDER → WERKSTATT (+`werkstattbeginn`);
  Schritt 81 (Montage) → Auftrag PROD_FERTIG (+`endmontagedatum`, Rest-Werkstatt-Schritte auto-erledigt);
  Schritt 99 (Versendet) → Auftrag ABGESCHLOSSEN (+`versanddatum`).
- Auftrag → ABGESCHLOSSEN nur mit vorhandener Rechnung (Guard 7g), sonst Rückfall.
- `recomputeComplianceSteps(auftrag)` (ein Helper, ex 7d/7j): Schritt 93 wenn geschütztes Holz;
  94 wenn `kd_region=USA`; 96 wenn `kd_region` ∉ {D,EU}; 84 wenn Art=SERVICE.
- `recomputeNextStep(auftrag)` (ein Helper, ex 7s/7t).

---

## 3.7 Compliance / Holz

```sql
holzart                -- ex NKS Holzarten TF
  id, holz, botanischer_name, herkunft, holzdichte numeric(8,3), species, genus, info

holz_volumen           -- ex NKS Parts Volumen SF ("NKS Gewichte")
  id, artikel_id -> artikel, artikelgruppe artikelgruppe_enum, volumen_m3 numeric(12,7)

-- View statt Tabelle (User bestätigt: reine View, 7d):
CREATE VIEW holzposition AS
SELECT sb.auftrag_id, sb.slot_key, a.id AS artikel_id,
       a.name_lang, ha.holz, ha.botanischer_name, ha.herkunft,
       hv.volumen_m3, a.gewicht_kg, a.vk_eur_net,
       (ha.botanischer_name ILIKE 'Dalbergia nigra%') AS braz_rosewood,
       a.geschuetztes_holz_cites
FROM spec_belegung sb
JOIN artikel a  ON a.id = sb.artikel_id
JOIN holzart ha ON ha.id = a.holzart_id
LEFT JOIN holz_volumen hv ON hv.artikel_id = a.id AND hv.artikelgruppe = a.artikelgruppe
WHERE sb.auftrag_id IS NOT NULL
  AND sb.slot_key = ANY (HOLZ_SLOTS)
  AND a.holzart_id IS NOT NULL;
```
CITES-/Lacey-Beleg rendern aus `holzposition` (§3.8). `cites_artikelanzahl`,
`gesamtgewicht_holz_kg`, `gesamtgewicht_brazrw_kg` am Auftrag = Aggregate der View, per Service gesetzt.

---

## 3.8 Kommunikation / Dokumente

```sql
beleg_template         -- ex Druck Templates CD  (Ziel: 1 aktives je Belegart)
  id, belegart doc_art_enum,  -- ANGEBOT|AUFTRAGSBESTAETIGUNG|RECHNUNG|LIEFERSCHEIN|ZERTIFIKAT|CITES|LACEY
  name, html text,            -- HTML mit Handlebars-Platzhaltern; Sprache+Steuer via {{#if}}
  aktiv boolean
  -- Vertriebsweg-Varianten via Template-Logik (Retail-Spalte ein/aus), nicht via Datensatz

mail_template          -- ex Textvorlagen ID  (#6 DE / #7 EN → Belegart × Sprache)
  id, belegart doc_art_enum, sprache sprache_enum, betreff, body_html
  -- Platzhalter: {{briefanrede}} {{auftragsnummer}} {{model}} {{rechnungsnummer}} …

mailversand            -- ex AD
  id, art mail_art_enum,      -- ANGEBOT|AUFTRAGSBESTAETIGUNG|RECHNUNG|GUTSCHRIFT|…
  status mail_status_enum,    -- ENTWURF|VERSENDET|FEHLER|ERFOLG
  angebot_id null, auftrag_id null, rechnung_id null, kunde_id,
  an, cc, bcc, betreff, body_html, wiedervorlage date,
  ... audit  (erzeugen ≠ senden — separater Schritt)

anhang                 -- ex Anhänge_ BD + Bilder + generierte PDFs
  id, mailversand_id null, angebot_id null, auftrag_id null, rechnung_id null,
  art anhang_art_enum, dateiname, pfad, groesse, mime
```

**Beleg-Renderer** `renderBeleg(record, profil)` — ein parametrisierter Generator (ersetzt die
5 fast-gleichen Ninox-Scripts Schritt 4 / 7n / 7o / 7v):
```
profil: { belegart, kopfquelle, summenquelle, positionsquelle,
          empfaenger, mailArt, mitPreise, zusatzEuNote }
```
- **`ZusatzEU`-Fußnote strikt an das Steuerergebnis koppeln** (7v-Bug): MwSt berechnet ⇒ keine Note;
  `kd_steuerpflichtig=false` + EU ⇒ „innergemeinschaftliche Lieferung"; + non-EU ⇒ „Ausfuhrlieferung".
- Empfänger-Regel je Belegart: Angebot → `kunde.email`; AB/Rechnung → primärer Ansprechpartner.
- Dateiname sauber (kein `.pdf.pdf`).

---

## 3.9 Holzinventar & Benutzer

```sql
lagerort               -- ex Lagerorte IF
  id, code, bezeichnung

holz_inventar          -- physische Holzblanks — ex FF Holzbestand (33 Felder, akt. nur 7 Datensätze)
  id, inventar_id text unique,          -- scan-/QR-fähig ('JFYNY')
  holzart_id -> holzart, unterart, struktur,
  qualitaet holz_qualitaet_enum,        -- STANDARD | EXCEPTIONAL
  dicke holz_dicke_enum,                -- DUENN | DICK
  groesse holz_groesse_enum,            -- STANDARD | RIETBERGEN
  piece holz_piece_enum,                -- EIN_PC | ZWEI_PC
  fuer holz_verwendung_enum,            -- TOP|BODY|NECK|FRETBOARD
  cnc holz_cnc_enum,                    -- STANDARD|59DICK|HOLLOW_BODY|HONEYCOMB
  gewicht_g int, besonderes, bemerkung, eingang_am date,
  lagerort_id -> lagerort, status holz_status_enum,  -- FREI|RESERVIERT|VERBAUT
  status_geaendert_am date,
  reserviert_fuer_auftrag_id -> auftrag null,
  holzhaendler_id -> kunde null, einkaufspreis numeric(12,2),
  profit_margin numeric(12,2), verkaufspreis numeric(12,2),
  bild_asset_id -> anhang

app_user               -- ex Mitarbeiter NB + Ninox-User
  id, name, email unique, passwort_hash, aktiv boolean,
  rolle rolle_enum,                     -- ADMIN | BUERO | WERKSTATT
  kann_werkstatt boolean,              -- ex NB.V (im Schritt-Picker)
  kann_todo boolean                    -- ex NB.U
```

---

## 3.10 Lagerhaltung / Bestellvorschläge / Inventur  (nur `artikeltyp = HANDELSWARE`)

Neu strukturiert (Ist: `CE Bestellübersicht`, `JC/KC Bestellung*`, `IC/HC Inventur*`). Betrifft
ausschließlich Handelsware (Hardware, Pickups, Kleinteile).

```sql
lagerbestand           -- aktueller Bestand je Handelsware-Artikel (oder als View aus lagerbewegung)
  artikel_id -> artikel, menge numeric(12,3), primary key (artikel_id)

lagerbewegung          -- Zu-/Abgänge (Einkauf, Verbrauch im Auftrag, Inventurkorrektur)
  id, artikel_id -> artikel, menge numeric(12,3), art bewegungsart_enum,  -- ZUGANG|ABGANG|KORREKTUR
  auftrag_id null, bestellung_id null, inventur_id null, datum, bemerkung

bestellung             -- Bestellung an einen Lieferanten
  id, lieferant_id -> kunde, status bestellstatus_enum,  -- ENTWURF|BESTELLT|TEIL_GELIEFERT|GELIEFERT
  bestelldatum, lieferdatum_erwartet, bemerkung
bestellposition
  id, bestellung_id -> bestellung, artikel_id -> artikel,
  menge numeric(12,3), ek_preis numeric(12,2), menge_geliefert numeric(12,3)

inventur
  id, stichtag date, status inventurstatus_enum, bemerkung
inventurposition
  id, inventur_id -> inventur, artikel_id -> artikel,
  soll_menge numeric(12,3), ist_menge numeric(12,3), differenz numeric(12,3) GENERATED
```

**Bestellvorschlag** = View: Handelsware mit `lagerbestand.menge < artikel.bestand_min`,
Vorschlagsmenge bis `bestand_max`, gruppiert nach Lieferant → per Klick in `bestellung` übernehmen.

```sql
betriebsmittel         -- ex OF Inventar (303 Datensätze): Werkstatt-Verbrauchsmaterial,
                       -- NICHT im Artikelstamm/BOM (Schleifmittel, Klebeband, Arbeitsschutz,
                       -- Lack/Beize, Kleber, Packraum, Elektronik/Hardware fürs Lager)
  id, bezeichnung, artikelnummer,
  hersteller text, lieferant text,           -- Alt: feste Auswahllisten → freie Textfelder + optional kunde-Ref
  produktkategorie betriebsmittel_kat_enum,   -- SCHLEIFMITTEL|INLAYS|KLEBEBAND|ARBEITSSCHUTZ|LACK_BEIZE|
                                              --   HILFSMITTEL_LACK|PACKRAUM|KLEBER|MERCH|ELEKTRONIK|TONABNEHMER|HARDWARE|MECHANIK
  einheit einheit_enum,                        -- STUECK|KG|L|G|M|ROLLE|SATZ|PAAR|ML
  menge numeric(12,3), einkaufspreis numeric(12,2),
  wert numeric(12,2) GENERATED,               -- menge * einkaufspreis
  anmerkungen
```
Eigenes, leichtes Inventur-Modul (flache Liste + Mengenkorrektur). Bewusst getrennt vom Artikelstamm,
weil es kein verkaufsfähiges Teil / keine Stücklistenposition ist.

---

## 4. Ninox-Formeln → Zielmechanismus (362 `fn`-Felder)

| Kategorie | Beispiele | Ziel |
|---|---|---|
| **Anzeige/abgeleitet, gleiche Zeile** | `Anzeigename`, `Bauplan` (aus `bauplandatum`), `Nr` | **`GENERATED ... STORED`**-Spalte oder View-Spalte |
| **Aggregat über Kinder** | `Summe Netto/MwSt/Brutto`, `SummePositionen`, `Cites-Artikelanzahl`, `Stand HE` | **Service-Funktion**, schreibt Ergebnis in Kopf-Spalte bei jeder Kind-/Rabattänderung; Reporting-Aggregate als **Materialized View** |
| **Cross-Table-Lookup** | Template-Auswahl, `Zahlungsbedingung.Bezeichnung`, Preis-Tier | **View** oder App-Query im Service-Layer |
| **Seiteneffekt-Trigger** (`afterUpdate`/`afterCreate`) | Statuswechsel-Kaskaden, Compliance-Schritte, Spec-Copy, Snapshot-Kopie, Serienr-Vergabe | **App-Service-Funktionen** (`/lib/domain/*`), *nicht* DB-Trigger — testbar, nachvollziehbar, ein Ort pro Regel |
| **Formatierung** | `format(x,"#,##0.00")`, Datums-`format` | **UI-/`Intl`-Layer**, nie in der DB |
| **Tote/vestigiale Logik** | `if Vertriebsweg like "us"` (beide Zweige gleich), `Dashboard-Kram` | **weglassen** |
| **Bekannte Bugs** | `_K`-Verwechslungen (7y), `ZusatzEU` nur nach Region (7v), `Stand HE Wert` ×100? (7h), Lieferschein-Template (7o) | **korrekt neu**, in Tests fixiert |

---

## 5. Enum-Katalog (Auszug — finalisieren beim Import)

```
region:        D | EU | WELT | ASIEN | USA
sprache:       DE | EN
waehrung:      EUR | USD
kontaktart:    KUNDE | LIEFERANT | HAENDLER | ARTIST | HOLZHAENDLER | INDUSTRIE | SONSTIGE
vertriebsweg:  NET1 | NET2 | NET_US | VK_US | VK_EUR
artikelgruppe: MODEL | BODY | TOP | BACK_TOP | BODY_FINISH | COLOUR | TOP_FINISH | … (~55, dedupliziert)
artikeltyp:    HOLZ | HANDELSWARE            -- E9: von 4 Alt-Werten auf 2 reduziert; null = Modell/Konfig-Option
auftragsart:   PRODUKTION | NONE_GUITAR | SERVICE     -- E8: "Promotion" nicht modelliert
auftrag_status: BACKORDER | WERKSTATT | BEI_NICL | PROD_FERTIG | SERVICE |
                NONE_GUITAR | ABGESCHLOSSEN | ABGESCHL_OHNE_BEFUND | STORNIERT
angebot_status: NEU | VERSENDET_OFFEN | AUFTRAG | VERLOREN | VERWORFEN
rechnung_belegart: RECHNUNG | STORNORECHNUNG | GUTSCHRIFT
rechnung_status:   OFFEN | BEZAHLT | STORNORECHNUNG | GUTSCHRIFT | RG_STORNIERT
zahlungsstatus:    ANGEZAHLT | TEILZAHLUNG | BEZAHLT | ANGEMAHNT
bank:          VVB | CHASE | PAYPAL
produktionsort: RODGAU | HAMBURG
schritt_status: OFFEN | ERLEDIGT | WARTEN_AUF | KISTE_VOLLSTAENDIG
vorrat_typ:    WERKSTATT | OFFICE
doc_art:       ANGEBOT | AUFTRAGSBESTAETIGUNG | RECHNUNG | LIEFERSCHEIN | ZERTIFIKAT | CITES | LACEY
rolle:         ADMIN | BUERO | WERKSTATT
```

---

## 6. Preislogik (§3.3 / 7·3 / 7bb)

> **Für die Beleg-Erstellung ist die Preisermittlung trivial** (Rainer): Jeder Kunde hat **genau einen**
> Vertriebsweg. Im Artikelstamm gibt es je Vertriebsweg **einen 1:1-Preis**. Positions-Einzelpreis =
> dieser Preis, direkt nachgeschlagen (Ausnahme: Kunden-Sonderrabatt, s. u.). **Keine Preislogik im Beleg.**

**Steuermatrix** (bestimmt `kunde.steuerpflichtig` als Default beim Land-Setzen, danach editierbar; MwSt-Satz aus `firma_setting.mwst_satz` = 19):

| Kontaktart | Region D | Region EU | Welt / Asien / USA |
|---|---|---|---|
| Händler | **19 %** | 0 % | 0 % |
| Kunde | **19 %** | **19 %** | 0 % |
| Artist | **19 %** | **19 %** | 0 % |

Alle übrigen Kontaktarten (Lieferant, Holzhändler, Industrie, Sonstige) sind nicht verkaufsrelevant.
Beleg-Steuerbefreiungs-Fußnote (`ZusatzEU`) **an dieses Ergebnis** koppeln, nicht an die Region allein (7v, E-Rechnung-Pflicht 7dd).
> **Alle Rabatte/Nachlässe werden manuell** im Angebot/Auftrag eingetragen (Position `rabatt_prozent`
> und/oder `gesamtrabatt_*`) — keine automatischen Rabattregeln.
> Die folgenden Formeln betreffen nur die **Pflege der 5 Tier-Preise im Artikelstamm**, nicht die Belege.

**Artikel-Tiers** — exakte Ninox-Formeln (aus `.fn`), Rabatt-%-Sätze ex Singleton `NF` → `firma_setting`:
```
vk_eur, vk_us                          -- manuelle Eingabe
vk_eur_net = brutto_fuer_netto ? round(vk_eur,2) : round(vk_eur / 1.19, 2)   -- 1.19 HARTKODIERT (nicht mwst_satz!)
net1  = brutto_fuer_netto ? vk_eur : nicht_rabattierfaehig ? vk_eur_net : round(vk_eur * (1 - haendlerrabatt_net1/100), 2)
net2  = brutto_fuer_netto ? vk_eur : nicht_rabattierfaehig ? vk_eur_net : round(vk_eur * (1 - haendlerrabatt_net2/100), 2)
net_us = (brutto_fuer_netto || nicht_rabattierfaehig) ? round(vk_us,2) : round(vk_us * (1 - us_haendlerrabatt/100), 2)
usd_eur_faktor = vk_us / vk_eur        -- ABGELEITET (nicht Eingabe, trotz UI-Anschein)
-- Modell-Kopfwerte "Specs VK EUR / NET1 / NET2" = einfach vk_eur / net1 / net2 des Modell-Artikels
```
`firma_setting`-Felder dafür (ex `NF`): `haendlerrabatt_net1` (NF.N), `haendlerrabatt_net2` (NF.O),
`us_haendlerrabatt` (NF.E), `import_faktor` (NF.B), `dollarkurs_faktor` (NF.C), `versand_butz` (NF.K).
**Prüfen:** die `/ 1.19` fest verdrahtet – im Ziel an `mwst_satz` koppeln? (❓, s. E16)
**Positions-Einzelpreis** (Generator):
1. **Sonderrabatt hat Vorrang** — wenn `beleg.kd_sonderrabatt_prozent` gesetzt (aus `kunde.sonderrabatt_prozent`,
   für Artists/Musiker/besondere Händler):
   `einzelpreis = round( (kd_waehrung = USD ? artikel.vk_us : artikel.vk_eur_net) * (1 - kd_sonderrabatt_prozent/100), 2)`
2. sonst schlichter Lookup nach `beleg.kd_vertriebsweg` →
   `NET1→net1 · NET2→net2 · NET_US→net_us · VK_US→vk_us · VK_EUR→vk_eur_net`.

Porto immer Retail (`VK_EUR→vk_eur_net`, `VK_US/NET_US→vk_us`) — kein Händlerrabatt (7l).
`kd_sonderrabatt_prozent` wird wie die übrigen `kd_*` beim Kundenwählen **gesnapshottet**.
Der Sonderrabatt wirkt auf den **Netto**-Retail (`vk_eur_net` / `vk_us`) und **stapelt** sich mit den
manuellen Positions-/Gesamtrabatten (erst Sonderrabatt in den Einzelpreis, dann ggf. Handrabatt obendrauf) —
theoretischer Fall, kommt praktisch nicht vor.
**Modellpreis** = Modell-`<tier>` + Σ(Spec-Delta `<tier>` wo `aufpreis`).
**Rabatt**: 100 % manuell — `beleg_position.rabatt_prozent` je Zeile, optional `gesamtrabatt_*` (nur Auftrag/Rechnung).
**Preise sind Snapshots** — im Beleg eingefroren, bei Kundenwechsel neu generieren (7m-Warnung → im Ziel erzwungen).
Sonderfall Menge: `Colour`-Position `anzahl` aus dem gewählten *Colour Set* (1/2/3) — Mengen-, keine Preisregel.

**Artikelstamm-Pflege** (nicht beleg-relevant): die 5 Tier-Preise werden im Artikel gepflegt, teils
abgeleitet aus `vk_eur`/`vk_us` per Rabatt-% (`firma_setting`), s. o. Der US-Preisermittlungs-Wasserfall
(Import-% → USD-Kurs → Versand+BUTZ → „Dealer Pricing müsste") ist eine **Kalkulationshilfe für die
Preispflege**, kein Beleg-Baustein — bei Bedarf als kleiner Rechner im Artikel-UI.

---

## 7. Import / Migration aus dem Ninox-Backup

1. **Quelle:** `data.db` (Zeile 1 = Schema, Rest `U<Typ><id>:{…}` = aktueller Stand je Datensatz).
   Alternativ Ninox-REST-API als Cross-Check.
2. **Feld-Mapping** je Ninox-`typeId`/`fieldId` → Zielspalte (Mapping-Tabellen in `/lib/import`).
3. **ID-Mapping:** Ninox-Record-IDs → neue UUIDs (Zwischentabelle). **Spec-Slots referenzieren `artikel.nr_lfd`
   (ex `T7`)**, nicht die Record-ID → separater `nr_lfd → artikel.id`-Index.
4. **Enums:** Alt-Zahlencodes → neue Enum-Werte (Lookup je Feld); Duplikate „Nut"/„Sonstiges" zusammenführen.
5. **Anhänge:** aus dem ZIP-Baum `files/…` extrahieren, `anhang`-Datensätze + Dateiablage.
6. **Nicht importieren:** `*_alt`-Tabellen (Modellvorlagen_alt, Eingangsrechnungen_alt, Zeiten alt),
   Dashboard-/Widget-Interna, RGB-Spielerei, Farb-Hilfstabellen, „Rio Palisander" (0). Einzeln prüfen (§4 MIGRATION).
7. **Reihenfolge:** Settings → Staaten/Zahlungsbed. → Holzart/Volumen → Artikel → artikel_modell →
   Kunden/Ansprechpartner → Modelle-Specs → Angebote → Aufträge (+Specs, Positionen, Arbeitsschritte) →
   Rechnungen → Mailversand/Anhänge → Holzinventar.
8. **Verifikation:** Summen-Stichproben (Umsatz je Monat vs. Report Monat), Anzahl je Tabelle, PDF-Vergleich
   an 10 Referenzbelegen.

---

## 8. Offene Entscheidungen (mit Empfehlung)

| # | Frage | Empfehlung |
|---|---|---|
| E1 | Backend/DB/Hosting | ✅ **Supabase Postgres (Frankfurt) + Drizzle + Next.js auf Vercel** (DSGVO-Haltung A). Auth + Storage von Supabase. Datenzugriff serverseitig, Autorisierung im Service-Layer |
| E2 | Beleg-PDF: HTML→Puppeteer vs React-PDF | ✅ **HTML→Puppeteer** als **Vercel Function** (`fra1`); ZUGFeRD-XML einbetten (E15); Fallback EU-Render-Dienst |
| E3 | Specs: Kind-Tabelle vs Flachspalten | ✅ **Kind-Tabelle `spec_belegung`** + Metadaten-Tabelle `spec_slot` + Frontend-Spiegel (§3.4) |
| E4 | Positionen: eine Tabelle vs drei | ✅ **eine `beleg_position`** mit nullable Parent-FKs + CHECK |
| E5 | Summen: `GENERATED` vs Service | ✅ **Service** (`/lib/domain`) berechnet + schreibt Kopf-Felder bei jeder Positions-/Rabattänderung |
| E6 | Seriennummer: Lücken-Reuse vs monoton | ✅ **monoton** — DB-Sequenz ab aktuellem Max, gelöschte Nr = dauerhafte Lücke |
| E7 | Steuerlogik: `steuerpflichtig`-Feld beibehalten oder rein aus Kontaktart×Region ableiten | ✅ **Feld beibehalten**, beim Land-Setzen als Default füllen (7b), Override erlaubt; Beleg-Fußnote ans Steuerergebnis koppeln (7v) |
| E8 | Auftragsart „PROMOTION" (rote Nummernfarbe) | ✅ **verworfen** — nicht modelliert, `auftragsart` bleibt 3 Werte |
| E9 | `artikeltyp` (veraltet) | ✅ **2 Werte: HOLZ \| HANDELSWARE** (null bei Modell/Konfig-Option). Beim Import ableiten: `artikelgruppe=MODEL`→null; `NKS Holzart` gesetzt→HOLZ; Lieferant/Bestand→HANDELSWARE; Finish/Colour/Scale/Colour-Set→null; Rest → ❓ manuell prüfen. **HANDELSWARE** triggert die Module Lagerhaltung / Bestellvorschläge / Inventur (§3.10, neu) |
| E10 | Holzinventar-Quelltabelle | ✅ geklärt: **`FF Holzbestand`** (33 Felder, 7 Sätze) → `holz_inventar`. `OF Inventar` (303) ist **etwas anderes** — Werkstatt-Verbrauchsmaterial → eigenes `betriebsmittel`-Modul (§3.10), nicht im Artikelstamm |
| E11 | Reporting | ✅ **Neuentwurf** — Views/Materialized Views + Charts, `Report Monat`-Tabelle nicht migrieren (7z) |
| E12 | Kalkulation (Modell) | ✅ **Neuentwurf** — echte Stücklisten-/Arbeitszeitkalkulation, Deckungsbeitrag je Tier (7y) |
| E13 | Zeiterfassung an Arbeitsschritten | ✅ **optional, manuelle Eingabe** durch Benutzer: Feld `arbeitsschritt.dauer_minuten` (nullable), Aggregat `auftrag.arbeitsstunden` → speist E12-Kalkulation. Kein Timer-Zwang |
| E14 | Bauplanung-Monats-Board | ✅ **Neuentwurf** + **automatischer Bau-Vorschlag je Monat** über Regel-Query (§9.3) |
| E15 | **E-Rechnung**-Format (Pflicht ab 1.1.2027; Zieltermin 11/2026) | ✅ **ZUGFeRD 2.x, Profil EN 16931** — mit dem Steuerbüro abgestimmt (02.09.2026). Begründung: das PDF/A-3 bleibt für Menschen lesbar, das EN-16931-XML ist eingebettet. Kein separates XRechnung-XML nötig (ZUGFeRD EN 16931 ist konform; reine XRechnung nur bei B2G-Pflicht — für NHG nicht relevant). Pflichtfeld-Mapping: MIGRATION 7dd. Erzeugung in der PDF-Vercel-Function (E2) |
| E16 | Steuer-/Preis-Feinheiten | ✅ Steuer = Kundenfeld `steuerpflichtig` (Matrix s. u.). `vk_eur_net = vk_eur / (1 + mwst_satz/100)` — an `firma_setting.mwst_satz` gekoppelt |
| E19 | **Kunden-Sonderrabatt** auf VK_EUR/VK_US (Artists, Musiker, besondere Händler) | ✅ Feld `kunde.sonderrabatt_prozent` (nullable); **hat Vorrang** vor der Vertriebsweg-Logik (§6); auf Beleg gesnapshottet |
| E17 | Supabase Free-Tier reicht zum Bauen (500 MB DB, 1 GB Storage)? Import der 5.528 Altdateien? | 🟡 **Free zum Bauen ok**; produktiv **Pro** (~25 $/M, 8 GB DB, 100 GB Storage). Altdateien-Volumen beim Import prüfen |
| E18 | Auth/Session: Supabase Auth im Next.js | 🟡 `@supabase/ssr` (Cookie-basierte Server-Sessions); Rolle aus `app_user` + JWT-Claim fürs UI; sensible Mutationen serverseitig |

---

## 9. Neuentwurf-Module (E11 / E12 / E14)

Diese drei sind in Ninox nur rudimentär bzw. als 45-Formeln-Tabelle vorhanden → im Ziel als
eigenständige Module, nicht 1:1 portiert. Detail-Design jeweils in einer eigenen Runde später.

### 9.1 Reporting (E11)
- Basis: `rechnung` + `auftrag` + `beleg_position`, live aggregiert über **Materialized Views**
  (`report_monat`, `report_jahr`), nächtlich + on-demand refreshbar.
- Kennzahlen wie heute (7z): Umsatz Gitarren EUR/USD, Non-Guitar, Skonto, Storno, Ø Gitarre,
  Endmontage-Anzahl/-Umsatz, Kostendeckung (gegen `kostenziel_monat`), kumulierte Werte, offene Rechnungen.
- Charts (Umsatz-Verlauf, Stückzahl) direkt im Frontend.
- **Excel-Export** via `exceljs` als echter Download: Blatt „Rechnungsausgang" (Monat) + Blatt „KPIs".
- Ersetzt Tabelle `Report Monat` (TD) **und** die CSV-in-Link-Feld-Exporte (auch Adressen-Historie).

### 9.2 Kalkulation (E12)
- Je Modell: **Materialkosten** = Σ `beleg_spec`-Artikel-`ek_netto_eur` (aus Specs-Artikelliste, 7y)
  \+ `kleinteile_pauschale`.
- **Arbeitskosten** = `plan_arbeitsstunden` (je Modell hinterlegt) × `kostensatz_stunde` (aus `firma_setting`).
  Ist-Wert-Abgleich über `auftrag.arbeitsstunden` (E13).
- **Produktionskosten** = Material + Arbeit. **Deckungsbeitrag je Tier** = `net1|net2|vk_eur_net` − Produktionskosten.
- Soll-Marge-Ampel je Modell.

```sql
modell_kalkulation           -- 1:1 zu artikel(artikelgruppe=MODEL)
  artikel_id -> artikel primary key,
  kleinteile_pauschale numeric(12,2),
  plan_arbeitsstunden numeric(8,2),
  -- material_kosten, arbeits_kosten, produktionskosten, db_net1, db_net2, db_vk : GENERATED / View
```

### 9.3 Bauplanung-Monats-Board (E14)
- Board je Monat: zugeordnete Aufträge (`bauplandatum` im Monat), Aggregat Anzahl + Umsatzerwartung
  gesamt und je Modellgruppe, **Soll/Ist gegen `modellgruppe.min_menge_monat` / `max_menge_monat`**
  (Kapazitäts-Ampel). Aufträge per Drag/Zuweisung auf Monate schieben (= `bauplandatum` setzen).
- **Automatischer Bau-Vorschlag** (`planungsvorschlag(monat)`): Regel-Query, die aus den noch
  **nicht terminierten** Aufträgen (`bauplandatum IS NULL`, Status BACKORDER/WERKSTATT) eine
  Monatsbelegung vorschlägt.
  Regel-Eingaben (zu verfeinern mit dir):
  - Kapazität je Modellgruppe: fülle bis `min_menge_monat`, höchstens `max_menge_monat`
  - Gesamt-Kapazität: Ziel-Stückzahl / Ziel-Umsatz des Monats
  - Priorisierung: `auftrag.prio`, dann Auftragsalter (`auftragsdatum` aufsteigend), dann Umsatzerwartung
  - Harte Filter: kein Service/NoneGuitar, Kunde vollständig, ggf. Materialverfügbarkeit (Holzreservierung)
  - Ausgabe: Liste „Vorschlag für <Monat>" mit Begründung je Zeile → per Klick übernehmen (setzt `bauplandatum`).

```sql
modellgruppe                 -- ex OD (Kapazitätsbänder)
  id, name, min_menge_monat int, max_menge_monat int,
  durchschnittspreis_eur numeric(12,2), durchschnittspreis_usd numeric(12,2)
```

---

## 10. Nächste Schritte

> Kanonischer Ort dieses Dokuments: **`docs/ZIELMODELL.md` im Repo `nikhuber-guitars`**.
> Die Kopie im OneDrive-Ordner `Huber/` ist ab jetzt nur Archiv.

1. ✅ **Schema-Entwurf** unter `src/lib/db/schema/` (14 Dateien, ~40 Tabellen). `db:generate` läuft,
   `drizzle/0000_*.sql` liegt bei. `// TODO` = offene Details. → **dein Review**.
2. ✅ **`SPEC_SLOTS`-Registry** in `src/lib/db/schema/specs.ts` (47 Slots aus dem Ninox-Schema abgeleitet).
   Noch offen: Seed für Tabelle `spec_slot` + Spiegel `src/lib/specs/`.
3. ✅ **Grundgerüst** — Next.js 16 + Supabase-Auth (`@supabase/ssr`) + Drizzle-Anbindung, 9+5 Platzhalter-Routen,
   `login`-Seite, Proxy-Schutz. Zwei Commits gepusht.
   → user-seitig: `.env.local` mit Supabase-Werten füllen, dann `npm run db:push`.
4. ⏳ **`relations.ts`** + **Service-Layer-Spezifikationen** (`src/lib/domain`): je ein Ablauf-Doc für die
   ex-Trigger/Generatoren (Angebot→Auftrag, Positions-Generator, Auftragsstatus-State-Machine,
   Arbeitsschritt-Trigger, Compliance-Schritte, Serien-Nr, Summen-Berechnung, Beleg-Erzeugung).
5. ⏳ Import-Feld-Mapping je Kern-Tabelle → ETL-Skript (Ninox-Backup → Supabase via Drizzle).
6. ⏳ Beleg-HTML-Templates aus `Druckausgaben/*.docx` (1 je Belegart, DE/EN + Steuerblock parametrisch)
   + ZUGFeRD-XML-Mapping (7dd).

**User-seitig offen:** Vercel-Projekt anlegen, AVV mit Supabase + Vercel + Mail-Provider.
**Geklärt:** Backend = Supabase-Frankfurt + Vercel (Haltung A); Preisermittlung = simpler Vertriebsweg-Lookup,
Rabatte 100 % manuell (§6); Zahlung = manuelle Erfassung durch Büro/Johannes, keine Bank-Anbindung (§3.5);
**E-Rechnung = ZUGFeRD 2.x Profil EN 16931** (E15, mit Steuerbüro abgestimmt); `.env.local` + Schema-`db:push` erledigt;
**Ninox-Import komplett** (~340k Zeilen).
