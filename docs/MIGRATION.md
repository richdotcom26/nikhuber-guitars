# Ninox → Web-App Migration · Nik Huber Guitars

Arbeitsdokument. Hält Erklärungen von Rainer + Analyse-Ergebnisse strukturiert fest.
Stand: 2026-09-01

---

## 1. Zielbild

- **Eigene Web-App, selbst gehostet** (Next.js + PostgreSQL) auf Hostinger-VPS / Plesk.
  Gleiche Linie wie Serienbrief-Generator und Makler-Portal.
- Ninox-DB "1 Nik Huber Guitars" wird abgelöst.
- Belege: **je Belegart genau ein Template**, das Sprache (DE/EN) und Steuer
  (19 % innerhalb DE / 0 % außerhalb) selbst umschaltet.
  Belegarten: Angebot, Auftragsbestätigung, Rechnung, Gutschrift/Stornorechnung.

## 2. Quellen im Repo

| Pfad | Inhalt |
|---|---|
| `Ninox Datenbank Backup/1 Nik Huber Guitars.ninox` | 2,4 GB ZIP: `data.db` (Schema + Daten + Views als JSON-Event-Log, 180.449 Zeilen) + 5.528 Dateianhänge + `reports/*/report.json` |
| `AnsichtenFrontend/` | Screenshots der Ninox-UI, nach Bereich sortiert (Todo, Adressen, Angebote, Aufträge, Arbeitsschritte, Rechnungen, Artikel, Modelle, Holzbestand) |
| `Druckausgaben/` | 24 Word-Belegvorlagen `Sprache_Währung_Belegart_Steuersatz` + CITES-/Lacey-/Zertifikat-Vorlagen |
| `Logo/` | Firmenlogo |

Ninox REST-API: Basis `https://api.ninox.com/v1`, DB-Name "1 Nik Huber Guitars",
dbid `kfbmo21ue9l8`. API-Key liegt bei Rainer. (Bevorzugte Datenquelle für die
finale Migration; `data.db` ist der Fallback.)

## 3. data.db Format

Zeile 1: `s:{...}` = komplettes Schema (`types`, `globalCode`, …).
Weitere Zeilen:
- `V<id>:{...}` = View-Definition
- `U<TypeId><recordId>:{...}` = Datensatz (Feld-Keys = Feld-IDs; `_cd/_cu/_md/_mu` = created/modified meta)

## 4. Tabellen (Ninox "types")

67 Tabellen, ~180.000 Datensätze. TypeId = interner Key im Schema.

### Kern
| TypeId | Name | Felder | Datensätze | Rolle |
|---|---|---:|---:|---|
| WB | Artikel | 179 | 1.336 | **Zentrum.** Modelle + Specs + Quelle aller Spec-Dropdowns |
| A | Aufträge | 252 | 2.280 | Auftragsabwicklung; Reiter "Details" = Specs |
| YC | Angebote | 143 | 1.079 | wie Artikel/Aufträge aufgebaut |
| BC | Rechnungen | 65 | 1.819 | inkl. Gutschrift/Storno |
| MC | Adressen | 103 | 1.463 | Kunden |
| SE | Ansprechpartner | 14 | 1.256 | zu Adressen |

### Positionen
| TypeId | Name | Datensätze |
|---|---|---:|
| AC | Auftragspositionen | 44.832 |
| ZC | Angebotspositionen | 32.170 |
| CC | Rechnungspositionen | 7.663 |

### Fertigung / Holz
| TypeId | Name | Datensätze |
|---|---|---:|
| D | Arbeitsschritte-Auftrag | 64.760 |
| PB | Arbeitsschrittevorrat | 35 |
| FF | Holzbestand | 7 |
| VF | Holzpositionen | 10.718 |
| HF | Holzart | 17 · KF Unterart 16 · TF NKS Holzarten 23 |

### Weitere aktive
AD Mailversand 2.632 · BD Anhänge_ 3.343 · CF Serviceaufträge 18 · DD Einstellungen 1 ·
ED Zahlungsbedingungen 7 · EF HE 24 · FE Bauplanung 1 · GF Besonderes 1 · IC Inventur-Positionen 378 ·
ID Textvorlagen 5 · IF Lagerorte 78 · JF Struktur 5 · KD Dashboard 9 · KF Unterart 16 · NC Lieferadresse 14 ·
NE Farbsuche 4 · NF Allgemein 1 · OF Inventar 303 · PF Erste Hilfe 1 · RF NKS CITES-Aufträge 9 ·
SF NKS Parts Volumen 13 · TC Tickets/ToDos 304 · TD Report Monat 57 · TE ToDo 798 · XC FAQ 14

### Vermutlich Alt-/Hilfstabellen (Migration prüfen, ggf. weglassen)
YB Modellvorlagen_alt (41) · YC-Kollision? nein · YE Eingangsrechnungen_alt (1) · EE Zeiten (alt) (43) ·
ZB Arbeitsschritte-Vorlagen (0) · CD Druck Templates (27) · CE Bestellübersicht (1.196) ·
GC Lagerbewegung (1) · HC Inventur (2) · JC/KC/JD Bestell*/Staaten · KE Kosten Jahr (1) ·
LC Stammdaten (1) · LE Farben (125) · LF Specsartikelliste (1.148) · ME Grundfarben (13) ·
NB Mitarbeiter (22) · OD Modellgruppen (16) · OE Lacktypen (6) · QE Dashboardmenü (1) ·
QF Rio Palisander (0) · RE RGB Spielerei (14) · VC Bilder (11) · VD Reports2 (13) · DC Anhänge (1) ·
DF Seriennummern Historie (34) · GD? · TD Report Monat · KD Dashboard

## 5. Feldtypen (Ninox `base`) gesamt

`fn` Formel 362 · `boolean` 252 · `string` 223 · `dchoice` (dyn. Dropdown) 212 ·
`choice` (feste Liste) 106 · `number` 103 · `rev` Rückreferenz 62 · `ref` Referenz 62 ·
`date` 37 · `file` 27 · `color` 16 · `dmulti` 10 · `html` 8 · `email` 8 · `phone` 6 ·
`link` 5 · `timestamp` 4 · `multi` 3 · `timeinterval` 2 · `time` 1 · `user` 1

→ **362 Formelfelder** = Hauptaufwand. Nicht 1:1; werden zu SQL-Views / berechneten
Spalten / App-Logik, je nachdem ob nur Anzeige oder beleg-/bestandsrelevant.

## 6. Kern-Mechanismus: Artikel + Artikelgruppe + Spec-Dropdowns

### 6.1 Artikelgruppe
- Feld `WB.K` "Artikelgruppe" (feste Auswahlliste, 62 Werte, `nextChoiceId` 72).
- **Jeder Artikel hat genau eine Artikelgruppe.** (Rainer)
- Label-Feld des Artikels: `WB.A` "Artikelname kurz". Für Belege: `WB.X` "Artikelname Belege".
- Artikelnummer: `WB.T7` "Nr" (Formel) — *dieser Wert* wird in den dchoice-Feldern gespeichert.
- `WB.G` VK_EUR · `WB.C2` VK_US · `WB.D2` EK netto EUR.
- `WB.Z7` "Modelselect" (`dmulti`) — ordnet Options-/Sonstiges-Artikel einem oder mehreren Modellen zu.
- `WB.R` "Artikeltyp" (weitere Auswahlliste, noch zu klären).
- `WB.LE` "Geschütztes Holz (Cites)" · `WB.SF` ref → NKS Holzart.
- `WB.G6` "Datensatz schreibgeschützt".

### 6.2 Artikelgruppen-Liste (Wert · #Artikel · steuert ein Spec-Dropdown?)
```
Colour              152  JA      Neck                24  JA
PU Bridge           116  JA      Backplate           24  JA
PU Neck             103  JA      Body Finish         22  JA
PU Mid               68  JA      Tuner               22  JA
Hardware/Parts       65          CNC PU Custom       22  JA
Top                  62  JA      PU Rings            20  JA
Inlays               58  JA      Trussrod Cover      18  JA
Back Top             49  JA      Headstock           16  JA
Poti Knobs           48  JA      Neck Finish         16  JA
Bridge               48  JA      Bridge Type         16  JA
Model                45  JA      Headstock Inlay     14  JA
Body                 39  JA      Fretboard           13  JA
Tailpiece            39  JA      Top Finish          13  JA
Versand              27  JA      Switch Tip          12  JA
                                 Strings             12  JA
Pickguard 10 · Switch 10 · Case 10 · Tuner Buttons 10 · Body Binding 10  (alle JA)
CNC Custom 9 · Hollow Body 8 · Neck Binding 8 · Hardware Colour 7  (JA)
Gurt Pins 5 · Frets 5 · Scale Length 5  (JA)   |  Rechnung 5 · Reparatur 5 (kein Spec)
Nut 4 · Neck Options 3 · Sonstiges 3 · Colour Set 3 · Custom Options 3  (JA)
Body Thickness 2 · Neck Carve 2 · Lefty 1  (JA)
kein Spec-Dropdown: Hardware/Parts 65 · Verbrauchsartikel 6 · Rechnung 5 · Reparatur 5
  · Merchandise 3 · Finish Type 1 · Test 1
leer/ungenutzt: Body Options (nicht verwendet) 0 · PU 0 · Replacement Parts 0 · (leer) 14
```
**Datenqualität:** doppelte Captions mit verschiedenen Choice-IDs — "Nut" (ID 24 + 37),
"Sonstiges" (ID 49 + 70). Bei Migration zusammenführen/bereinigen.

### 6.3 Spec-Dropdowns (`dchoice`)
Ninox speichert in `dchoiceValues` ein Script; Anzeige-Label = `dchoiceCaption`.

- **Artikel (WB), 45 dchoice** — z. B. `U8` Body:
  `((select WB where (text(K) = "Body")) order by A)` — reine Filterung nach Artikelgruppe.
- **Angebote (YC), 46 dchoice** — z. B. `H8` Model:
  `((select WB where (text(K) = "Model")) order by A)` — wie Artikel.
- **Aufträge (A), 52 dchoice** — z. B. `J8` Top:
  `(select WB)[ ((YC != 1) and text(K) = "Top") or (text(K) = "Sonstiges" and chosen(Z7, myMod)) ]`
  wobei `myMod := number(this.PW)` (gewähltes Model).
  → zusätzlich zu Gruppe "Top" auch "Sonstiges"-Artikel, die per `Z7` dem gewählten Model zugeordnet sind.
  `dchoiceColor`: Gruppe 70 (Sonstiges) = coral. `dchoiceIcon`: `R = 3` → "plant" (Holz).

**Relationale Abbildung:**
- Jedes Spec-Dropdown-Feld → FK auf `artikel(id)` mit Constraint `artikel.artikelgruppe = '<Gruppe>'`.
- In Aufträgen zusätzlich M:N `artikel_model` (aus `WB.Z7`) → erlaube auch `artikelgruppe = 'Sonstiges'`
  wenn dem gewählten Model zugeordnet.
- Gespeicherter Wert in Ninox = `WB.T7` ("Nr"), nicht die Record-ID → beim Import Mapping T7 → neue id.

### 6.4 Aufpreis-Logik
Hinter fast jedem Spec-Feld ein Ja/Nein-Feld ("… als Aufpreis in Rechnung führen").
In Aufträgen sind das die `*_K`-Felder (z. B. `SD` Neck_K, `TD` Body_K, `UD` Top_K, …).
Wenn true → Spec erscheint als eigene Aufpreis-Position in Angebot/Rechnung.
→ noch im Detail zu klären: Preisquelle (Artikel.VK?), Rabatte, Reihenfolge.

## 7. Belege / Druckausgaben

24 Word-Vorlagen, Schema `NN Sprache_Währung_Belegart_Steuersatz_variante.docx`:
- Sprache: DE / EN
- Währung: EUR / USD
- Belegart: AN=Angebot · AB=Auftragsbestätigung · RG=Rechnung · LS=Lieferschein
- Steuersatz: null (0 %) · neunzehn (19 %) · GROSS (?)
- Extra: CITES-Formular, Lacey-Zertifikat, Nik-Huber-Zertifikat, "offene Aufträge"

Ziel: pro Belegart 1 Template, Sprache + Steuer parametrisiert.
Referenz-Übersicht: `Druckausgaben/Belege mit unterschiedlichem MwSt-Ausweis.png`,
`Druckausgaben/Formular-Checkliste.xlsx`, `Druckausgaben/Alle Modellvorlagen - 2022-11.xlsx`.

## 7a. Workflow — Angebot erstellen

### Schritt 1: Kunde zuordnen
Bei Auswahl des Kunden (`KUNDE`-Referenz) werden Adress-/Stammdaten **als Snapshot
in das Angebot kopiert** (nicht nur referenziert):
```
Firma        := KUNDE.Firma
Vorname      := KUNDE.Vorname
Nachname     := KUNDE.Nachname
Strasse_HsNr := KUNDE.Strasse
PLZ          := KUNDE.PLZ
Ort          := KUNDE.Ort
Staat        := KUNDE.text(Staat)     // Choice → Text
Währung      := KUNDE.Währung
```
→ **Design:** Beleg-Kopf hält eigene Adressfelder (spätere Kundenänderungen dürfen
historische Belege nicht verändern). FK `kunde_id` bleibt zusätzlich für Navigation.
Gilt sinngemäß auch für Auftrag und Rechnung — noch bestätigen.
Steuerlogik (19 % / 0 %) hängt an `Staat` bzw. `Währung`.

### Schritt 2: Modellvorlage auswählen (unter „Details")
Feld **„MODELLVORLAGE WÄHLEN"** = Referenz auf einen **Artikel mit Artikelgruppe „Model"**
(Angebote: `YC.ZL`, Aufträge: `A.JW`). Trigger-Script beim Setzen:

```
wenn MODELLVORLAGE WÄHLEN gesetzt:
    wenn MODELLARTIKEL != null  (schon eine Config geladen):
        dialog("Alle vorhandenen Specs werden überschrieben!", [Ja / Nein])
        Ja   -> Specs kopieren (siehe unten)
        Nein -> nur Schreibschutz := true
    sonst:
        Specs kopieren
    danach: MODELLVORLAGE WÄHLEN := 0 ;  Schreibschutz := true
sonst:
    alert("Kein Model ausgewählt!")
```

**„Specs kopieren"** (`do as server`, in beiden Zweigen identisch):
- `MODELLARTIKEL := MODELLVORLAGE WÄHLEN`  (merkt sich das geladene Model — Angebote `YC.CM`, Aufträge `A.PW`)
- Für **jede** Spec: `<Spec> := Vorlage.<Spec>` **und** `<Spec>_K := Vorlage.<Spec>_K`
  (`_K` = Aufpreis-Ja/Nein wird mitkopiert)
- Freitextfelder: `Body Freitext`, `Neck Freitext` (`Assembly Freitext` analog)
- Mehrfach-Felder (ohne `_K`): `CNC PU Custom (mehrfach)`, `Neck Options (mehrfach)`

Kopierte Specs (~55, Reihenfolge aus Script): Body, Top, Back Top, Body Finish, Colour,
Top Finish, Colour Set, Hollow Body, Custom Options, Body Binding, Body Thickness,
Bridge Type, CNC Custom, CNC PU Custom (mehrfach), Neck, Headstock, Headstock Inlay,
Fretboard, Inlays, Frets, Neck Binding, Neck Carve, Scale Length, Neck Options (mehrfach),
Neck Finish, PU Bridge, PU Mid, PU Neck, PU Rings, Hardware Colour, Bridge, Tailpiece,
Tuner, Tuner Buttons, Nut, Trussrod Cover, Pickguard, Switch, Switch Tip, Poti Knobs,
Backplate, Gurt Pins, Strings, Case.
(Alle außer den *(mehrfach)*-Feldern mit `_K`-Partner. „Colour Set" ohne `_K`.)

Weitere zugehörige Felder: Angebote/Aufträge `Y9` „Schreibschutz";
Aufträge zusätzlich `NJ` „Modellvorlage gesperrt", `U11` „Modellvorlage vergeben" (Zeitstempel).

**Design fürs Zielschema:**
- „Model" ist ein Artikel (`artikelgruppe = 'Model'`) mit vollem Default-Spec-Satz
  (55 Spec-FKs + 55 `*_k` Booleans + Freitexte). Dieselben Spalten trägt auch Angebot **und** Auftrag.
- Vorlage anwenden = **Snapshot per Value**, kein Link. `modellartikel_id` (FK) merkt die Herkunft.
- Eine gemeinsame Funktion `applyModelTemplate(doc, modelArtikelId, { overwrite })` für Angebot + Auftrag.
- `overwrite`-Rückfrage nur wenn schon `modellartikel_id` gesetzt.
- Nach Anwenden: Zeilen sperren (`schreibschutz`), bis bewusst entsperrt; Auswahlfeld zurücksetzen.
- `*(mehrfach)`-Felder = `dmulti` → M:N-Join-Tabelle, ohne Aufpreis-Flag.

### Schritt 3: Positionen erzeugen — Button „Angebotspositionen aus Details generieren"
(Reiter „Positionen". Analog später in Auftrag und Rechnung.)

**Guards:** kein `KUNDE` → alert; kein `MODELLARTIKEL` → alert; sonst `do as server`.

**Setup:**
- `myVertrieb := KUNDE.Vertriebsweg`
- `myAnzahl` aus Feld `Colour Set`: Artikel-Nr `4271`→1, `4272`→2, `4273`→3
  (Colour Set kodiert Anzahl Farb-Positionen)

**Pro Spec-Slot** (Reihenfolge im Script): Model (=`MODELLARTIKEL`), Body, Top, Back Top,
Body Finish, Colour, Top Finish, Hollow Body, Custom Options, Body Binding, Body Thickness,
Bridge Type, CNC Custom, Lefty, CNC PU Custom *(mehrfach)*, Neck, Fretboard, Frets, Inlays,
Headstock, Headstock Inlay, Neck Finish, Neck Binding, Neck Carve, Scale Length,
Neck Options *(mehrfach)*, Hardware Colour, PU Bridge, PU Neck, PU Mid, PU Rings, Bridge,
Tailpiece, Tuner, Tuner Buttons, Nut, Trussrod Cover, Pickguard, Switch, Switch Tip,
Poti Knobs, Backplate, Gurt Pins, Strings, Case.

`if <SpecSlot> gefüllt` → `create Angebotspositionen`:
| ZC-Feld | Wert |
|---|---|
| `O` ARTIKEL AUSWÄHLEN | `record(WB, number(<SpecSlot>))` — Spec-Slot hält die Artikel-Nr (T7) |
| `N` Angebot | this |
| `A` Artikel | `Artikel.'Artikelname Belege'` (`WB.X`) — Text-Snapshot |
| `K` Artikelbeschreibung | `Artikel.Artikelbeschreibung` (`WB.L1`) — Text-Snapshot (bei den *(mehrfach)* weggelassen) |
| `J` RE_relevant | `= my.<Spec>_K`  — **Ausnahme:** Model-Zeile + *(mehrfach)*-Zeilen immer `true` |
| `C` Anzahl | `1` — **Ausnahme:** Colour-Zeile → `myAnzahl` |
| `D` Einzelpreis | Preis nach Kunden-Vertriebsweg, siehe Tabelle |
| `L1` VK Retail Wert | Vertriebsweg 3/4 (US): `Artikel.VK_US * Anzahl`, sonst `Artikel.VK_EUR * Anzahl` |

**Preis-Tier** (`KUNDE.Vertriebsweg`, Choice `MC.X2`: 1 NET1 · 2 NET2 · 3 NET_US · 4 VK_US · 5 VK_EUR):
| text(Vertriebsweg) | Einzelpreis aus Artikel-Feld |
|---|---|
| NET1 | `K3` NET1 (fn) |
| NET2 | `M3` NET2 (fn) |
| NET_US | `P3` NET_US (fn) |
| VK_US | `C2` VK_US |
| VK_EUR | `J3` VK_EUR_net (fn) |

*(mehrfach)*-Slots: `for i in numbers(<Slot>)` → je Artikel eine Position, `RE_relevant := true`.

**Abschluss:** `sleep(500)`; Positionen mit `RE_relevant = true` durchnummerieren
(`Pos Nr` = 1,2,3…); `'Positionen anzeigen' := true`.

**Angebotspositionen (ZC), 17 Felder:** B Pos Nr · A Artikel(Text) · C Anzahl · D Einzelpreis ·
E Gesamtpreis · J RE_relevant · K Artikelbeschreibung · N→Angebot · O→Artikel · Z Rabatt ·
L1 VK Retail Wert · + Formeln B1 Kunde Vertriebsweg, C1 VK Retail, D1 Kunde Währung,
G1 Berechnung, K1 RabattText, Q1 Formel.

**Design fürs Zielschema:**
- `angebot_position` mit FK `artikel_id` **und** Text-Snapshots (`artikel_name`, `artikel_beschreibung`)
  + eingefrorenem `einzelpreis`. `re_relevant` steuert Druck/Summen.
- Generator = eine Funktion, die über eine geordnete Slot-Liste iteriert
  (Slot → Spec-Feld → `_k`-Flag → Sonderregel). Für Angebot/Auftrag/Rechnung identisch,
  nur Ziel-Tabelle wechselt.
- Preis-Tier-Lookup: `kunde.vertriebsweg` → Artikel-Preisspalte (kleine Mapping-Tabelle).
- `vk_retail_wert` = Listenwert-Referenz, unabhängig vom tatsächlich berechneten Netto.
- MwSt (19 %/0 %) greift **nicht** je Zeile — Positionen sind netto; Steuer auf Belegebene
  über `Staat`/`Währung` (zu bestätigen).
- **Offen:** löscht „generieren" vorhandene Positionen vorher? Rabatt-Logik (`Z`, `K1`).
  `Gesamtpreis` (`E`) und `Berechnung` (`G1`) Formeln. Manuelle Positionen danach.

### Schritt 4: Angebot erzeugen + per Mail — Button (Ninox „Carbone"-Generator)

**Guards:** `KUNDE.Kontaktart` / `KUNDE.Vertriebsweg` / `KUNDE.Staat` fehlt → alert.

**Template wählen** (nur wenn `Drucktemplate auswählen` leer): erstes `Druck Templates` mit
`TemplateArt = 2` (Angebote) **und** `TemplateSprache = KUNDE.Sprache` **und**
`TemplateSteuerpflichtig = KUNDE.Steuerpflichtig` **und**
`TemplateVertriebsweg` enthält `KUNDE.Vertriebsweg`.

`Druck Templates` (CD): `B` TemplateArt {1 Aufträge · 2 Angebote · 3 Rechnungen · 4 Lieferschein · 5 Zertifikat · 6 NKS} ·
`C` Vorlage (docx-Datei für Carbone) · `K` TemplateVertriebsweg (multi) · `L` TemplateSteuerpflichtig (bool) ·
`Y` TemplateSprache {1 DE · 2 EN} · `D`/`F` Carbone response/ID. **Aktuell 27 Template-Datensätze**
(Matrix Art × Sprache × Steuer × Vertriebsweg) → Ziel: **1 Template je Art**, Sprache/Steuer/Retail zur Laufzeit.

**Dann:**
- `Angebotsdatum := today()` · `Angebotsstatus := 2` (versendet/offen)
- `printAndSaveRecord(record, layout, myBody)` erzeugt das PDF (Carbone/docx).

**Render-DTO `myBody`** (= Vertrag für den Dokument-Renderer):
```
Kopftext            = Feld 'Angebots Text' (YC.HD)
Belegart            = "ANGEBOT"
DokNr              = Angebotsnummer
Briefkopf_Lieferschein = ""
Zahlungsbedingung  = Zahlungsbedingungen[Nr = KUNDE.Zahlungsbedingungen].Bezeichnung
KdNr               = KUNDE.'Kunden-Nr'
Datum              = text(Angebotsdatum)
Steuerid           = Stammdaten.SteuerNr           (eigene Firma)
SteuerNr           = KUNDE.'USt-Id Nr.'            (Kunde)
Bearbeiter         = userName()
Email              = userEmail()
SummeNetto/SummeMwSt/SummeBrutto = format(YC.'Summe *', "#,##0.00")
vTabelle[]         = Angebotspositionen[RE_relevant] order by 'Pos Nr':
    Pos         = 'Pos Nr'
    Artikelname = Artikel
                  + "\n" + Artikelbeschreibung            (wenn vorhanden)
                  + "\n(VK/ Retail: <Währung> <VK Retail>)" (wenn VK Retail > 0)
    Anzahl, Einzelpreis
    Rabatt      = RabattText
    Gesamtpreis
    ArtikelNr   = 'ARTIKEL AUSWÄHLEN'.'Artikel Nr'
```

**Mailversand:**
- `create Mailversand` (AD): `ANGEBOT := my` · `To := KUNDE.'E-Mail'` · `CC := KUNDE.'Rechnungs-E-Mail (cc)'` ·
  `Betreff := ("Nik Huber Guitars - " + ("Angebot" wenn Sprache=1 sonst "Offer") + " " + Angebotsnummer)` · `Art := 1`
- `create 'Anhänge_'` (BD): `MAILVERSAND := newMail` · `File := importFile(printAndSaveRecord(...), Angebotsnummer+".pdf.pdf")`
- `popupRecord(newMail)` — Mail öffnet sich zur Kontrolle; **Versand ist ein separater Schritt** auf dem Mailversand-Datensatz.

`Mailversand` (AD): `G` Art {1 Angebot · 2 AB · 3 Rechnung · 4 Gutschrift · 5 Sonstiges · 6 Mail-Eingang · 7 Mail-Ausgang · 8 Telefonat · 9 Zahlungserinnerung · 10 Lead} ·
`H` Status Mail {1 Entwurf · 2 versendet · 3 Error · 4 Versand erfolgreich · 5 über Mailprogramm} ·
`F` Inhalt (html) · `Q` Textvorlage wählen (→ Textvorlagen ID) · refs M/N/O → Angebot/Auftrag/Rechnung.
`Anhänge_` (BD): `A` File · refs C/E/F/G → Mailversand/Angebot/Rechnung/Auftrag.

**Nummernkreise & Firmenstammdaten — `Stammdaten` (LC, Singleton):**
Firma/Adresse/`I` SteuerNr/`J` Bankverbindung/`S` „MwSt. Satz" ·
`C1/D1/E1` Start-Angebots-/Auftrags-/Rechnungsnummer · `G1/H1/I1` …counter (Formeln).
`Angebotsnummer` (YC.ZD) ist eine Formel darauf.

**Status `Angebotsstatus`** (YC.AE): 1 neu · 2 versendet/offen · 3 Auftrag · 4 verloren · 5 verworfen.
**Summen** (YC): `WB` Summe Netto · `AC` Summe MwSt. · `BC` Summe Brutto — alles Formeln (Body-Ebene, aus `RE_relevant`-Positionen). MwSt-Logik dort → eigener Schritt.
**Kunde** (MC): `R2` Kontaktart {1 Kunde…7 Sonstige} · `C4` Sprache {1 DE·2 EN} · `E4` Steuerpflichtig (bool) ·
`D4` Zahlungsbedingungen · `Y` USt-Id Nr. · `B9` E-Mail · `T9` Rechnungs-E-Mail (cc).

**Design fürs Zielschema:**
- Dokument-Renderer nimmt ein DTO wie `myBody`; **ein** Template je Belegart, i18n (DE/EN) + Steuerblock
  per Flag, Retail-Spalte per Vertriebsweg. Carbone/docx durch HTML→PDF (Puppeteer) o. React-PDF ersetzen (Entscheidung offen).
- Belegnummern aus zentraler Sequenz-Tabelle (analog `Stammdaten`-Counter), nicht Formel.
- Mail = eigene Entität (`mailversand`) mit Status + `anhang`-Kindsätzen; Erzeugen ≠ Senden.
- Firmenstammdaten als Singleton/Settings.

### Schritt 4a: Summen, MwSt., Gesamtrabatt

**Angebote (YC):**
```
Summe Netto  = sum(Angebotspositionen[RE_relevant].Gesamtpreis)
               (das if/else "Vertriebsweg like 'us'" hat in beiden Zweigen denselben Code — totes Relikt, ignorieren)
Summe MwSt.  = wenn NICHT KUNDE.Steuerpflichtig: 0
               sonst: round(SummeNetto * Stammdaten.'MwSt. Satz' / 100, 2)
               (Kommentar im Code: bis 07.07.2024 gab es zusätzlich "and Vertriebsweg < 5" —
               Rainer hat das selbst entfernt; heute hängt MwSt. NUR am Flag Steuerpflichtig)
Summe Brutto = Summe Netto + Summe MwSt.
```
Steuersatz ist **ein globaler Wert** in `Stammdaten.'MwSt. Satz'` (aktuell 19), keine Fallunterscheidung
im Formel-Code selbst — die DE/Ausland-Logik steckt komplett im Kundenfeld **`Steuerpflichtig`**
(Herkunft/Regel dieses Flags noch zu klären — vermutlich aus `Staat`, siehe offene Punkte).

**Aufträge (A) — zusätzlich Gesamtrabatt (in Angebote noch NICHT nachgebaut, aber gewünscht):**
```
Summe Positionen    = sum(Auftragspositionen[RE_relevant].Gesamtpreis)

Gesamtrabatt Prozent  <-> Gesamtrabatt Wert   (bidirektional, je nach zuletzt editiertem Feld)
  Prozent geändert → Wert := round(SummePositionen * Prozent/100, 2)
  Wert geändert    → Prozent := round(Wert * 100 / SummePositionen, 2)

Summe netto_  = round(SummePositionen - 'Gesamtrabatt Wert', 2)
Summe MwSt_   = wenn NICHT Steuerpflichtig: 0  sonst: round('Summe netto_' * MwSt.Satz/100, 2)
Summe brutto  = 'Summe netto_' + (Steuerpflichtig ? 'Summe MwSt_' : 0)   -- MwSt_ ist an der Stelle schon 0, doppelt abgesichert
```

**Design fürs Zielschema:**
- Steuersatz zentral in Settings (`mwst_satz`), nicht hartkodiert.
- **DE/Ausland-Schalter = Kundenflag `steuerpflichtig`** (bool) — die eigentliche Steuerregel hängt
  komplett hieran, nicht direkt an Land/Währung. Muss vor Belegerstellung korrekt gepflegt sein.
- Gesamtrabatt als **zwei gekoppelte Editierfelder** (Prozent/Wert), je nach zuletzt geändertem Feld
  das andere neu berechnen — dasselbe UI-Pattern für Angebot **und** Auftrag (Angebot fehlt aktuell,
  soll aber mit).
- Rundung konsequent zweistellig nach jedem Zwischenschritt (`round(x,2)`) — bei Umstellung auf
  `numeric(12,2)` in Postgres auf Rundungsmodus achten (Ninox `round()` = kaufmännisch/half-up, wie Postgres `round(numeric)`).
- Rechnungspositionen/-Summen vermutlich identisches Muster wie Aufträge — bei Gelegenheit verifizieren.

### Schritt 4b: Herkunft von `Steuerpflichtig`/`Vertriebsweg` — Staat + Kontaktart

Trigger auf Adressen (MC), läuft beim Setzen von `STAATEN` (Ref → Tabelle **Staaten**, JD, 52 Länder):
```
Währung             := STAATEN.Währung
Sprache             := STAATEN.Sprache
Zahlungsbedingungen := STAATEN.Zahlungsbedingungen
```
`Staaten.Region` klassifiziert jedes Land: **1 D · 2 EU · 3 Welt · 4 Asien · 5 USA**.

Danach abhängig von **Kontaktart × Region** (nur für Kontaktart Kunde/Händler/Artist — Lieferant,
Holzhändler, Industriekontakte, Sonstige bleiben unangetastet):

| Kontaktart | D (1) | EU (2) | Welt (3) | Asien (4) | USA (5) |
|---|---|---|---|---|---|
| **Händler** (3) | NET1, **steuerpfl.** | NET1, steuerfrei | NET1, steuerfrei | NET2, steuerfrei | NET_US, steuerfrei |
| **Kunde** (1) | VK_EUR, **steuerpfl.** | VK_EUR, **steuerpfl.** | VK_EUR, steuerfrei | VK_EUR, steuerfrei | VK_US, steuerfrei |
| **Artist** (4) | NET2, **steuerpfl.** | NET2, **steuerpfl.** | NET2, steuerfrei | NET2, steuerfrei | VK_US, steuerfrei |

*(Vertriebsweg-Werte nach Schema: 1 NET1 · 2 NET2 · 3 NET_US · 4 VK_US · 5 VK_EUR — der Kommentar
im Ninox-Script selbst ist an dieser Stelle veraltet/falsch, das Schema ist die verlässliche Quelle.)*

**Das ist die eigentliche Steuerregel — nuancierter als „D=19%, Ausland=0%":**
- **Deutschland:** immer steuerpflichtig, für alle drei Kontaktarten.
- **EU:** **Endkunde/Artist → weiterhin steuerpflichtig** (B2C, keine Ausnahme), **Händler → steuerfrei**
  (B2B Reverse-Charge unter der Annahme gültiger USt-ID — die aber im Flow selbst nicht geprüft wird).
- **Welt/Asien/USA:** immer steuerfrei, unabhängig von Kontaktart.
- Steuerpflichtig/Vertriebsweg sind **abgeleitete Defaults beim Land-Setzen**, danach aber frei editierbare
  Felder auf dem Kundendatensatz (kein Formelfeld) — können also manuell übersteuert werden.
- **Von Rainer bestätigt:** 19 % MwSt. für {Händler DE, Kunde DE, Kunde EU, Artist DE, Artist EU}, alle
  anderen 0 % — deckt sich exakt mit der Tabelle oben (Händler EU = steuerfrei).
- **Zusätzlich (neu):** Kunden-Sonderrabatt-Feld auf VK_EUR/VK_US für Artists/Musiker/besondere Händler,
  mit **Vorrang** vor der Vertriebsweg-Standardlogik (Zielmodell §6 / E19).

**Design fürs Zielschema:**
- `staat` (Länder-Stammdaten) trägt `region` (D/EU/Welt/Asien/USA) + Default-Sprache/Währung/Zahlungsbedingung.
- Eine Regel-Tabelle/Funktion `taxDefaults(kontaktart, region) → {vertriebsweg, steuerpflichtig}`
  wie oben, angewendet **einmalig als Default** beim Setzen des Staats — Ergebnis bleibt danach
  editierbar (kein Live-Formelfeld, sonst könnte niemand einen Sonderfall pflegen).
- **Geklärt:** Keine USt-ID-Prüfung. Die Steuerfreiheit bei EU-Händlern verlässt sich **ausschließlich**
  auf `Kontaktart = Händler` — das Feld `USt-Id Nr.` wird nur auf dem Beleg ausgewiesen, nicht validiert.
  Für die neue Automatik reicht also exakt die Kontaktart×Region-Tabelle oben, keine zusätzliche
  USt-ID-Prüfung nötig (kann optional als Härtung ergänzt werden, ist aber kein Ist-Zustand-Nachbau).

_(weitere Schritte folgen — als Nächstes vmtl. Angebot→Auftrag)_

## 7c. Listen-/Suchansichten (Frontend)

### Angebotstabelle (Dashboard KD)
Filter-Datensatz „Dashboard" (KD) mit `G` „Suche Angebote" (Text) + `S` „StatusauswahlAN" (Choice,
= `Angebotsstatus`). Anzeige-Formel:
```
State := StatusauswahlAN
Basis-Filter:  (Angebotsnummer + " " + text(KUNDE.Anzeigename) + " " + Angebotsdatum + " " + text(Model))  like  'Suche Angebote'
wenn State != null:  zusätzlich  Angebotsstatus = State
```
- `like` = Ninox: Substring, case-insensitive, `*` als Wildcard.
- Durchsuchte Felder: Angebotsnummer, Kunden-Anzeigename, Angebotsdatum, Model.
- Analog `K` „Suche Aufträge" und `B2` „Suche Rechnungen" auf demselben Dashboard.

**Design fürs Zielschema:** Index-/Listenseite je Beleg mit Volltextsuche über einen zusammengesetzten
Ausdruck (in Postgres: generierte Spalte / `to_tsvector` oder schlicht `ILIKE '%term%'`) + Status-Dropdown.
Kein eigener „Filter-Datensatz" nötig — das ist reiner UI-State.

### Auftragstabelle (Dashboard KD) — 5 kombinierbare Filter
Ninox-Formel ist ein `switch` über **alle 2⁵ = 32 Kombinationen** eines 5-Zeichen-Codes
(`J A T S _` je Filter gesetzt/`_`). Das ist nur ein Workaround für fehlende dynamische Query-Komposition —
inhaltlich sind es 5 optionale UND-Prädikate:

| Code | Dashboard-Feld | Prädikat auf Aufträge |
|---|---|---|
| J | `G3` „Filter JahrMonat" (fn) | `text(Bauplan) = text('Filter JahrMonat')` (`DL` Bauplan, fn = Bauplan-Monat) |
| A | `K` „Suche Aufträge" | `like` über: Auftragsnummer + Seriennummer + `Seriennummer lfd` + KUNDE.Anzeigename + Auftragsdatum + `MODELLARTIKEL.'Artikelname lang'` |
| T | `T1` „terminierte" {1 Bauplan · 2 ohne} | `terminierte=1` → `Bauplandatum != null`, sonst `Bauplandatum = null` |
| S | `Y` „Filter Status" (Choice) | `Auftragsstatus = 'Filter Status'` |
| M | `G1` „Filter Modell" (Choice, Modellfamilien) | `Modellgruppe_ = 'Filter Modell'` (`WK` Modellgruppe_, fn) |

**Sonderfall „kein Filter aktiv" (`_____`):** nicht `select all`, sondern
`Auftragsstatus NOT IN (6, 21, 12, 17)` — d. h. **Abgeschlossen / Abgeschl. o.B. / Storniert / NoneGuitar
werden in der Standard-Arbeitsliste ausgeblendet**. Sobald **irgendein** Filter aktiv ist, entfällt diese
Ausblendung (man kann also z. B. stornierte Aufträge gezielt suchen). Die `Filter Status`-Dropdown
enthält „Storniert" (12) bewusst gar nicht.

`Auftragsstatus` (RC): 4 Backorder · 6 Abgeschlossen · 10 in Werkstatt · 12 Storniert · 13 Service ·
14 bei Nicl · 15 Produktion fertig · 17 NoneGuitar · 21 Abgeschl. o.B. (+ `JT` „Auftragsstatus EN" für Belege).
`Filter Modell` / Modellgruppen (OD): Krautster, Dolphin, Redwood, Twangmeister, Orca, Piet, Surfmeister,
Rietbergen(+Bass/Doppeltop), Orca 59, Dolphin 59, Piet Offset, Krautster Custom, Signature, Limited, …

**Design fürs Zielschema:** *eine* Query mit optionalen WHERE-Klauseln:
```sql
WHERE (:jahrMonat  IS NULL OR bauplan_monat = :jahrMonat)
  AND (:suche      IS NULL OR such_blob ILIKE '%'||:suche||'%')
  AND (:terminiert IS NULL OR (:terminiert=1) = (bauplandatum IS NOT NULL))
  AND (:status     IS NULL OR auftragsstatus = :status)
  AND (:modell     IS NULL OR modellgruppe   = :modell)
  AND (:anyFilterActive OR auftragsstatus NOT IN (6,21,12,17))
```
Der 32-fach-`switch` verschwindet komplett.

## 7d. Auftrag-Details: Specs, Holzartikel, CITES / Lacey

Im Auftrag sind alle Specs einzeln aufgeführt, analog zu den Artikelgruppen; die Dropdowns kommen
je Slot aus `Artikel` gefiltert nach Artikelgruppe (wie in Abschnitt 6.3).

### Holzartikel-Slots (Lacey Act + CITES-relevant)
12 Spec-Slots gelten als „Holzartikel": **Body, Top, Back Top, Neck, Fretboard, Headstock,
Tuner Buttons, Trussrod Cover, Switch Tip, PU Rings, Poti Knobs, Backplate**.
Jeder dieser Slots trägt einen (nahezu identischen) `afterUpdate`-Trigger mit zwei Teilen:

**Teil 1 — Subtable `Holzpositionen` pflegen** (VF; `A` Auswahl Auftrag→A, `D` Holzartikel→WB;
rein abgeleitet, keine manuellen Felder):
```
bei Änderung von <Slot>:
  lösche Holzpositionen dieses Auftrags, wo Holzartikel.Artikelgruppe (Text) = "<Slot>"
  Art := Artikel[Nr = number(<Slot>)]
  wenn Art.'NKS Holzart' gesetzt → create Holzposition { Auswahl Auftrag := this, Holzartikel := Art }
```
→ `Holzpositionen` = pro befülltem Holz-Slot, dessen Artikel eine `NKS Holzart` referenziert, eine Zeile.
Slot-Identität aktuell über Artikelgruppen-Text; im Ziel als eigene Spalte `slot` speichern.

**Teil 2 — CITES-Zählung + Arbeitsschritt 93** (Guard `now() > 'Modellvorlage vergeben' + 5000` ms
= Entprellung gegen das Template-Laden):
```
Cites := Anzahl der 12 Holz-Slots, deren Artikel 'Geschütztes Holz (Cites)' = 1 hat
Auftrag.'Cites-Artikelanzahl' (P11) := Cites
wenn Cites > 0 → Arbeitsschritt-Vorrat 93 ("Cites") am Auftrag sicherstellen (sonst anlegen)
sonst          → Arbeitsschritt 93 am Auftrag löschen
```

### Beteiligte Stammdaten
- `Artikel.'NKS Holzart'` (WB.SF) → **NKS Holzarten** (TF): `Holz`, `Botanischer Name`, `Herkunft`,
  `Species`, `Genus`, `Holzdichte` — Datenbasis für CITES-/Lacey-Belege.
- `Artikel.'Geschütztes Holz (Cites)'` (WB.LE, Choice; 1 = geschützt).
- **NKS Parts Volumen** (SF): `Volumen m^3` je Artikel × Artikelgruppe (Slots: Top, Body, Neck,
  Headstock Overlay, Fretboard, Neck Options, Trussrod Cover, Switch Tip, Poti Knobs, Backplate,
  Tuner Buttons, Back Top, PU Rings) — Mengen-/Volumenangabe für Lacey.
- Auftrag: `P11` Cites-Artikelanzahl · `Z11` CITES Dokumentennummer · `V21` Holzpositionen (rev) ·
  `J21/K21` CITES-Fotos · `H31` CITES-Dokument (Datei).
- Arbeitsschritt-Vorrat 93 = „Cites" (PB); Zuordnung als `Arbeitsschritte-Auftrag` (D) mit
  `ARBEITSSCHRITTEVORRAT := 93`.

**Design fürs Zielschema:**
- **Nicht** 12 fast identische Trigger. Eine Funktion `recomputeHolzpositionen(auftrag)`:
  iteriert die 12 Holz-Slots, erzeugt/ersetzt `holzposition`-Zeilen (`auftrag_id`, `artikel_id`, `slot`)
  für Slots mit `artikel.nks_holzart_id`. Läuft einmal nach jeder Änderung an einem Holz-Slot
  (die `+5000`-Entprellung entfällt — im Batch einmal am Ende rechnen).
- `holzposition` ist **rein abgeleitet, nie manuell bearbeitet** (bestätigt Rainer — als Ninox-Tabelle
  nur aus Darstellungsgründen). → Im Ziel als **DB-View** umsetzen, keine eigene Tabelle, kein Trigger.
  Der CITES-Zähler + Arbeitsschritt-93-Regel laufen dann direkt gegen die View / berechnet beim Speichern des Auftrags.
- `cites_artikelanzahl` = `count(*)` der Holz-Slot-Artikel mit `geschuetztes_holz_cites`.
- Arbeitsschritt 93: Regel „Cites-Menge > 0 ⇒ Schritt vorhanden" als Nebeneffekt derselben Funktion.
- CITES-/Lacey-Belege rendern aus `holzposition` join `nks_holzart` (+ `nks_parts_volumen` für Volumen).

_(weitere Schritte folgen)_

## 7e. Angebot → Auftrag übernehmen (Button im Angebot)

`create Aufträge` → `do as server` (Kopf) → `do as server` (Positionen) → `popupRecord(neu)`.

**Kopf-Kopie auf den neuen Auftrag:**
- `KUNDE := Angebot.KUNDE`
- `'Übernahme aus Angebot' := Angebot.Angebotsnummer`  — **String-Feld** (`A.AK`), keine echte Referenz!
- `'Angebotsübernahme Helper' := true`  (`A.YN`, Boolean) — **Suppression-Flag**: unterdrückt die
  Spec-/Holz-/CITES-`afterUpdate`s während der Massenkopie; am Ende wieder `false`.
- `MODELLARTIKEL` + **alle ~55 Spec-Slots + `_K`-Flags** + Freitexte (Body/Neck) + `(mehrfach)`-Felder
  — dieselbe Feldliste wie die Modellvorlage-Kopie (Schritt 2).
- `'Positionen anzeigen' := true`
- Danach am **Quell-Angebot**: `Angebotsstatus := 3` (Auftrag).

**Positions-Kopie:** `for i in Angebotspositionen[RE_relevant]` → `create Auftragspositionen`
(`AC`, 18 Felder, Spiegel von `ZC`): AUFTRAG, Pos Nr, ARTIKEL AUSWÄHLEN, Artikel, Artikelbeschreibung,
Anzahl, Einzelpreis, Rabatt, Gesamtpreis, RE_relevant — **alle Werte 1:1 kopiert, nichts neu berechnet**.
Nur `RE_relevant`-Zeilen werden übernommen (anders als der Generator aus Schritt 3, der auch
nicht-relevante Zeilen anlegt).

**Design fürs Zielschema:**
- Angebot→Auftrag = **Deep Copy** in einer Transaktion: Kopf-Spec-Snapshot (+`_K`) + Positionen.
- **Preise werden zum Angebotszeitpunkt eingefroren** und übernommen — *nicht* aus `KUNDE.Vertriebsweg`
  neu abgeleitet. Der Auftrag erbt exakt die angebotenen Preise.
- Echte FK `angebot_id` statt String-Feld `Übernahme aus Angebot`. Quell-Angebot → Status „Auftrag".
- `Angebotsübernahme Helper` entfällt — in einer Transaktion kopieren, danach *einmal*
  `recomputeHolzpositionen` / Summen / CITES rechnen.
- Achtung: Auftrag hat **zwei** Wege zu Positionen — (a) Übernahme aus Angebot, (b) Generator „aus
  Details" (Schritt 3). Können divergieren; im Ziel klar definieren, welcher wann erlaubt ist.
- Positions-Subtable-Ansicht im Auftrag hat einen Toggle **„Nur relevante anzeigen"** (`= 1` →
  `AUFTRAGSPOSITIONEN[RE_relevant = true]`, sonst alle). Bestätigt: nicht-relevante Positionen bleiben
  auch im Auftrag als interne Baudoku erhalten. Analog zum ZC-Toggle im Angebot.

_(weitere Schritte folgen)_

## 7f. Auftragsarten & Neuanlage

**3 Auftragsarten** — echtes Feld `A.PX` „Auftragsart" (Choice): **1 Produktionsauftrag ·
2 Noneguitarauftrag · 3 Serviceauftrag**. Steuert stark die Formular-Sichtbarkeit (viele Felder
haben `visibility` wie `(PX = 1)` / `((PX = 1) or (PX = 3))`, z. B. Seriennummer, Bild/Farbmuster).

**`A.afterCreate`** (läuft bei *jedem* neuen Auftrag):
- Defaults: `Drucktemplate Zertifikat := 3` · `Bauplanung Verknüpfung := 12` ·
  `erfasst von := extractx(userName(),"([A-Z]+)","i","$1")` (Initialen) · `erfasst am := today()`.
- **Nummer:** `StartNr := Stammdaten.'Start Auftragsnummer'`; `neueNr := max(Aufträge.Auftragscounter)+1`;
  `Auftragscounter := neueNr`; `AuftragsnummerText := "A-" + year + "-" + format(neueNr,"0000")`
  → z. B. `A-2026-0001`. → im Ziel echte DB-Sequenz statt `max()+1` (race-anfällig).
- **Standard-Arbeitsschritte einfügen:** `for i in Arbeitsschrittevorrat where Typ < 3` →
  `Arbeitsschritte-Auftrag` je Vorrats-Schritt (`AUFTRAG`, `ARBEITSSCHRITTEVORRAT`); danach Schritte
  93/94/96 wieder löschen (kommen nur bedingt dazu — 93 = CITES, siehe 7d).
- „Dashboard-Kram" steht nur als **String-Literal** im Code (auskommentiert, wird nicht ausgeführt) → ignorieren.

**Die 3 Neuanlage-Buttons:**
| Button | Aktion |
|---|---|
| 1 Produktionsauftrag | `create Aufträge` → popup (nur `afterCreate`, volle Schrittliste bleibt) |
| 2 None-Guitar | `create` → `Auftragsstatus := 17` (NoneGuitar) → **alle** `Arbeitsschritte-Auftrag` löschen → popup |
| 3 Serviceauftrag | `create` → `Auftragsstatus := 13` (Service) → **alle** Arbeitsschritte löschen → popup |

*Geklärt:* Die Buttons setzen nur `Auftragsstatus` — **`Auftragsart` wird vom Status-Änderungstrigger
abgeleitet** (siehe 7g). Deshalb reicht `Status := 17` bzw. `13`. Im Ziel besser: `auftragsart` beim
Anlegen explizit setzen und die Status→Art-Ableitung weglassen.

**Design fürs Zielschema:**
- `auftragsart` (enum) als führendes Feld; bestimmt Formular-Layout und ob eine Fertigungs-Schrittliste erzeugt wird.
- Bei Neuanlage: Art 1 → Standard-Schritte aus `arbeitsschritt_vorrat` (Typ 1–2). Art 2/3 → keine Schritte,
  Status NoneGuitar (17) bzw. Service (13).
- Nummernkreis pro Belegart über echte DB-Sequenz (`A-YYYY-####`, `Stammdaten`-Startwert als Offset).
- `A21` „Wiederausfuhr (none-EU)" (1 ja/2 nein) — CITES-relevant, mitnehmen.

_(weitere Schritte folgen)_

## 7g. Auftragsstatus — State-Machine-Trigger (`afterUpdate` auf `Auftragsstatus`)

`Auftragsstatus` (A.RC): 4 Backorder · 6 Abgeschlossen · 10 in Werkstatt · 12 Storniert · 13 Service ·
14 bei Nicl · 15 Produktion fertig · 17 NoneGuitar · 21 Abgeschl. o.B. (2 und 19 im Trigger referenziert,
aber nicht mehr in der Auswahlliste).

**Seiteneffekte je Zielstatus:**
| Status | Effekt |
|---|---|
| 10 in Werkstatt | `Produktionsort := 1` (Rodgau) · `Werkstattbeginn := today()` |
| 14 bei Nicl | `Produktionsort := 2` (Hamburg) · `Werkstattbeginn := today()` |
| 13 Service | `Werkstattbeginn := today()` · Arbeitsschritt **84** „Sonderarbeit (Reparatur)" anlegen |
| 15 Produktion fertig | alle offenen Werkstatt-Schritte (`Vorrat.Typ = 1` & `Status = 1`) → `Status := 3` (erledigt); Arbeitsschritt **93** „Cites (Rio)" sicherstellen |
| 6 Abgeschlossen | wenn Rechnung mit `Rechnungsstatus` existiert → `Versanddatum := today()`; **sonst Rückfall**: Art 1 → Status 15, Art 3 → Status 13 (**Abschluss ohne Rechnung verboten**) |

**Auftragsart-Ableitung aus Status** (deshalb genügt den Neuanlage-Buttons das Status-Setzen):
- Status ∈ {4, 14, 10, 15, 12, 19} → `Auftragsart := 1` (Produktion)
- Status ∈ {17, 2} → `Auftragsart := 2` (None-Guitar)
- Status = 13 → `Auftragsart := 3` (Service)

**Nebeninfos:**
- Arbeitsschritt-`Status` (D.J2): 1 offen · 3 erledigt · 4 Warten auf … · 5 Kiste vollständig.
- `Arbeitsschrittevorrat.Typ` (PB.B1): 1 Werkstatt · 2 Office. Neuanlage fügt Typ 1+2 ein; Status-15-Cascade
  betrifft nur Typ 1.
- Compliance-/Export-Schritte (alle Typ 2, bedingt): 84 Reparatur · 93 Cites (Rio) · 94 Fish&Wildlife (USA) ·
  96 Ausfuhrantrag.

**Design fürs Zielschema:**
- Explizite **State Machine** `auftragsstatus`: erlaubte Übergänge + Hooks (Datum setzen,
  Arbeitsschritt-Kaskaden, Guard „kein Abschluss ohne Rechnung").
- `auftragsart` als **eigenständiges Feld bei Anlage**, nicht aus Status ableiten (die Status→Art-Regeln
  entfallen — Status impliziert die Art ohnehin, die Buttons setzen beides).
- Arbeitsschritt-Kaskaden (84/93 anlegen, „alle offenen → erledigt") als Status-Hooks.

_(weitere Schritte folgen)_

## 7h. „Stand HE" — Produktionsfortschritt (Formelfeld auf Auftrag)

HE = Halbfertiges Erzeugnis. Zeigt den Baufortschritt der Gitarre in % mit grünem Farbverlauf.

```
alle    = Anzahl Werkstatt-Schritte (Vorrat.Typ = 1) am Auftrag
letzter = max(Vorrat.Order) unter den ERLEDIGTEN (Status = 3) Werkstatt-Schritten,
          OHNE Order 29 ("Kiste packen" — wird oft vorzeitig abgehakt)
menge   = Anzahl Werkstatt-Schritte mit Order <= letzter
Prozent = round(menge / alle * 100)
```
→ **meilensteinbasiert**: der am weitesten fortgeschrittene erledigte Schritt bestimmt den Stand
(alle Schritte davor gelten als „drin"), nicht die reine Quote erledigter Schritte.
Anzeige: `"NN %"` (2-stellig gepadded) mit Hintergrundfarbe in 6 Stufen
(`#d8f0d6` hell → `#a3c9a6` dunkel: <17, <34, <51, <68, <85, >85). `menge = 0` → nichts.

**Bugs/Notizen:** exakt `85` fällt durch alle Zweige (kein Style); `alle = 0` → „00 %".
Werkstatt-Schrittliste (Vorrat.Typ 1, 26 Schritte, Order 10–63): Holzauswahl Top/Body/Neck →
Body/Neck vorbereiten → CNC → bundieren → bohren → (Kiste packen) → Holzschliff → Absperren →
Poren/Beizen → Grund I/II → Lack I/II → Verleimen → Finish → Montage.
Office-Schritte (Typ 2): Setup/Zertifikat · Cites (Rio) · Fish&Wildlife (USA) · Rechnung ·
Ausfuhrantrag · Fotos gespeichert · Verpackt · Versendet.

**Design fürs Zielschema:** `fortschritt_prozent` als berechnetes Feld/`GENERATED`/View —
`count(steps where order <= max_completed_order) / count(all workshop steps) * 100`,
`order = 29` bei der Bestimmung des Max ausschließen. Farb-Banding rein im Frontend.

### `Stand HE Wert` (monetärer Fertigstellungswert des Auftrags)
```
alle/letzter/menge  wie oben
Pwert   = format(menge / alle * 100, "0,00")     // Fortschritt in %
StandHE = Umsatzerwartung * number(Pwert)
```
= Wert des halbfertigen Erzeugnisses = `Umsatzerwartung × Fortschritt`.
⚠️ **Zu prüfen:** `number(Pwert)` liefert je nach Ninox-`format`/`number`-Semantik den %-Wert (z. B. 42),
nicht den Bruch 0,42 — dann wäre das Ergebnis 100× zu groß. Im Ziel eindeutig:
`stand_he_wert = umsatzerwartung * fortschritt_prozent / 100`. Mit Rainer bestätigen.

_(weitere Schritte folgen)_

## 7i. Monatsauswahl für Bauplanung (Eingabehilfe)

`A.RX` „Monatsauswahl" (dchoice) — Switch-Leiste mit **7 Monaten**: Vormonat … aktueller Monat …
+5 Monate, Label `YYYY/MM`, relativ zu `today()` berechnet:
```
for i from 1 to 7 → { id: i, caption: format(date(year, month-2+i, 1), "YYYY/MM") }
```
`afterUpdate`: aus dem Label `YYYY/MM` → `Bauplandatum (U1) := date(Y, M, 1)` (1. des Monats),
bzw. `null` wenn abgewählt.

→ Reine Eingabehilfe; **gespeichert wird das echte Datum** (`Bauplandatum`), nicht der Index 1–7.
`Bauplan` (`DL`, Formel) leitet daraus `YYYY/MM` ab (= Filterwert in der Auftragsliste, siehe 7c).
`Bauplandatum` kann auch direkt gesetzt werden (dann Woche/KW-Logik, „immer Montag wählen").

**Design fürs Zielschema:** Segmented Control aus 7 Monaten (Vormonat … +5), im Frontend aus `today()`
berechnet; Auswahl setzt `bauplandatum` auf den Monatsersten. Kein Options-Generator nötig.

_(weitere Schritte folgen)_

## 7j. Kunde im Auftrag wählen — `afterUpdate` auf `A.PA` (KUNDE)

```
'Währung' := KUNDE.Währung
wenn KUNDE.STAATEN = 88 (USA)          → Arbeitsschritt 94 "Fish&Wildlife (USA)" sicherstellen, sonst löschen
wenn KUNDE.STAATEN.Region > 2 (non-EU) → Arbeitsschritt 96 "Ausfuhrantrag" sicherstellen, sonst löschen
```
(`KUNDE.Anzeigename;` als nackter Ausdruck = No-op/Touch.)
Land-Datensatz 88 = USA (`Region = 5`) → im Ziel `region = 5` statt hartkodierter ID.

**Wichtig — anders als im Angebot:** Der Auftrag **snapshottet die Kundenadresse NICHT**. Er hält nur
die Referenz `KUNDE` (`PA` → Adressen) und leitet den Anzeigenamen per Formel `PD` ab. Das Angebot
dagegen kopiert Firma/Name/Straße/PLZ/Ort/Staat beim Kundenwählen fest (Schritt 1).
→ Inkonsistenz, im Ziel vereinheitlichen (siehe offene Punkte). Rechnung (BC) noch prüfen.

### Compliance-Arbeitsschritte — Gesamtbild (alle Typ 2, idempotent „ensure/remove")
| Vorrat | Schritt | Bedingung | Quelle |
|---|---|---|---|
| 93 | Cites (Rio) | irgendein Holz-Slot-Artikel ist `Geschütztes Holz (Cites)` | Holz-Slot-Trigger (7d) + Status-15-Trigger (7g) |
| 94 | Fish&Wildlife (USA) | `KUNDE.STAATEN.Region = 5` | KUNDE-Trigger (dieser) |
| 96 | Ausfuhrantrag | `KUNDE.STAATEN.Region > 2` (außerhalb EU) | KUNDE-Trigger (dieser) |
| 84 | Sonderarbeit (Reparatur) | `Auftragsstatus = 13` (Service) | Status-Trigger (7g) |

`afterCreate` fügt zuerst alle Standard-Schritte ein und löscht 93/94/96 sofort wieder — diese Trigger
setzen sie bedarfsgerecht neu.

**Design fürs Zielschema:** eine Funktion `recomputeComplianceSteps(auftrag)` deckt 93/94/96 (und ggf. 84) ab,
läuft bei Änderung von Holz-Slots, KUNDE oder Status. „ensure present / else remove" = idempotenter Set-Abgleich.

_(weitere Schritte folgen)_

## 7k. Bauplanung / Monats-Kapazitätsansicht  ⚠️ Redesign-Kandidat

**Ist-Zustand (nicht optimal, laut Rainer):** Eine View poppt per Switch auf und zeigt alle Aufträge
des gewählten Monats:
```
if Bauplan then (select Aufträge)[Bauplandatum = my.Bauplandatum]
```
Darüber Aggregate: Anzahl Aufträge, vorkommende Modelle, erwarteter Gesamtumsatz, je Modell
Anzahl + Umsatz.

**Vorhandene Bausteine für eine bessere Lösung:**
- `A.GY` „Umsatzerwartung" (Formel je Auftrag) · `A.Bauplandatum` (Monatszuordnung, 1. des Monats).
- `Modellgruppen` (OD): `Mindesmenge je Monat` / `Maximalmenge je Monat` (Kapazitätsband je Modellfamilie),
  `Durchschnittspreis EUR/USD`.
- `Report Monat` (TD, 45 Formeln): Monats-Finanzreport (Umsatz Gitarren/Non-Guitar, Währungssplit,
  Skonto/Storno, Kostendeckung, offene Rechnungen, „Umsatzerwartung der Endmontierten") — verwandt,
  aber Finanzsicht, nicht Kapazitätsplanung.

**Design-Idee fürs Zielsystem (noch abzustimmen):** Monats-Board — Monat wählen → zugeordnete Aufträge,
Aggregat Anzahl + Umsatzerwartung gesamt und je Modellgruppe, **Soll/Ist gegen `Mindesmenge`/`Maximalmenge`**
(Kapazitäts-Ampel), Aufträge per Drag/Zuweisung auf Monate schieben (= `bauplandatum` setzen).
→ hier bewusst **Neuentwurf statt 1:1-Port** (Design später).

### `A.GY` „Umsatzerwartung" (EUR-normierter Planungswert)
```
wenn 'Summe Netto_' gesetzt:            // Positionen existieren
    Währung EUR → 'Summe Netto_'
    Währung USD → 'Summe Netto_' * 0.92
sonst:                                  // nur Model gewählt → Schätzung aus Model-Grundpreis
    NET1   → MODELLARTIKEL.NET1
    NET2   → MODELLARTIKEL.NET2
    NET_US → MODELLARTIKEL.NET_US   * 0.92
    VK_US  → MODELLARTIKEL.VK_US    * 0.92
    VK_EUR → MODELLARTIKEL.VK_EUR_net
```
- `COALESCE(Ist-Netto, Model-Grundpreis)`, alles nach EUR normiert.
- **Fixer USD→EUR-Faktor `0.92` hartkodiert (3×)** → im Ziel eine Konstante/Setting (oder Live-Kurs).
- Schätzzweig ignoriert Aufpreise (nur Model-Basispreis), bis Positionen erzeugt sind.
- Vertriebsweg→Preisfeld-Mapping wie im Positions-Generator (Schritt 3), hier auf `MODELLARTIKEL`.

_(weitere Schritte folgen)_

## 7l. Manuelle Position / Porto hinzufügen (Buttons unter der Positionstabelle, Auftrag)

Buttons: **„Neue Position zufügen"** (Variante 1) und **„Porto Position zufügen"** (Variante 2).

**Wenn `Porto auswählen` (`A.JG`, dchoice → Artikel Gruppe „Versand") gesetzt:**
- neue `Auftragsposition`: `ARTIKEL AUSWÄHLEN` = der Versandartikel, `RE_relevant := true`, `Anzahl := 1`,
  `Pos Nr := max(vorhandene Pos Nr) + 1` (**anhängen**, kein Renumber).
- `Einzelpreis` nach Vertriebsweg — **abweichend vom Haupt-Generator**: immer **Retail-Preis**:
  NET1/NET2/VK_EUR → `VK_EUR`, NET_US/VK_US → `VK_US`. Also **kein Händler-/Artist-Rabatt auf Porto**.
- `Porto auswählen := null`, dann `popupRecord`.

**Sonst (leere Position):** neue `Auftragsposition` mit `RE_relevant := true`, `Einzelpreis := 0.01`
(Platzhalter), `Pos Nr := max + 1`, `Anzahl := 1`, popup.

Anmerkungen: setzt im Porto-Zweig **nicht** die Text-Snapshots `Artikel`/`Artikelbeschreibung`
(nur die Ref) — inkonsistent zum Generator. `0.01`-Platzhalter = Ninox-Workaround gegen 0/null.

**Zweiter „Porto auswählen"-Button daneben** (offenbar neuere/bereinigte Variante, alte nie entfernt):
- Guard: leeres `Porto auswählen` → `alert(...)` statt stiller Leerzeile.
- Setzt Text-Snapshots `Artikel` + `Artikelbeschreibung`.
- Preis: NET1/NET2/VK_EUR → **`VK_EUR_net`** (netto!), NET_US/VK_US → `VK_US`.
- Setzt `Porto auswählen` **nicht** zurück; kein Leer-Zweig.

⚠️ **Widerspruch:** Variante 1 nimmt `VK_EUR` (brutto), Variante 2 `VK_EUR_net` (netto). Da Positionen
netto sind (4a), ist Variante 2 korrekt — Variante 1 schreibt vermutlich fälschlich einen Bruttopreis
in eine Nettozeile.

**Design fürs Zielschema:** **eine** „Porto hinzufügen"-Aktion (Varianten zusammenführen): Guard,
Text-Snapshots, Netto-Preis (`VK_EUR_net`/`VK_US`), Retail-Tier erzwungen (kein NET-Rabatt auf Porto),
Renumber wie beim Generator. Separate „leere Zeile"-Aktion ohne `0.01`-Hack (null/0 + Validierung).

_(weitere Schritte folgen)_

## 7m. Auftrag → neues Angebot (Button, Umkehrung von 7e)

Anwendungsfall: „diese Gitarre gefällt mir wie sie ist, ich brauche aber ein Angebot."

`create Angebote` → `do as server` (Kopf) → `do as server` (Positionen) → `popupRecord` + Warn-`alert`.

**Kopf-Kopie:** wie 7e — `KUNDE` (nur Ref), `MODELLARTIKEL`, alle ~55 Spec-Slots + `_K` + Freitexte +
`(mehrfach)`, `'Positionen anzeigen' := true`. Unterschiede:
- Herkunft nur als Freitext: `'Interne Bemerkung (wird nicht gedruckt)' := "Übernahme aus Auftrag " + Auftragsnummer`
  — **kein Feld, keine FK** (schwächste Verknüpfung bisher).
- `'Angebotsübernahme Helper' := true` steht nur als String → **tot**.
- Quell-Auftrag wird **nicht** im Status geändert.

**Positions-Kopie:** `for i in AUFTRAGSPOSITIONEN` — **ALLE** Positionen (nicht nur `RE_relevant`,
anders als 7e). Felder 1:1 (Pos Nr, ARTIKEL AUSWÄHLEN, Artikel, Artikelbeschreibung, Anzahl,
Einzelpreis, Rabatt, Gesamtpreis, RE_relevant). `'VK Retail Wert'` wird **nur für Kontaktart = 3
(Händler)** neu gesetzt (Vertriebsweg 3/4 → `VK_US·Anzahl`, sonst `VK_EUR·Anzahl`); für alle anderen
bleibt es null.

**Warn-Alert:** „Wenn ein anderer Kunde ausgewählt wird, müssen die Positionen gelöscht und neu
generiert werden!" → die kopierten Positionspreise sind **an das Preis-Tier des Ausgangskunden gebunden**.

**Design fürs Zielschema:**
- Generische Aktion `dokumentAusSpecsErzeugen(quelle, zielTyp)` — deckt Angebot↔Auftrag beide Richtungen ab.
- Herkunft als **echte FK** (`erzeugt_aus_auftrag_id` / `erzeugt_aus_angebot_id`), nicht Freitext.
- Kernproblem sauber lösen: **Positionspreise sind kundentier-abhängige Snapshots.** Bei Kundenwechsel
  am Beleg entweder Positionen sperren/verwerfen oder automatisch neu generieren — nicht auf User-Merkfähigkeit
  verlassen (heute nur ein Alert).
- Klären: warum kopiert diese Richtung *alle* Positionen, die andere nur `RE_relevant`? (bewusst oder Altlast)

_(weitere Schritte folgen)_

## 7n. Auftragsbestätigung erzeugen + E-Mail (Button im Auftrag)

Analog zu Schritt 4 (Angebot). Ablauf identisch: Template holen (falls leer) → `printAndSaveRecord`
→ `Mailversand` + `Anhänge_` → `popupRecord(newMail)`. **Deltas gegenüber Angebot:**

| Aspekt | Angebot (Schritt 4) | Auftragsbestätigung (dieser) |
|---|---|---|
| Template-Match | `TemplateArt = 2` | `TemplateArt = 1` |
| Belegart | `"ANGEBOT"` | `"AUFTRAGSBESTÄTIGUNG"` |
| Kopf-Text | `Kopftext = 'Angebots Text'` | `Briefkopf = KUNDE.Briefkopf` (Formelfeld `MC.O7`, Override `MC.V9`) |
| Summen | `Summe Netto/MwSt./Brutto` (ohne Rabatt) | `Summe Netto_/MwSt_/Brutto_` (**nach Gesamtrabatt**, 4a) |
| Positionen | `Angebotspositionen[RE_relevant]` | `AUFTRAGSPOSITIONEN[RE_relevant]` |
| Datum im DTO | `Angebotsdatum` | `Auftragsdatum` (`A.KF`) |
| Mail-Empfänger | `KUNDE.'E-Mail'` | `first(KUNDE.Ansprechpartner['Primäre E-Mail' = 1].'E-Mail')` (SE.Y-Flag) |
| Mail `Art` | 1 | 2 |
| Betreff | „Angebot" / „Offer" | „Auftragsbestätigung" / „Order Confirmation" |
| Status-/Datumsupdate | `Angebotsstatus := 2`, `Angebotsdatum := today()` | **keins** (kein AB-Status/-Datum-Feld, nur Mailversand Art=2 als Spur) |

`vTabelle`-Zeilenaufbau identisch (Artikelname = Name + Beschreibung + optional „(VK/ Retail: …)").
Dateiname-Bug (`.pdf.pdf`) hier ebenfalls.

**Design fürs Zielschema:** *ein* parametrisierter Dokument-Generator
`renderBeleg(record, { belegart, templateArt, kopfquelle, summenquelle, positionsquelle, empfänger, mailArt, betreff })`.
Empfänger-Regel je Belegart konfigurierbar (Angebot → Kunden-Mail, AB → Primär-Ansprechpartner).
`briefkopf` = Kunden-Adressblock mit manuellem Override.

_(weitere Schritte folgen)_

## 7o. Lieferschein erzeugen (Button im Auftrag)

Wie 7n, aber **Print-only** (keine Preise, kein Mailversand):
- Template-Feld `'Liefer-Drucktemplate auswählen'` (`A.MI`). Sollte `TemplateArt = 4` (Lieferschein) matchen.
- `Belegart: "Delivery Note"` (fix englisch, unabhängig von Kundensprache).
- DTO **ohne Summen**; `vTabelle` nur `Pos`, `Artikelname` (Name + Beschreibung, **keine** Retail-Zeile),
  `Anzahl`, `ArtikelNr`. Positionen aus `AUFTRAGSPOSITIONEN[RE_relevant] order by 'Pos Nr'`.
- Ergebnis: `Lieferschein := importFile(printAndSaveRecord(...))` → PDF landet direkt im Dateifeld
  `Lieferschein` am Auftrag. Kein `Mailversand`, kein `popupRecord`.

⚠️ **Bug im „Template wenn leer"-Block:** er befüllt `'Drucktemplate auswählen'` (AB-Feld) mit
`TemplateArt = 1` statt `'Liefer-Drucktemplate auswählen'` mit `TemplateArt = 4`. `myLayout` liest
aber das Liefer-Feld → wenn das leer ist, bleibt `myLayout` null und der Druck schlägt fehl.
Copy-Paste-Fehler; im Ziel korrekt verdrahten.

**Design fürs Zielschema:** derselbe `renderBeleg`-Generator, Profil „Lieferschein": TemplateArt 4,
keine Summen, reduzierte Positionsspalten, Ausgabe = Datei am Auftrag (kein Mailflow). Belegart-Text
über i18n statt fix „Delivery Note".

_(weitere Schritte folgen)_

## 7p. Rechnung erzeugen (Button im Auftrag)

**Guard:** wenn `Seriennummer lfd` < 1 / null **und** `Auftragsstatus != 17` (nicht NoneGuitar)
→ Dialog „Keine Seriennummer vorhanden? Trotzdem erstellen?" (Ja/Nein). Echte Gitarren brauchen
i. d. R. eine Seriennummer vor der Rechnung (weiche Warnung, kein Hard-Block); NoneGuitar überspringt.

**Beide Zweige (Script 1 = mit Dialog, Script 2 = Seriennr vorhanden):**
- `Auftrag.Rechnungsdatum := today()`
- `create Rechnungen` (BC): `KUNDE` (Ref) · `Belegart := 1` (Rechnung) · `Rechnungsdatum := today()` ·
  **`'ZUGEHÖRIGER AUFTRAG' := my`** (echte FK `BC.G1` → A) · `'Anzahlung berücksichtigen' := Auftrag.Anzahlung`
- Positionen: `for i in AUFTRAGSPOSITIONEN[RE_relevant]` → `Rechnungspositionen` (CC, Spiegel von AC/ZC),
  alle Werte 1:1 inkl. `VK Retail Wert`.
- `'ARBEITSSCHRITTE-AUFTRAG'[Vorrat = 95].(Status := 3)` — Arbeitsschritt **95 „Rechnung"** → erledigt.
- `popupRecord(neu)`.

⚠️ **Script 2 kopiert die Gesamtrabatt-Felder NICHT** (`Gesamtrabatt gewähren/Prozent/Wert`),
Script 1 schon. Da Script 2 der Normalpfad ist (Seriennr vorhanden), verliert eine so erzeugte
Rechnung den Auftrags-Gesamtrabatt. Vermutlich Altlast (wie die zwei Porto-Buttons) → im Ziel
Gesamtrabatt **immer** mitkopieren.

### Rechnungen (BC, 65 Felder) — Schlüsselfelder
- `V3` **Belegart** {1 Rechnung · 2 Stornorechnung · 5 Gutschrift}
- `D` **Rechnungsstatus** {1 offen · 2 bezahlt · 3 Stornorechnung (−) · 4 Gutschrift · 5 RG ist storniert}
- `J4` Zahlungsstatus {1 Angezahlt · 2 Teilzahlung · 3 Bezahlt · 4 Angemahnt}
- `G1` ZUGEHÖRIGER AUFTRAG (→A) · `B2` KUNDE (→MC) · `X3` „Referenz zu RE" (String, für Storno/Gutschrift)
- `A/H1/Q2` Rechnungscounter / -nummer (fn) / -nummerText — Nummernkreis wie gehabt
- `M/O/P` Summe Netto_/MwSt./Brutto_ (fn, nach Rabatt) · `G7` SummePositionen_
- `C7/D7/E7` Gesamtrabatt Prozent/Wert/gewähren · `G5` Anzahlung berücksichtigen (+ `D5` Anzahlung Brutto,
  `E5` Rechnungsbetrag, `F5` Anzahlung Datum)
- `W1` Zahlungsdatum · `X1` Tatsächlicher Zahlbetrag · `Y1` Differenz Zahlung_ · `S3` Zahlung an Bank {VVB · Chase · Paypal}
- `R4` → Report Monat (TD) · `A7` Währung {EUR · USD} · `M1` Drucklayout {DE · EN} · `Q1` Drucktemplate auswählen
- `CC` Rechnungspositionen (17 Felder): Spiegel von AC/ZC (A→WB, B Pos Nr, C Artikel, D Anzahl,
  E Einzelpreis, F Gesamtpreis, G→BC, H RE_relevant, N Rabatt, U Artikelbeschreibung, C1 VK Retail Wert).

**Design fürs Zielschema:**
- Rechnung ← Auftrag: Deep Copy (RE_relevant-Positionen), echte FK `auftrag_id`, Anzahlung + Gesamtrabatt
  **immer** übernehmen.
- Serien-Nr-Guard als weiche Validierung, für NoneGuitar aus.
- Nebeneffekt Arbeitsschritt 95 → erledigt (Status-Hook-Muster).
- `belegart` (Rechnung/Storno/Gutschrift) + `rechnungsstatus` + `zahlungsstatus` als getrennte Enums;
  `referenz_rechnung_id` als echte FK für Storno/Gutschrift (heute String `X3`).

_(weitere Schritte folgen — als Nächstes vmtl. Storno/Gutschrift, Zahlungserfassung, Rechnungs-PDF)_

## 7q. CITES- und Lacey-Act-Beleg (Buttons im Auftrag)

Beide: **Print-only**, **fester Layout-Name** (keine Template-Tabelle), Ergebnis in ein Dateifeld am
Auftrag, kein Mailversand. Datenbasis = `Holzpositionen`-View (7d) + Untertabellen des Artikels.

| | **CITES-Druck** | **Lacey-Act-Druck** |
|---|---|---|
| Layout | `"Cites"` | `"Lacey"` |
| Zielfeld | `CITES-Dokument` (`A.H31`) | `Lacey Act-Dokument` |
| Umfang | nur `Holzpositionen[Geschütztes Holz (Cites) = 1]` | **alle** `Holzpositionen` |
| Datum | `DD.MM.YYYY` (heute) | `MM/DD/YYYY` (US); zusätzlich `Heute = today()+3` |
| Bearbeiter | — | **fix „Elly Müller"** (nicht `userName()`) |
| Kennzahl | `Masse` = `round(Σ Holzartikel.'Gewicht kg', 1)` | `Preis` = `Summe Brutto_`, `W` = € / $ |
| Zeile je Position | `{ parts: Artikelgruppe }` | `hts_number` „92079010" (fix), `artikelgruppe`, `botanischer_Name`, `herkunft`, `volumen = round(Volumen m³, 5)`, `unit "m^3"` |
| Dateiname | `YYYY-MM-DD CITES <Seriennummer>.pdf` | `YYYY-MM-DD LaceyAct <Seriennummer>.pdf` |

**Wood-Compliance-Datenmodell:**
- `Artikel → 'NKS Holzart'` (TF): `Botanischer Name`, `Herkunft`, `Holzdichte`, `Species`, `Genus`.
- `Artikel → 'NKS Gewichte'` (= Tabelle `SF` „NKS Parts Volumen"): `Volumen m^3` je Artikelgruppe.
- `Artikel.'Gewicht kg'` (`WB.DG`, Formel) ≈ Volumen × Dichte.
- `Artikel.'Geschütztes Holz (Cites)'` (`WB.LE`) = Schutz-Flag.

**Design fürs Zielschema:**
- Zwei Renderer-Profile „CITES" / „Lacey" aus `holzpositionen ⨝ nks_holzart ⨝ nks_gewichte`.
- Hartkodiertes zentral als Setting/Stammdaten: HTS-Code `92079010`, Unterzeichner „Elly Müller",
  Offset `+3 Tage`.
- Beleg-Formulare (CITES-Formular, Stempel/Unterschrift-Bilder) liegen unter `Druckausgaben/Cites/`
  bzw. `Druckausgaben/Lacey/` — überwiegend statischer Templateinhalt, nur wenige Merge-Felder.

_(weitere Schritte folgen)_

## 7r. Benutzer / Login / „wer arbeitet gerade?"

**Ziel:** jeder Mitarbeiter bekommt einen **eigenen Login**; die App erkennt den angemeldeten Benutzer
und füllt damit automatisch: `Bearbeiter`/`Email` in Beleg-DTOs (heute `userName()`/`userEmail()`),
`erfasst von`-Initialen bei Auftragsanlage, `MA` am Arbeitsschritt, `erstellt von`/`geändert von` (Audit),
Benutzer-Filter in Listen.

**Ninox-Ist / Workaround:** Lizenzen reichten nicht für Seats pro Person → in den Arbeitsschritten
eine Leiste mit allen Namen zum Selbst-Markieren:
`A4` „Mitarbeiter" (dchoice) ← `(select Mitarbeiter where Arbeitsschritte = true) order by Name`.

`Mitarbeiter` (NB, 22 Datensätze): `A` Name · `C` Benutzer (Ninox-`user`, nur ~10 verknüpft, Rest
namentlich ohne Seat) · `D` User Rolle (fn) · `U` ToDo (in ToDo-Picker zeigen) · `V` Arbeitsschritte
(in Schritt-Picker zeigen) · `W` inaktiv.
Weitere Namens-Enums zum Vereinheitlichen: Arbeitsschritt `B3` „Warten auf" {Igor · Florian · Rui · Intern};
Unterzeichner „Elly Müller" (7q).

**Design fürs Zielschema:**
- `user`-Tabelle mit echtem Login (Credential/SSO), `aktiv`, `rolle`; alle NB-Zeilen (mit/ohne Seat)
  konvergieren hierhin. `V`/`U` → Capability-Flags („Werkstatt", „ToDo-empfangbar").
- Self-Tag-Leiste **entfällt** → `bearbeiter_id := session.user` automatisch, optionaler manueller Override
  (Vorarbeiter erfasst für andere).
- Audit `_cd/_cu/_md/_mu` → `created_at/by`, `updated_at/by` aus Session.
- RBAC statt Ninox `rolesOpen/History/Export/Import/Print/MassDataUpdate` (settings.json, meist `["admin"]`).
- „Warten auf" / externe Namen: an `user` bzw. eine kleine Partner-/Enum-Liste koppeln.

_(weitere Schritte folgen)_

## 7s. Arbeitsschritt-`Status` — Änderungstrigger (treibt den Auftragsstatus)

Status-Enum (D.J2): **1 offen · 3 erledigt · 4 Warten auf … · 5 Kiste vollständig**.

**1. Zeitstempel + Bearbeiter (`MA`):**
- Status = 1 → `Date + Time := null`, `MA := null`
- Status ∈ {3,4,5} → `Date + Time := now()`; `MA :=` `text(Mitarbeiter)` (Self-Tag, falls gesetzt)
  sonst Initialen aus `userName()`. Andere Status → nur `MA` setzen, kein Stempel.

**2. Auftrag in die Werkstatt ziehen:** wenn `AUFTRAG.Auftragsstatus = 4` (Vorlauf/Backorder)
→ `AUFTRAG.Auftragsstatus := 10` (in Werkstatt). Erster bearbeiteter Schritt löst das aus.

**3. Werkstattbeginn:** wenn leer → `AUFTRAG.Werkstattbeginn := today()`.

**4. Montage fertig** (`ARBEITSSCHRITTEVORRAT.Nr = 81` & Status = 3):
`AUFTRAG.Auftragsstatus := 15` (Produktion fertig) · `AUFTRAG.Endmontagedatum := today()` ·
alle noch offenen Typ-1-Werkstatt-Schritte des Auftrags → Status 3.

**5. Versendet fertig** (`ARBEITSSCHRITTEVORRAT.Nr = 99` & Status = 3):
`AUFTRAG.Auftragsstatus := 6` (Abgeschlossen) · `AUFTRAG.Versanddatum := today()`.
*(Umgeht scheinbar die „kein Abschluss ohne Rechnung"-Regel aus 7g — vermutlich unkritisch, weil der
Versand-Schritt ohnehin erst nach der Rechnung abgehakt wird. Im Ziel konsolidieren.)*

**6. „ThisNext"-Marker** (nur für die Tabellenansicht): alle Schritte des Auftrags `ThisNext := false`,
dann den Schritt mit **kleinster `Order`** unter `Status ∈ {1,4}` (offen/warten), **ohne Order 29**
(„Kiste packen"), auf `ThisNext := true`. = „das ist als Nächstes dran".

**Design fürs Zielschema:**
- Arbeitsschritt-Abschluss ist **der Haupttreiber** der Produktionsstatus. Als Hooks modellieren:
  Stempel `erledigt_am`/`erledigt_von` (Session-User, manueller Override) setzen/löschen;
  Backorder → In Werkstatt (+ `werkstattbeginn`); Montage-Schritt fertig → Produktion fertig
  (+ `endmontagedatum`, Rest-Schritte auto-erledigen); Versendet-Schritt fertig → Abgeschlossen (+ `versanddatum`).
- `ThisNext` = **abgeleitet** (View/berechnet: kleinste offene Order ≠ 29), kein überall getoggelter Bool.
- Zusammen mit 7g definieren diese zwei Trigger die Auftrags-Progression — Überschneidungen
  (Status-15-Cascade steht in beiden) im Ziel **einmal** implementieren.
- Regex-Inkonsistenz `([A-Z]+)` (7f) vs `([0-9][A-Z]+)` (hier) für Initialen → mit Session-User-Ref irrelevant.

_(weitere Schritte folgen)_

## 7t. Button „Alle vorhergehenden Arbeitsschritte auf erledigt setzen"

Bestätigungsdialog → `do as server`:
- Alle Schritte desselben Auftrags mit `Vorrat.Order < this.Vorrat.Order`, `Status ∈ {1,4}`,
  **ausgenommen Vorrat 86** („Kiste packen", Order 29) → `Status := 3`, **`MA := ""`, `Date + Time := ""`**
  (bewusst **ohne** Bearbeiter/Zeit — die Schritte wurden nicht wirklich ausgeführt, nur quittiert).
- Danach `ThisNext`-Marker neu berechnen (identisch zu 7s Teil 6).

**Verhalten:** Der Bulk-Server-Write löst die per-Schritt-`Status`-Trigger (7s) **nicht** aus →
der Auftragsstatus wird hier *nicht* mitgezogen (anders als beim Einzeln-Abhaken).

**Design fürs Zielschema:**
- Aktion „alle vorherigen erledigen": frühere offene/wartende Schritte des Auftrags auf erledigt,
  „Kiste packen" ausgenommen, **ohne** `erledigt_von`/`erledigt_am`.
- Bewusst entscheiden, ob dabei die Auftrags-Progressions-Hooks laufen sollen (heute: nein).
- `recomputeNextStep(auftrag)` als **ein** Helper (dupliziert in 7s + 7t).

_(weitere Schritte folgen)_

## 7u. Navigation aus dem Arbeitsschritt

Aus jedem Arbeitsschritt kann man in den **Auftrag** und in die **Specs** springen, um nachzusehen,
was genau definiert ist. Der Arbeitsschritt (D) spiegelt zusätzlich Freitexte read-only:
`P4` Body-Freitext · `Q4` Colour-Freitext · `R4` Neck-Freitext · `S4` Assembly-Freitext ·
`W1` „Infos zum Arbeitsschritt".

**Design fürs Zielschema:** In der Arbeitsschritt-Detailansicht Link auf den Auftrag + eingebettete
(oder verlinkte) Spec-Übersicht; Freitexte direkt am Schritt anzeigen (Werkstattbank-Referenz).

### Mitarbeiter-Ansicht (Schritt-Liste je Auftrag)
Spalten: **Part · Status · Date + Time · MA · Bemerkung des Bearbeiters · Dauer · Order · ThisNext · Nr**.
Sortiert nach `Vorrat.Order`. **Zeilenfarbe** aus `Vorrat.Part` (`PB.H`, Choice mit Farbverlauf
blau → rot/rosa → gelb/orange → grün entlang der Produktionsreihenfolge). Gröbere Phasen-Gruppierung:
`Vorrat.Gruppe` (`PB.F1`, 9 Werte: Holzauswahl · Holz verleimen · CNC · Holzschliff · Lackieren ·
Oberfläche · Endmontage · Endkontrolle/Versand · „Pfusch?"). `ThisNext` markiert die aktuelle Zeile.

**Datenqualität (aus Screenshot):**
- `MA` enthält teils **„1User"** — kaputte Attribution aus dem `userName()`-Fallback (kein echter Name).
  → bestätigt 7r: mit echten Logins sauber ersetzen.
- `Dauer`/`Startzeit` werden nicht genutzt (alles 0:00).
- Screenshot zeigt **doppelte Office-Schritte** (Ausfuhrantrag/Fotos/… zweimal) → beim Import auf
  duplizierte `Arbeitsschritte-Auftrag`-Zeilen prüfen und dedupen.

**Design fürs Zielschema:** Schritt-Liste = `arbeitsschritt`-Zeilen des Auftrags nach `vorrat.order`,
Zeilenfarbe/Phasenlabel aus `vorrat`, `next_step` hervorgehoben; Zeit-Tracking-Spalten optional/weglassbar.

_(weitere Schritte folgen)_

## 7v. Rechnung erzeugen + E-Mail (Button in Rechnung)

Gleiches Grundmuster wie 7n. `TemplateArt = 3`. Positionen aus `Rechnungspositionen[RE_relevant] order by 'Pos Nr'`
(Array-Aufbau per `array(vArray, [vObj])`-Schleife = Ninox-Workaround).

**Neue/erweiterte DTO-Felder gegenüber Angebot/AB:**
- **`Belegart` lokalisiert + typabhängig:** EN → 1 „Invoice" · 2 „Cancellation Invoice" · 5 „Bill Adjustment";
  DE → `text(Belegart)` (Rechnung/Stornorechnung/Gutschrift).
- **`DokNr`** = `RechnungsnummerText` + bei Belegart 2 (Storno): ` (for <Referenz zu RE>)` — Querverweis auf Original-RG.
- **Summenblock:** `SummePos`, `RabProz`, `RabWert`, `SummeNetto`, `SummeMwSt` (`MwSt. Summe_`), `SummeBrutto`
  (Format-Maske `"#,##0.00 #,#0.0"` ist malformed, funktioniert wohl trotzdem → im Ziel eine saubere Währungsformatierung).
- **Anzahlungsblock** (nur wenn `'Anzahlung berücksichtigen'`): `AnzText1/2/3` (DE/EN Labels;
  DE-`AnzText1` **ohne** Datum, EN mit — kleiner Bug), `AnzEUR` = `Anzahlung Brutto * -1` (Abzug),
  `AnzSumme` = `Rechnungsbetrag` (Brutto − Anzahlung).
- **`Zahlungsbedingung`** = `KUNDE.text(Zahlungsbedingungen)` direkt (Angebot/AB: Lookup in ED-Tabelle).
- **`ZusatzEU`** (Steuerbefreiungs-Fußnote): Region 2 → „Steuerfreie innergemeinschaftliche Lieferung";
  Region > 2 → „Steuerfreie Ausfuhrlieferung"; Region 1 → nichts.

  ⚠️ **Korrektheits-Bug:** `ZusatzEU` hängt **nur an `Region`**, nicht am tatsächlichen `Steuerpflichtig`.
  Ein EU-**Endkunde/Artist** wird laut 7b mit 19 % MwSt berechnet (`Steuerpflichtig = true`), bekäme hier
  aber trotzdem „Steuerfreie innergemeinschaftliche Lieferung" aufgedruckt → Widerspruch auf dem Beleg.
  **Fürs Ziel:** Fußnote strikt an das Steuerergebnis koppeln — MwSt berechnet ⇒ keine Befreiungsnote;
  `steuerpflichtig = false` + EU ⇒ innergemeinschaftlich; `steuerpflichtig = false` + non-EU ⇒ Ausfuhr.

**Mailversand (Art = 3):**
- `To` = Primär-Ansprechpartner (wie AB). Betreff „Rechnung"/„Invoice" + Nr.
- **`Inhalt` (HTML-Body, wird hier tatsächlich gefüllt)** =
  `"Order: " + Auftragsnummer + "<br>Model: " + MODELLARTIKEL.'Artikelname lang' + "<br><br>"`
  `+ KUNDE.Briefanrede + "<br>"`
  `+ Textvorlagen[Nr = 6 (DE) / 7 (EN)].Inhalt`  `+ Rechnungsnummer`.
- `Textvorlagen` (ID): `A` Inhalt (html) · `B` Betreff · `C` Textvorlagenart. #6 = DE-Rechnungsmail,
  #7 = EN. Platzhalter-Stil `*Anrede*`.
- `KUNDE.Briefanrede` (`MC.R4`) / `Briefanredezeile` (`MC.Q4`, fn) = Anrede des Kunden.

**Design fürs Zielschema:**
- Profil „Rechnung" im `renderBeleg`-Generator: TemplateArt 3, lokalisierter belegart-abhängiger Titel,
  Storno-Querverweis, Rabatt- + Anzahlungsblock, `ZusatzEU` **an das Steuerergebnis gekoppelt** (s. o.).
- Mail-Body aus **Mail-Template-Tabelle** (Belegart × Sprache) mit Variablen-Interpolation
  (`briefanrede`, `auftragsnummer`, `model`, `rechnungsnummer`). Ersetzt `Textvorlagen` #6/#7 + hartkodiertes Prefix.
- `anzahlung` (Brutto, Datum) am Auftrag/Rechnung; `rechnungsbetrag = brutto − anzahlung`.

_(weitere Schritte folgen)_

## 7w. Seriennummer des Auftrags (manuell ausgelöst)

Format: **`<Jahrpräfix> <lfd. Nr>`** (String `B2` „Seriennummer"), Zahlenteil `V9` „Seriennummer lfd"
(= eigentlicher Eindeutigkeitsschlüssel). Wird **nicht automatisch** vergeben, sondern per Button zu
einem bestimmten Zeitpunkt.

**Auto-Button:**
- `Jahrpräfix` aus `year(Bauplandatum)`: Jahr **≤ 2025 → nur letzte Ziffer** (2024→„4", 2025→„5");
  **≥ 2026 → letzte zwei Ziffern** (2026→„26"). Historisches Schema, kein Bug.
- Pool ab **4900**; `lfd` = **kleinste freie Nummer ≥ 4900** (Lücken von stornierten Aufträgen werden
  wiederverwendet), sonst `max(lfd) + 1`.
- Nur wenn `Bauplandatum` gesetzt (sonst Alert). Setzt `Seriennummer`, `Seriennummer lfd`,
  `SerNr wurde manuell vergeben := false`, `SerNr vergeben := today()`.

**Manuell-Button** (sichtbar bei `not 'SerNr manuell helper' and not Seriennummer and Auftragsart = 1`):
blendet Eingabefeld (Format `0 0000`) + „Seriennummer speichern" ein. Beim Speichern: Eindeutigkeits-
prüfung gegen alle Aufträge → sonst Alert; dann `Seriennummer := Eingabe`,
`SerNr wurde manuell vergeben := true`, `Seriennummer lfd := <Zahlenteil nach dem Leerzeichen>`,
`SerNr vergeben := today()`.

Felder (A): `B2` Seriennummer · `V9` Seriennummer lfd · `DO` „SerNr manuell helper" · `SerNr wurde
manuell vergeben` (bool) · `SerNr vergeben` (date) · Eingabefeld `bitte manuelle SerNr eingeben  0 0000`.

**Löschen:** Ist eine Seriennummer gespeichert (egal ob manuell oder automatisch), gibt es immer einen
Button zum Löschen — setzt `Seriennummer`/`Seriennummer lfd`/`SerNr wurde manuell vergeben`/`SerNr vergeben`
zurück. Die freigewordene Nummer fällt damit zurück in den Lücken-Pool (kleinste freie ≥ 4900).

**Hinweisfeld (User-Doku im UI):** manuelle Vergabe nur für Wunsch-/Sondernummern; Auto vergibt „die
nächsthöhere Nummer und überspringt bereits manuell vergebene"; erste Ziffer(n) aus dem Bauplan-Monat;
manuell vergebene per Checkbox markiert und beim Hochzählen ignoriert; Doppeltvergaben ausgeschlossen.
*Feinheit:* Der Code füllt tatsächlich **jede** Lücke ≥ 4900 (auch von gelöschten Auto-Nummern), nicht
nur „nächsthöhere unter Auslassung manueller" — die UI-Beschreibung ist vereinfacht. Zielverhalten
in [offene Punkte] klären (Lücken-Reuse ja/nein).

**Design fürs Zielschema:**
- `seriennummer_lfd` = Eindeutigkeitsschlüssel; Anzeigestring `{jahrpräfix} {lfd}` abgeleitet/`GENERATED`.
- Jahrpräfix-Regel als dokumentierte Funktion (Schwelle 2025/2026 fix übernehmen).
- Vergabe: „kleinste freie Nr ≥ 4900" (Query) **oder** monotone Sequenz — **klären:** Lücken-Wiederverwendung
  von stornierten Gitarren gewollt (Nummern nicht „verschenken") oder für Rückverfolgbarkeit lieber monoton?
- Manuelle Vergabe: Freitext + Uniqueness-Check + Flag `serial_manuell`, `lfd` aus Zahlenteil.
- Voraussetzung `bauplandatum` beibehalten (weiche Kopplung an die Planung).

_(weitere Schritte folgen)_

## 7x. Modelle (= Artikel mit Artikelgruppe „Model") + Specs-Editor

**Modell-Übersicht** = `Artikel[Artikelgruppe = 1]` (Model). Toggle „Inaktive" schaltet, ob archivierte
Datensätze (`WB.YC` „Datensatz inaktiv", bool) ausgeblendet werden. Aktuell 45 Modelle, 0 inaktiv.

**Button „Specs bearbeiten"** (`popupRecord(this, "Specs")`) öffnet dieselbe Artikel-Zeile in einem
anderen Formular („Specs"). Der Artikel-Typ hat mehrere Ninox-`uis`-Formulare: *Artikel* (Basis),
*Specs*, *Specs-Artikelliste*, *Kalkulation/Preis*, *Lager*, *admin* → im Ziel eigene Seiten/Tabs.

**Specs-Formular** (siehe Screenshot „Krautster III") — 4 Abschnitte:
**Body · Finish Colour · Neck · Assembly**. Je Spec-Feld: Dropdown (`dchoice` aus Artikelgruppe) +
Checkbox daneben (das `_K`-Aufpreis-Flag). Pro Abschnitt ein Freitext: `U9` Body Freitext ·
`HF` Colour Freitext · `TA` Neck Freitext · `HC` Assembly Freitext. Dazu `(mehrfach)`-Felder
(CNC PU Custom, Neck Options). „alt:"-Trenner = Legacy-Gruppierungen für Kompatibilität.

Weitere Buttons im Formular: „Specs neu einlesen", „Artikel archivieren", „NKS Gewichte holen",
„Modell-Zuordnung". Option-Artikel tragen `Z7` „Modelselect" (dmulti) = „wird bei folgenden Modellen
zur Auswahl angeboten" (bestätigt 6.3).

Nebenbei aus den `uis`-Captions zum Preis-Thema: „Händler EU 35%", „Händler nicht-EU 40%",
„US-Preisermittlung", „Endkundenpreis" → NET1/NET2 sind Händler-Preise, aus VK über Marge 35 %/40 %
abgeleitet (Details später, siehe offene Punkte „Artikeltyp"/Preis).

**Design fürs Zielschema:**
- Der **Specs-Editor ist EINE wiederverwendbare Komponente** (4 Abschnitte, je Feld Dropdown +
  Aufpreis-Checkbox, 4 Abschnitts-Freitexte) — geteilt von **Model, Angebot, Auftrag**.
- Modell = `artikel` mit `artikelgruppe = 'Model'`; Liste mit Aktiv/Archiv-Filter (`datensatz_inaktiv`).
- Mehrere Artikel-`uis` → getrennte Seiten/Tabs im UI.

_(weitere Schritte folgen)_

## 7y. Specs-Artikelliste (Reiter im Modell) — Regenerate-Button

Nächster Reiter nach „Specs": eine Tabelle aller gewählten Spec-Artikel des Modells.
`delete 'SPECS-ARTIKELLISTE'` → `do as server`: pro befülltem Spec-Slot → `create Specsartikelliste`
mit `MODELL := this`, `SpecsArtID := <Slot-Wert>`, `RE_relevant := <Slot>_K`.

`Specsartikelliste` (LF, 1148 Datensätze ≈ 45 Modelle × ~25 Slots): `C` SpecsArtID (Artikel-Nr, String) ·
`E` MODELL (→WB) · `J` Artikel (→WB) · `F` RE_relevant (bool). Flache `(Modell, Spec-Artikel, Aufpreis)`-Liste,
keine Preise, keine Nummerierung.

**Slot-Set hier etwas breiter** als beim Positions-Generator (Schritt 3): zusätzlich
`Top Colour` / `Body Colour` / `Neck Colour` (mit `_K`).

⚠️ **Copy-Paste-Bugs im Script:** `Headstock`-Zeile nutzt `Body_K` (statt `Headstock_K`),
`Headstock Inlay`-Zeile nutzt `Headstock_K` (statt `Headstock_Inlay_K`), `PU Bridge`-Zeile nutzt
`Body_K` (statt `PU_Bridge_K`). Außerdem hängt die **gesamte** Kaskade in `if Body then … end` —
ein Modell ohne Body erzeugt eine leere Liste.

**Design fürs Zielschema:**
- `specs_artikelliste` = **abgeleitete View** `(modell_id, spec_artikel_id, slot, re_relevant)` —
  keine Tabelle, kein Regenerate-Button (wie `holzpositionen`, 7d).
- **4. Fundstelle derselben Spec-Slot-Iteration** (nach Positions-Generator, Doc→Doc-Copy, Holzpositionen).
  → **Slot-Liste EINMAL zentral definieren** (`slot → feld → _k-feld → gruppe → order`), alle Consumer
  iterieren sie. Beseitigt die drei `_K`-Bugs by construction.

### Specs-Artikelliste als Kalkulationsansicht
Derselbe Reiter dient der **Preis-/Kostenkalkulation** des Modells:
- Kopf: `Specs VK EUR` / `Specs NET1` / `Specs NET2` (`WB.RD/SD/TD`) = die Tier-Preise des Modells
  (`RD.fn = "G"` → schlicht das Feld `VK_EUR`; NET-Tiers analog `K3`/`M3`).
- Tabelle: je Spec-Artikel Spalten `VK_EUR · NET1 · NET2 · Hersteller · Lieferant · EK netto EUR · Nr`.
  Die meisten Zeilen 0,00 € (Standard-Spec ohne Preiswirkung); Optionen tragen **Deltas** (auch negativ,
  z. B. „Body Finish – Open Pore" −305,00 € VK / −198,25 NET1).
- Fußzeile: Spaltensummen (u. a. Σ `EK netto EUR` = Komponenten-Einkaufskosten für Margenbetrachtung).
- Buttons: „Datensatz erstellen" (manuelle Zeile), „Specs neu einlesen" (regenerieren).

**Preis-Tier-Formeln (Artikel, aus `.fn`):**
```
NET1 (K3) = if 'Brutto für Netto' (Y5)      then round(VK_EUR, 2)
            else if 'nicht rabattierfähig' (Q5) then round(VK_EUR_net, 2)
            else round(VK_EUR * (1 - NF.N/100), 2)      // NF = Singleton "Allgemein", Feld N = Marge %
NET2 (M3) analog mit eigenem %-Satz
VK_EUR_net (J3) = VK_EUR abzüglich MwSt
```
→ NET1/NET2 = Händler-Preise als **VK_EUR minus fester Marge** (die „35 % / 40 %" aus den uis-Captions).
**Hinweis für spätere Extraktion:** Ninox-Formelcode liegt im Feld-Objekt unter `.fn`, **nicht** `.expr`
(mein `schema_summary.js` hatte deshalb leere Formeln angezeigt).

**Design fürs Zielschema:** Modellpreis pro Tier = Basispreis + Σ(Spec-Deltas). Tiers aus einem
zentralen Margen-Setting (statt Ninox `NF`-Singleton). Kalkulationsansicht = View über die Spec-Slots
mit Delta-Preis + EK je Komponente, Summenzeile. Details der Preis-/Aufpreisrechnung → offener Punkt.

### Kalkulation-Sektion  ⚠️ Redesign-Kandidat
Eigene Sektion am Modell mit Feldern: `EK netto EUR_` (Σ Komponenten-EK, z. B. 186,10 €) ·
`Kleinteile` · `Arbeitsstunden` · `Kosten Arbeitsstunde` · `Produktionskosten`
(= EK + Kleinteile + Arbeitsstunden × Kosten/Std). **Laut Rainer nur rudimentär vorhanden**
(Arbeits-/Kleinteil-Felder leer → Produktionskosten = reiner EK). Bewusst **Neuentwurf**, kein 1:1-Port —
z. B. echte Stücklisten-/Arbeitszeit-Kalkulation, Deckungsbeitrag je Tier, Soll-Marge-Prüfung.

_(weitere Schritte folgen)_

## 7z. Report Monat (TD) — Monatsreporting  ⚠️ Redesign-Kandidat

Tabelle `Report Monat` (TD, 45 Formelfelder, ~57 Datensätze = 1 pro Monat). Rechnungen hängen über
`BC.R4` → TD am Monat.

**Hauptansicht:** Zeile je Monat — Monat · RG-Jahr · Gesamtumsatz kumuliert · Anzahl Gitarren ·
Summe Umsatz · Durchschn. Gitarre · Endmontage Anzahl/Umsatz · Kostendeckung des Monats/kumuliert.
Tabs: *Umsatz · Auftragsstati (aktuell) · Rechnungen (des Monats) · offene Rechnungen · Monatsvergleich ·
Planmonate Tabelle · admin*. Plus Chart-Tabs „Diagramm Umsatz" / „Diagramm Stück".

**Umsatz-Tab je Monat:** Anzahl Gitarren, Ø Gitarre, Endmontage-Anzahl, Umsatzerwartung der
Endmontierten; Umsätze ohne MwSt (Gitarren EUR/USD, Non-Guitar, Skonti); Gesamtumsatz + kumuliert;
Kostendeckung (vs. Monatskostenziel aus „Kosten Jahr" KE); „mit Storno/Gutschrift ohne Skonti"
(Summe aller Belege, Summe Storno); + Tabelle der Monats-Gitarren (Modellgruppe, Erlös EUR, Seriennr,
Kunde, Produktionsort, Region).

**Export-Button** (heute): baut eine **CSV** (`;`-getrennt, DE) über `Rechnungen des Monats[KUNDE != ""]`
via `createTempFile`/`appendTempFile` in ein Link-Feld `Monats-Rechnungsausgang`.
Spalten: `RGmonat · Rechnungsnummer · Rechnungsdatum (DD.MM.YYYY) · Seriennummer · Waehrung ·
Summe Netto · MwSt Summe · Summe Brutto · EUR Brutto · USD`.
`printRecord(this, appendTempFile(...))`-Wrapper = Ninox-Trick, damit der Append je Iteration läuft.

**Wunsch Rainer:** direkter **Excel-Export** (.xlsx) statt CSV-über-Tempfile-Link. Reporting insgesamt
„nur rudimentär" → **Neuentwurf**.

**Design fürs Zielschema:**
- `Report Monat` **nicht** als Tabelle mit 45 Formeln migrieren → **Reporting-Modul**: Monats-KPIs
  aus `rechnung`/`auftrag` live aggregiert (SQL-Views/Materialized Views), Charts (Umsatz, Stück),
  Kostendeckung gegen `kostenziel_monat`.
- Export als echte **.xlsx** (z. B. `exceljs`) — Blatt „Rechnungsausgang" (obige Spalten) + optional
  Blatt „Monats-KPIs". Direkter Datei-Download statt Link-Feld.

_(weitere Schritte folgen)_

## 7aa. Navigation / Informationsarchitektur

Ninox-Ist: ein „Dashboard" mit **9 Hauptbereichen** (Tab-Leiste), alles andere war „versteckter"
(erreichbar, aber nicht in der Hauptnavigation).

**Hauptnavigation** (entspricht `AnsichtenFrontend/10–16`):
| Tab | Tabellen | Screenshots |
|---|---|---|
| ToDo | TE ToDo / TC Tickets-ToDos | `10 Todo` |
| Adressen | MC + SE Ansprechpartner | `11 Adressen` |
| Angebote | YC + ZC Positionen | `12 Angebote` |
| Aufträge | A + AC Positionen + D Arbeitsschritte | `13 Aufträge`, `13a Arbeitsschritte` |
| Rechnungen | BC + CC Positionen | `14 Rechnungen` |
| Seriennummern # | gefilterte Auftrags-Ansicht nach Seriennr | — |
| Artikel | WB (ohne Model) | `15 Artikel` |
| Modelle | WB `Artikelgruppe = Model` | `15.1 Modelle` |
| Holzbestand | FF / VF / HF / KF / TF | `16 Holzbestand` |

**Sekundär / „versteckt"** (eigene Seiten, nicht in der Hauptnav): Bauplanung (7k),
Report Monat (7z), Mailversand, Inventur / Lagerorte / Inventar, FAQ, Textvorlagen,
Einstellungen / Stammdaten, Farben, Druck Templates, Dashboard-Interna.

**Design fürs Zielschema:** Hauptnavigation = diese 9 Einträge. Sekundärbereiche unter einem
„Mehr"/Verwaltung-Menü. `AnsichtenFrontend/<nn>` = maßgebliche Screenshot-Referenz je Bereich.

_(weitere Schritte folgen)_

## 7bb. UI je Bereich — aus den Screenshots (`AnsichtenFrontend/`)

**Belegnummern-Formate:** Angebot `AN-JJJJ-####` · Auftrag `A-JJJJ-####` (in AB-Betreff als `AB-…`) ·
Rechnung `RG-JJJJ-####`. Template-Namen (Dropdown-Werte) = die Dateien in `Druckausgaben/`,
z. B. `31 DE_EUR_RG_19`, `60 EN_EUR_AB_0`.

### ToDo (`10`)
Pro-Mitarbeiter-Aufgaben-Board: „Terminankündigung" + „Wichtige Mitteilung" (Banner),
„Für Mitarbeiter (Auswahl)" (wessen Board), Toggle „von mir für Andere erstellte Aufgaben",
„Neue Aufgabe", Tabelle (Empfänger/Absender/geändert am/Status/Prio/Aufgabe), „erledigte einblenden".

### Adressen (`11`) — Tabs: Adressen · Kontakte · Historie · Umsätze
- Liste: Suche + Filter-Chips je Kontaktart (Händler/Kunde/Artist/Lieferant/Holzhändler/Industrie).
  Spalten: Kontaktart, Kunde (Anzeigename), Kurzname, Ort, Staat, Region, Anzahl RG, Ums 12 Monate, Währung, Vertriebsweg.
- Detail „Adressen": Buttons *Neues Angebot · Neuer Auftrag · Adresse löschen ·* **„Preis/Steuer/Sprache autom."**
  (manueller Re-Trigger der Ableitung 7b). Sektionen: Stammdaten · **Preise|Steuer|Zahlung**
  (Vertriebsweg, Steuerpflichtig-Toggle, Währung, Sprache, Region_, Zahlungsbedingungen, USt-Id, Zahlungsarten) ·
  Kontaktdaten (E-Mail „Standard für E-Mails", Briefanrede) · **2. Person / Rechnungs-E-Mail (cc)** ·
  **Briefkopf** (berechnet) + **Manueller Briefkopf** · **Ansprechpartner**-Subtable (Position/Name/E-Mail/Tel) ·
  **Weitere Lieferadressen**-Subtable · Toggle „Seriennummer auf Rechnung".
- „Kontakte" = Mailversand-Historie des Kunden (erstellt am, To, Art, Bezug, Betreff, Inhalt).
- „Historie" = Angebote/Aufträge/Rechnungen des Kunden (je Subtable) + Buttons „Offene Aufträge drucken/exportieren"
  (Export → Link-Feld, wie Report — Wunsch: echtes Excel).
- „Umsätze" = KPIs: Ums 12 Monate, Anzahl RG 12M, Ø Zahldauer (Tage); Ums je Jahr; Ums seit 2022.

### Angebote (`12`) — Tabs: Angebot · Details · Positionen/Belege · Korrespondenz · LinkedTable · admin
- Liste: Status-Chips (neu/versendet-offen/Auftrag/verloren/verworfen). Spalten: Nr, Datum, erfasst von,
  Anzeigename, Artikelname lang, Interne Bemerkung, Colour (Swatch), Währung, Summe Netto.
- „Angebot": KUNDE (+Sprung-Icon), „Für Messe oder Artist", „Interne Bemerkung (wird nicht gedruckt)"
  (= Freitext-Herkunft aus 7m), Nr/Status/Datum, „Model - <name>" + Preis, „Adresse ein/aus",
  „Persönliches Anschreiben / Angebotstext" (Button „Anrede einfügen", Feld „Angebots Text" = Kopftext).
- „Details" = **Specs-Editor** (7x): „MODELLVORLAGE WÄHLEN" + „Vorlage übernehmen" + Schreibschutz;
  Abschnitte Model/Finish-Colour/Neck/Assembly, je Feld Dropdown + `_K`-Checkbox, Abschnitts-Freitexte.
- „Positionen/Belege": Positions-Tabelle (Pos/Artikel/Beschr./Anzahl/Einzelpreis/Rabatt/Gesamt), Buttons
  „Alle Positionen Löschen", Toggle „nur Relevante", „Auftrag erstellen" (7e), „Neue Position zufügen",
  „Porto hinzufügen" + „Porto auswählen". Summen. **„Angebot erzeugen"** (Druck) **+ „Angebot erzeugen + E-Mail"**
  (2 Buttons), „Drucktemplate auswählen", Mailversand-Liste.
- „Korrespondenz" = Mailversand-Liste + „Neuen Kontakt erstellen".

### Aufträge (`13`) — Tabs: Auftrag · Details · Positionen/Belege · Rechnung · NKS · Vorgänge · Arbeitsschritte
- Liste: Buttons „Neu Gitarren-Auftrag" / „Neu None-Guitar-Auftrag" (Service via Serviceaufträge).
  Status-Chips + „Filter Modell" + „Bauplan"/„ohne" (7c). Spalten: Nr, Datum, Bauplan (Chip), Kunde, Ser#,
  Model, Bemerkung, Colour, Status, **Work %** (= Stand HE, 7h), Modellgruppe (Chip), Umsatzerwartung, Rechnungsstatus.
  **Auftragsnummer-Zellfarbe** kodiert Art: weiß=Produktion · blau=NonGuitar · orange=Service · **rot=Promotion**
  (⇒ 4. Art/Flag „Promotion", nicht in `PX`-Enum {1/2/3} — klären).
- „Auftrag": KUNDE, Nr/Datum, Bemerkung, **„Besonderes"** (Dropdown), „Diesen Auftrag duplizieren".
  *Auftragsstatus*-Block (Status, Produktionsort {Rodgau/Hamburg}, Stand HE-Balken, Rechnungsstatus).
  *Planung* (Bauplan, Prio, „Plan anzeigen", **Monatsauswahl**-Leiste 7i, „Bauplan des gewählten Monats" =
  Aggregat je Modellgruppe/Monat 7k). *Seriennummer* (Ser#, lfd, „Ser-Nr ändern/löschen", „Zertifikat erstellen"
  + „Drucktemplate Zertifikat"). *Bilder* (Bild/Farbmuster + Subtable). *Zeitstempel* (Auftragsdatum, erfasst am,
  Bauplandatum, Werkstattbeginn, Endmontagedatum/-monat, Versanddatum, SerNr vergeben, Rechnungsdatum,
  Zahlungsdatum, Tage-Diffs; **Auftragsart** (editierbar), **Spezialauftrag** (Dropdown), Umsatzerwartung,
  **Stand HE Wert**, „Auf CITES checken", Cites-Artikelanzahl, Modellvorlage vergeben; Audit-Felder).
- „Details" = Specs-Editor (7x); Holz-Slots mit Sprout-Icon; gelbe „Colour Freitext Anzeige" + „CFTcheck/edit";
  Fußnote listet die 12 Lacey/CITES-Holzslots (7d).
- „Positionen/Belege": Positions-Tabelle mit **Rabatt je Zeile (%)**, Toggle **„Gesamtrabatt gewähren"**,
  „Porto auswählen" (z. B. „Shipping Guitar Taiwan 250 €"). Buttons „Auftragsbest. erzeugen" / „…+ E-Mail" /
  **„Angebot aus Specs erstellen"** (7m). „PDF Lieferschein / Postversand": „Lieferschein erzeugen" (7o).
- „Rechnung": Toggles **„Anzahlung"** + **„Endrechnung wurde vorab erstellt"**, „Rechnung erzeugen" (7p),
  „letzte Rechnungsnummer", „Status des Arbeitsschritts Rechnung", RG-Tabelle, „Bemerkung zu Rechnung".
- „NKS": *CITES* (Dokument, Fotos vorne/hinten, „CITES-Dokument Druck", CITES-Dokumentennummer,
  „Wiederausfuhr (none-EU)", **Gesamtgewicht Braz. Rosewood**) · *Lacey Act* (Dokument, „Lacey Act Druck",
  **Gesamtgewicht Holz**) · **Holzpositionen**-Tabelle (Artikelgruppe, Artikelname lang, BrazRW-Flag, Holz,
  Botanischer Name, Volumen m³, Gewicht kg, VK_EUR_net) + „Holzarten einfügen (nur diesen Auftrag)".
- „Vorgänge" = Mailversand-Liste. „Arbeitsschritte" = Schrittliste (13a-Ansicht eingebettet).

### Arbeitsschritt-Detail (`13a`) — Tabs: Arbeitsschritt · Alle Arbeitsschritte · admin
Part-Name + Prio · **Mitarbeiter-Selbst-Markier-Leiste** (7r, ~15 Namen) · Status-Leiste
(offen/erledigt/Warten auf…/Kiste vollständig) · **„Alle vorherigen Schritte ebenfalls auf erledigt"** (7t) ·
„Bemerkung des Bearbeiters" · gelbe Boxen „Colour Freitext" + „Infos zum Arbeitsschritt" (Werkbank-Referenz, 7u) ·
Dauer/Date+Time/MA · Auftrags-Ref + ThisNext.

### Rechnungen (`14`) — Tabs: Rechnungen · Kontakthistorie
- Liste: Status-Chips (offen/bezahlt/Storno/Gutschriften). Spalten: RG-Dat, RG-Nr, RG-Count, Kunde, Status,
  Zahlungsdatum, Artikelname, Ser#, EUR, USD, Erlös in EUR, Währung, Differenz Zahlung, **Umsatzsparte**
  (Guitar/Non-Guitar), Produktionsort, Zahlungsstatus, versendet (offen/erledigt).
- Detail: **Buttons „Stornorechnung" · „Gutschrift" · „Teil-Gutschrift"**. Belegart, „Referenz zu RE".
  *Positionen* (+ „Alle Arbeitsschritte auf erledigt", Toggles Gesamtrabatt/Anzahlung). *Zahlung*
  (Zahlungsdatum, **Zahlung an Bank** {VVB/Chase/Paypal}, Tatsächlicher Zahlbetrag, Zahlungsstatus,
  Zahlungsdauer, Differenz Zahlung, Abzug in %). *Rechnungserstellung und Versand*: „Rechnung erstellen und
  E-Mail senden", **Hinweistext**: RG mit selber Nr mehrfach druckbar, alte Versionen archiviert; Änderungen
  nur vor erneutem Druck; **wenn beim Steuerbüro gebucht → KEINE Änderung, stattdessen Gutschrift + neue RG**.
  *Erfolgte Versendungen* (Mailversand + Vorschau-Thumbnails). *Werte für Reports* (EUR, USD, USD in EUR, Erlös).

### Seriennummern # (`15`, Tab)
Registry: Seriennummer lfd, Seriennummer, „SerNr wurde manuell" (Checkbox), Artikelname lang, Foto aus RE,
Kunde, SerNr vergeben, Auftragsnummer. „Erklärung/Hinweis" (7w-Text).
**Beobachtung:** `Seriennummer lfd` ist **nicht global eindeutig** — manuelle Einträge können dieselbe lfd
mit anderem Jahrpräfix führen (z. B. „5 5555" und „26 5555"). Der Auto-Gap-Fill dedupt trotzdem über lfd.

### Artikel (`15`) — Tabs: Artikel · Lieferant · (Modell-Zuordnung / Aufträge zum Artikel) · LinkedTables · admin
- Liste: „Neuer Artikel", Toggle „Inaktive einblenden". Spalten: Artikelgruppe, Artikelname kurz,
  Artikelname Belege, **Artikeltyp** (Icons **„Lagerartikel" / „Fertigung"** …), Artikel Nr (`A#####`),
  Beschreibung, VK_EUR, VK_US, Datensatz inaktiv, Geschütztes Holz (Cites).
- „Artikel": Toggles „schreibgeschützt"/„inaktiv", „Artikel duplizieren". Namen (kurz/lang/Belege/Zertifikat),
  Beschreibung. **Preis-Matrix:**
  - *Eingabe Endkundenpreis:* `VK_EUR` (Brutto EUR, Eingabe), `VK_EUR_net`, `VK_US` (Eingabe), `US/EUR Faktor` (1,20)
  - *Endkundenpreis:* `VK_EUR_`, `VK_US_`; Toggles **„Brutto für Netto"**, **„nicht rabattierfähig"**
  - *Händler EU 35 %:* `NET1` = VK_EUR × 0,65 · `NET_US` = VK_US × 0,70
  - *Händler nicht-EU 40 %:* `NET2` = VK_EUR × 0,60 (Anzeige „30 %"), „Preis-Einstellungen öffnen"
  - *US-Preisermittlung:* US Import 15 % → In USD (USD-Kurs) → Versand + BUTZ (160) → „Dealer Pricing (müsste)"
    → „Dealer Pricing BUTZ" (Marge/Diff)
  - *Spezielles & NKS:* Geschütztes Holz (Cites), NKS Holzart (ref), NKS Gewichte (ref), Gewicht kg, „NKS Gewichte holen"
  - **Modelselect** (`Z7`): Checkbox-Raster aller ~60 Modelle „wird bei folgenden Modellen angeboten" + alle aus/ab (6.3)
- „Lieferant": LIEFERANT (ref), Lieferant Artikel-Nr, Hersteller, Einheit/Gebinde; **EK netto EUR/USD**
  („USD umrechnen"); Bemerkung; **Lagerhaltung** (Bestand min/max, Lieferant Ninox ID).
- „Aufträge zum Artikel": Cross-Ref-Liste (Auftrag/Model/Datum/Kunde).

### Modelle (`15.1`) — Tabs: Artikel · Specs · Specs-Artikelliste · LinkedTables · admin (+ Bestellübers.)
- Liste = `Artikel[Artikelgruppe=Model]`: Modellgruppe (Chip), Artikelname Belege, VK_EUR, Bild, VK_US,
  geändert am, Datensatz inaktiv; „Inaktive aus-/einblenden". Modell-Basispreise ~4.195 € / ~4.995 $ (Krautster).
- „Artikel" = Basis-Artikelform (identische Preis-Matrix wie oben); Beschreibung = Spec-Zusammenfassungstext.
- „Specs" = Specs-Editor (7x). „Specs-Artikelliste" = Kalkulationsansicht (7y) + **Kalkulation**-Sektion (7y, ⚠️ rudimentär).

### Holzbestand (`16`) — Tabs: Holz · Admin   (physische Holz-Inventarisierung)
- Liste: „Suche Inventar-ID", **„Inventarnummer scannen und finden"**, „Holzartikel anlegen".
  Filter: Holzart · Unterart · Struktur · Besonderes. Spalten: reserviert, Name, Bild, PicSize, **Inventar-ID**
  (scanbarer Code, z. B. `JFYNY`), Holzart, Unterart, Struktur, Qualität (Standard/**Exceptional**), Dicke
  (Dünn/Dick), Größe (Standard/Rietbergen), Piece (1pc/2pc), für (Top/Body/Neck/Fretboard), CNC, Bemerkungen.
- Detail „Holz": **„Reservierung für Auftrag"** (ref → Auftrag), Foto; Attribute (Holzart/Unterart/Struktur/
  Qualität/Dicke/Größe/Piece/für/CNC {Standard/59dick/Hollow Body/Honeycomb}/Gewicht g/Besonderes/Eingang am).
  **Lagerort** (ref → Lagerorte), **Status** (z. B. „Reserviert"), Statusänderung am, **„Etikett drucken"**.
  **QR Code** (Bild) + Inventar-ID. **Preise**: Holzhändler (ref), Einkaufspreis, Profit margin, Verkaufspreis.
- Tabellen-Zuordnung noch zu prüfen (evtl. `OF Inventar` (303) statt `FF Holzbestand` (7)).

**Design fürs Zielschema:** 9 Hauptbereiche als Top-Nav (7aa). Belege haben je eine Tab-Struktur
Kopf / Specs / Positionen+Belege / (Rechnung|Korrespondenz) / Compliance. Wiederkehrende Bausteine:
Specs-Editor-Komponente, Positions-Tabelle + Generator, Beleg-Renderer, Mailversand-Panel, Sprung-Links
zwischen Kunde/Auftrag/Angebot/Rechnung, „Duplizieren"-Aktionen.

_(weitere Schritte folgen)_

## 7cc. Storno / Gutschrift / Teil-Gutschrift (Buttons im Rechnungs-Detail)

### Stornorechnung
Hinweistext im UI: „Die komplette Rechnung wird **1:1 als Stornorechnung** erstellt. Kommt zum Einsatz
wenn **noch kein Geld geflossen** ist und/oder die ursprüngliche Rechnung **falsch ausgestellt** wurde
und neu erstellt werden muss."
→ Vollständige Stornierung: neue `rechnung` mit `belegart = STORNORECHNUNG`, alle Positionen übernommen
(negativ), `referenz_rechnung_id` → Original; Original → `status = RG_STORNIERT`.
**„Stornorechnung ist sauberer"** (Rainer) — danach neue, korrekte Rechnung erstellen.
(Gutschrift/Teil-Gutschrift = der andere Weg, wenn schon Geld geflossen ist.)

### Gutschrift  (Belegart 5, Rechnungsstatus 4)
Dialog „Bist Du sicher?" → `create Rechnungen`:
- `KUNDE`, `Rechnungsdatum` (= Original), `Währung` (= Original)
- `Belegart := 5` (Gutschrift), `Rechnungsstatus := 4`
- `RechnungsnummerText := "GS" + Original.RechnungsnummerText`  → **kein neuer Zählerwert**, Nummer aus Original abgeleitet
- `Bemerkung := "Gutschrift zu Rechnung " + Original.Rechnungsnummer`
- `'Referenz zu RE' := Original.Rechnungsnummer`
- **alle** `Rechnungspositionen` kopieren (nicht nach `RE_relevant` gefiltert): Pos Nr, Artikel(-Ref/-Text/-Beschreibung),
  Anzahl, Rabatt übernommen; **`Einzelpreis` und `Gesamtpreis` negiert** (`/ -1`); `RE_relevant := true`.
- Original-Rechnung wird **nicht** verändert (bleibt z. B. „bezahlt") — die Gutschrift steht daneben und gleicht aus.

### Teil-Gutschrift  (ebenfalls Belegart 5)
Wie Gutschrift, aber:
- `RechnungsnummerText := "TGS" + Original.RechnungsnummerText`
- **keine** Positionsübernahme — stattdessen **eine Platzhalterzeile**: Artikel = der Katalog-Artikel mit
  `Artikelname kurz = "Gutschrift"`, `Anzahl := 1`, `Einzelpreis := -0.01`. Der Rest wird **manuell** erfasst.

### Design fürs Zielschema
- Storno **und** Gutschrift = neue `rechnung` mit `referenz_rechnung_id` → Original, Positionen negiert.
  `belegart`: `STORNORECHNUNG` vs. `GUTSCHRIFT`; Teil-Gutschrift = `GUTSCHRIFT` + Flag `teilgutschrift` (Ninox
  unterscheidet nur am Nummernpräfix TGS).
- **Nummer** der Gutschrift/Storno = Präfix (`S`/`GS`/`TGS`) + Original-`nummer` — verbraucht keinen Zähler.
- Voll-Gutschrift: Positionen automatisch negiert kopieren. Teil-Gutschrift: leere Gutschrift, User füllt aus
  (kein `-0.01`-Platzhalter — null/Validierung).
- E-Rechnung (7dd): Gutschrift = BT-3 Code **381**, Storno = **384**; Bezug auf Original via BT-25 = `referenz_rechnung_id`.
- Original-Status: Storno → Original `RG_STORNIERT`; Gutschrift → Original unverändert.
- „Katalog-Artikel Gutschrift" (Artikelgruppe RECHNUNG) im Zielsystem beibehalten für manuelle Gutschrift-Zeilen.

## 7dd. E-Rechnung (Pflicht ab 2027; interner Zieltermin **November 2026**) — Anforderungen

Recherche-Ergebnis (regulatorische Basis; finale Formatwahl mit Steuerbüro/DATEV bestätigen):

**Zeitplan (dt. B2B-Inlandsumsätze, Wachstumschancengesetz):**
- seit 1.1.2025: **Empfang** von E-Rechnungen verpflichtend für alle.
- ab 1.1.2027: **Ausstellung** verpflichtend für Unternehmen mit Vorjahresumsatz **> 800.000 €**.
- ab 1.1.2028: Ausstellung verpflichtend für alle.
→ Nik Huber liegt lt. Report-Monat (~816 k € kumuliert bis 09/2026) über der Schwelle ⇒ **ab 1.1.2027 pflichtig**;
Zieltermin 11/2026 ist sinnvoll.

**Was zählt als E-Rechnung:** strukturierter Datensatz nach **EN 16931**. Zwei praxistaugliche Formate:
- **XRechnung** — reines XML (Behördenstandard).
- **ZUGFeRD 2.x, Profil ≥ EN 16931** — Hybrid: PDF/A-3 mit **eingebettetem XML**. Für einen Hersteller,
  der Rechnungen per Mail an Kunden schickt, die **empfohlene Wahl** (menschenlesbares PDF bleibt erhalten).
- Ein reines PDF ist **keine** E-Rechnung mehr (keine strukturierten Daten).

**Nur Inlands-B2B ist gesetzlich in Scope** (beide Parteien in DE). Auslands-/EU-Kunden (NL, US, Asien …)
fallen nicht unter die dt. Pflicht — Vereinfachung: **ZUGFeRD für alle** ausgeben, nicht-dt. Empfänger
ignorieren das XML. B2C ausgenommen; Kleinbetrag ≤ 250 € optional — aber „alle Rechnungen" (Rainer) ⇒ einheitlich.

**Pflicht-Inhalte (§14 UStG + EN 16931), müssen im XML *extrahierbar* sein (nicht nur im PDF-Layout):**
| Feld | Quelle im Zielmodell |
|---|---|
| Vollständiger Name + Anschrift Aussteller | `firma_setting` |
| Vollständiger Name + Anschrift Empfänger | `rechnung.kd_*`-Snapshot |
| Steuernummer **oder** USt-IdNr. des Ausstellers | `firma_setting.steuer_nr` |
| USt-IdNr. Empfänger (bei innergem./Reverse-Charge) | `rechnung.kd_ust_id` |
| Rechnungsnummer (einmalig) | `rechnung.nummer` |
| Ausstellungsdatum | `rechnung.rechnungsdatum` |
| Liefer-/Leistungsdatum bzw. -zeitraum | `auftrag.versanddatum` / `rechnung.lieferdatum` |
| Menge + Art je Position | `beleg_position.anzahl` / `artikel_name` |
| Nettobetrag je Steuersatz | `rechnung`-Summen, gruppiert |
| Steuersatz + Steuerbetrag | `rechnung.summe_mwst` + `firma_setting.mwst_satz` |
| **Grund der Steuerbefreiung** (bei 0 %) | = die `ZusatzEU`-Logik (7v) — muss als strukturiertes Feld rein, nicht nur als Fußnote! |
| Gesamt-Bruttobetrag | `rechnung.summe_brutto` |
| Zahlungsbedingungen / Fälligkeit / Bankverbindung | `zahlungsbedingung` + `firma_setting.bank` |
| Buyer reference (BT-10) | nur bei Behörden (Leitweg-ID) — für B2B-Privatkunden **nicht** nötig |
| Rechnungsart-Code (BT-3): 380 Rechnung, 381 Gutschrift, 384 Korrektur/Storno | aus `rechnung.belegart` |
| Bezug auf Vorgänger-Rechnung (BT-25) bei Storno/Gutschrift | `rechnung.referenz_rechnung_id` |

**Design-Folgen fürs Zielsystem:**
- Die Rechnungs-**Datenbasis muss vollständig & korrekt strukturiert** vorliegen — die E-Rechnung wird
  aus DB-Feldern erzeugt, nicht aus dem PDF-Layout. Steuerbefreiungsgrund als eigenes Feld (E7/7v wird Pflicht).
- **Generator:** ZUGFeRD-XML (CII) erzeugen + in PDF/A-3 einbetten. Node-Optionen: `node-zugferd`,
  `mustangproject` (Java-CLI via Sidecar), oder XML selbst bauen + `pdf-lib`/Ghostscript für PDF/A-3.
- **Archivierung** (GoBD): E-Rechnung im **Originalformat unveränderbar** 8 Jahre aufbewahren →
  `rechnung.gebucht_beim_steuerbuero`-Sperre + versionssichere Ablage des erzeugten ZUGFeRD-PDF.
- **Empfang** (Kunde schickt uns E-Rechnung) ist separat — für die Ausgangsrechnungen erstmal nicht nötig,
  aber Eingangsrechnungs-Verarbeitung ggf. später (heute Tabelle `Eingangsrechnungen_alt`).
- Neue offene Punkte: **Format XRechnung vs. ZUGFeRD** mit Steuerbüro klären; ob Schlüsselkunden (Händler)
  ein bestimmtes Format verlangen; Bibliothekswahl.

## 8. Offene Punkte / als Nächstes zu klären

- [ ] **Adress-Snapshot vs. Live-Referenz vereinheitlichen:** Angebot kopiert Kundenadresse fest,
      Auftrag hält nur `KUNDE`-Ref (kein Snapshot). Rechnung (BC) prüfen. Ziel: konsistente Regel
      (für Belege i. d. R. Snapshot zum Ausstellungszeitpunkt).
- [ ] Workflow Auftrag → Auftragsbestätigung → Rechnung (Statusübergänge, was wird kopiert)
- [ ] `WB.R` "Artikeltyp" — mind. „Lagerartikel" / „Fertigung" gesehen; vollständige Werteliste + Wirkung
- [ ] 4. Auftragsart **„Promotion"** (rote Auftragsnummer-Zellfarbe) — eigenes Feld/Flag? (`PX` hat nur 1/2/3)
- [ ] Holzbestand: Tabellen-ID klären (`OF Inventar` 303 vs `FF Holzbestand` 7); Reservierung↔Auftrag, Lagerorte, Etikett/QR
- [ ] Storno / Gutschrift / Teil-Gutschrift: Ablauf-Scripts (Buttons in RG-Detail)
- [ ] Rechnungs-Immutabilität: „mehrfach drucken, Versionshistorie"; nach Steuerbüro-Buchung nur Gutschrift+neue RG
- [ ] Zahlungserfassung (Zahlungsdatum/-betrag/-status, Skonto/Abzug %, Differenz, Bank VVB/Chase/Paypal)
- [ ] `Gesamtpreis` (Position) + `Berechnung`/`Formel` Formeln (ZC/AC/CC); Rabatt-Logik (`Rabatt`/`RabattText`)
- [ ] Löscht der Positions-Generator vorhandene Positionen vorher? Manuelle Positionen danach?
- [ ] Welche der Alt-/Hilfstabellen entfallen (siehe Liste Abschnitt 4)
- [ ] Nummernkreise (Rechnungs-Nr; Seriennummer `A.B2` / `A.V9` „Seriennummer lfd")
- [ ] Rechte/Rollen, Benutzer (Ninox `rolesOpen`/`rolesHistory` etc.)
- [ ] Dateianhänge (5.528 Stück) — Übernahme-Strategie
- [ ] Holzbestand (FF/VF/HF/KF/TF) + Lagerbewegungen — eigenes Thema
- [ ] `Colour Set` ohne `_K` — nie Aufpreis? `(mehrfach)`-Felder: Wirkung im Beleg
- [ ] Belege-Renderer: Carbone/docx behalten oder HTML→PDF / React-PDF (1 Template je Belegart)
- [ ] USD→EUR-Umrechnung: fixer Faktor `0.92` (Umsatzerwartung) bzw. `WB.A6` „US/EUR Faktor" —
      zentral als Setting/Live-Kurs im Ziel
- [ ] Bauplanung-Monats-Board: Design (vom User auf „später" gestellt)
- [ ] **Steuerbefreiungs-Fußnote (`ZusatzEU`) an das Steuerergebnis koppeln**, nicht nur an Region
      (7v-Bug): MwSt berechnet ⇒ keine Note; steuerfrei + EU ⇒ innergemeinschaftlich; steuerfrei + non-EU ⇒ Ausfuhr.
      Kernstück der gewünschten 19 %/0 %-Automatik.
- [ ] Mail-Templates (heute `Textvorlagen` #6/#7 + hartkodierte Prefixe) → Tabelle Belegart × Sprache mit Variablen
- [ ] Zwei „Porto"-Buttons + zwei „Rechnung erstellen"-Skripte + Storno/Gutschrift-Ablauf konsolidieren
- [ ] **Kalkulation** (Modell): heute rudimentär (nur EK-Summe) → Neuentwurf mit Arbeitszeit/Kleinteile/
      Deckungsbeitrag (vom User als verbesserungswürdig markiert, Design später)
- [ ] Preis-Tier-Formeln vollständig extrahieren (`.fn`-Felder `G/J3/K3/M3/P3/RD/SD/TD`, Singleton `NF`)
