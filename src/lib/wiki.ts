/**
 * Inhalte des Wikis (Einstellungen → Wiki). Neue Features hier dokumentieren.
 * Blöcke: Absatz (`p`), Liste (`ul`), Hinweis (`hinweis`). `**fett**` wird hervorgehoben.
 */

export type WikiBlock = { p: string } | { ul: string[] } | { hinweis: string };

export interface WikiArtikel {
  id: string;
  titel: string;
  bereich: string;
  bloecke: WikiBlock[];
}

export const WIKI: WikiArtikel[] = [
  /* ------------------------------------------------------------ Allgemein */
  {
    id: "speichern",
    bereich: "Allgemein",
    titel: "Speichern von Änderungen",
    bloecke: [
      { p: "Es gibt grundsätzlich **kein automatisches Speichern** (Ausnahme: Freitext-Felder in den Specs). Jeder Block (z. B. Kopf, Kunde, Specs, eine Positionszeile) hat seinen eigenen Button („Speichern“, „OK“ …). Erst der Klick übernimmt die Änderungen dieses Blocks." },
      { p: "Nach dem Speichern erscheint eine grüne Meldung, bei Fehlern eine rote mit Hinweis, was fehlt." },
      { hinweis: "Wer mehrere Blöcke ändert, muss jeden einzeln speichern. Beim Verlassen der Seite gehen ungespeicherte Eingaben verloren." },
    ],
  },
  {
    id: "betraege",
    bereich: "Allgemein",
    titel: "Beträge eingeben und anzeigen",
    bloecke: [
      { p: "Geldbeträge werden überall im deutschen Format angezeigt: **1.234,56 €** – auch in Eingabefeldern (ohne €-Zeichen)." },
      { ul: [
        "Eingeben kann man wahlweise **1.234,56**, **1234,56** oder **1234.56** – alles wird richtig verstanden.",
        "Achtung: **1.234** ohne Komma gilt als 1.234 (Punkt als Dezimalzeichen) – für Tausender daher mit Komma schreiben (1.234,00) oder ohne Punkt (1234).",
      ] },
    ],
  },
  {
    id: "zeitzone",
    bereich: "Allgemein",
    titel: "Datum und Uhrzeit",
    bloecke: [
      { p: "Alle Uhrzeiten und Tagesdaten in der App gelten in **deutscher Zeit** (inkl. Sommer-/Winterzeit) – auch wenn der Server woanders steht. „Heute“ (z. B. Auftragsdatum, Rechnungsdatum beim Buchen) und das Jahr in Belegnummern wechseln um Mitternacht deutscher Zeit." },
    ],
  },
  {
    id: "listen",
    bereich: "Allgemein",
    titel: "Listen, Sortierung und Anzahl",
    bloecke: [
      { p: "Neben jeder Überschrift steht in Klammern die Anzahl der Einträge, z. B. „Anhänge (3)“ oder „Positionen (12)“." },
      { p: "In Tabellen lässt sich mit Klick auf eine Spaltenüberschrift sortieren; ein zweiter Klick dreht die Richtung um. Ein Klick auf die Zeile öffnet den Datensatz." },
    ],
  },

  /* ------------------------------------------------------- Konto & Login */
  {
    id: "konto",
    bereich: "Konto & Anmeldung",
    titel: "Mein Konto: Abmelden und Passwort ändern",
    bloecke: [
      { p: "Jeder Benutzer hat ein eigenes Login (E-Mail + Passwort). Ein Klick auf die eigene **E-Mail-Adresse oben in der Navigation** öffnet „Mein Konto“." },
      { ul: [
        "**Abmelden:** Button „Abmelden“ in der Navigation oder auf „Mein Konto“.",
        "**Passwort ändern:** aktuelles Passwort eingeben, dann das neue zweimal (mindestens 8 Zeichen).",
      ] },
    ],
  },
  {
    id: "passwort-reset",
    bereich: "Konto & Anmeldung",
    titel: "Passwort vergessen / Passwort-Link",
    bloecke: [
      { p: "Ein Admin kann unter **Einstellungen → Benutzer** für jeden Benutzer einen **Passwort-Link** erzeugen und ihm weitergeben (z. B. per Mail oder Messenger)." },
      { ul: [
        "Der Link führt direkt auf die Seite „Passwort setzen“. Dort das neue Passwort zweimal eingeben, danach geht es zur Anmeldung.",
        "Der Link ist **nur einmal** verwendbar und etwa **1 Stunde** gültig. Danach einen neuen erzeugen.",
        "Erscheint „Link ungültig oder abgelaufen“, wurde der Link schon benutzt oder ist zu alt.",
      ] },
    ],
  },
  {
    id: "benutzer",
    bereich: "Konto & Anmeldung",
    titel: "Benutzer verwalten (nur Admin)",
    bloecke: [
      { p: "Unter **Einstellungen → Benutzer** legt ein Admin neue Benutzer an (E-Mail, Name, Rolle). Danach erscheint ein Passwort-Link, mit dem der neue Benutzer sein Passwort selbst setzt." },
      { ul: [
        "**Rollen:** ADMIN (alles inkl. Benutzerverwaltung), BUERO (Büro: Belege, Stammdaten), WERKSTATT (Werkstatt-Funktionen).",
        "Zusatzrechte: „ToDo“ und „Werkstatt“ lassen sich einzeln freischalten.",
        "Benutzer können deaktiviert werden. Es muss immer **mindestens ein aktiver Admin** bleiben.",
      ] },
    ],
  },

  /* ------------------------------------------------------------ Aufträge */
  {
    id: "auftrag-prio",
    bereich: "Aufträge",
    titel: "Priorität (Sterne) und gelbe Hervorhebung",
    bloecke: [
      { p: "Im Auftrag unter **Kopf → Priorität** gibt es die Stufen – (keine), ★, ★★ und ★★★." },
      { ul: [
        "In der Auftragsliste zeigt die Spalte **Prio** die Sterne; sie ist sortierbar (höchste zuerst).",
        "Zeilen mit Priorität werden **gelb hinterlegt**: ★ hellgelb, ★★ mittel, ★★★ kräftig gelb.",
      ] },
    ],
  },
  {
    id: "auftrag-layout",
    bereich: "Aufträge",
    titel: "Aufbau des Auftrag-Tabs",
    bloecke: [
      { p: "Links: **Kunde**, darunter **Seriennummer**, darunter **Dokumente & Bilder**. Rechts: **Status**, darunter der **Kopf** (Auftragsart, Priorität, Produktionsort, Bauplan-Monat, Umsatzerwartung, Anzahlung …)." },
      { p: "**Bauplan-Monat:** Die Monats-Buttons setzen per Klick den Monatsersten; ein zweiter Klick entfernt ihn. Über das Datumsfeld ist jedes Datum möglich. Danach „Kopf speichern“." },
    ],
  },
  {
    id: "arbeitsschritte",
    bereich: "Aufträge",
    titel: "Arbeitsschritte: erledigt von wem, Warten auf …",
    bloecke: [
      { p: "Die Arbeitsschritte stehen im Auftrag auf zwei Reitern: **Arbeitsschritte** = Werkstatt-Schritte, **Arbeitsschritte Office** = Büro-/Compliance-Schritte (z. B. Setup/Zertifikat, Rechnung, Ausfuhrantrag, Fotos, Verpackt, Versendet). Erledigte Schritte sind ausgeblendet; das Häkchen **„erledigte einblenden“** zeigt sie wieder." },
      { p: "Jeder Arbeitsschritt hat einen Status: offen, erledigt, „Warten auf …“ oder „Kiste vollständig“." },
      { ul: [
        "Bei **erledigt** und **Kiste vollständig** wird automatisch gespeichert, **wer** den Schritt erledigt hat und **wann** (Datum + Uhrzeit).",
        "Bei **Warten auf …** wählt man den Grund aus: Kunde, Material / Teile, Lieferant, Lackierung / extern, Freigabe / Rückmeldung, Rückfrage intern, Sonstiges.",
      ] },
    ],
  },

  {
    id: "rechnung-liste",
    bereich: "Rechnungen",
    titel: "Rechnungsliste: Spalten",
    bloecke: [
      { p: "Die Rechnungsliste zeigt wie in Ninox: **RG-Dat, RG-Nr, RG-Count** (laufende Nummer), Kunde, Status, **Zahlungsdatum, Artikelname kurz** (Modell), **Ser#**, Betrag in **EUR** bzw. **USD**, **Erlös in EUR** (USD × USD→EUR-Faktor aus Einstellungen → Firma), **Währung**, **Differenz Zahlung** (gezahlt − zu zahlen; rot = zu wenig, grün = zu viel), **Umsatzsparte** (Guitar / Non-Guitar / Service, aus der Auftragsart) und **Produktionsort**." },
      { ul: [
        "Über die **Spaltenauswahl** der Tabelle lassen sich Spalten ein- und ausblenden (die Auswahl wird im Browser gemerkt). „Art“ (Rechnung/Storno/…) ist standardmäßig ausgeblendet.",
        "Alle Spalten sind per Klick auf die Überschrift sortierbar.",
        "Beträge: gebuchter Rechnungsbetrag brutto; bei Altrechnungen aus Ninox (ohne gespeicherte Summe) aus den Positionen + MwSt berechnet.",
      ] },
    ],
  },
  {
    id: "erechnung",
    bereich: "Rechnungen",
    titel: "E-Rechnung (ZUGFeRD EN 16931)",
    bloecke: [
      { p: "Beim Buchen erzeugt das Programm die Rechnung als **ZUGFeRD-PDF im Profil EN 16931** (früher „Comfort“): ein normales PDF mit eingebetteten, maschinenlesbaren Rechnungsdaten. Das erfüllt die Anforderungen an eine E-Rechnung nach § 14 UStG – ein externer Dienstleister ist nicht nötig." },
      { ul: [
        "Pflicht ist die E-Rechnung nur gegenüber **Geschäftskunden im Inland**; Privat- und Auslandskunden erhalten dasselbe PDF.",
        "Enthalten u. a.: Verkäufer mit Anschrift und USt-IdNr./Steuernummer, Käufer, Lieferanschrift, **Lieferdatum**, Positionen, Gesamtrabatt, Versand, Steueraufschlüsselung (inkl. steuerfrei EU/Ausfuhr), Zahlungsbedingung, IBAN, abgezogene Anzahlungen.",
        "Geprüft mit dem offiziellen ZUGFeRD-Validator (Mustang/veraPDF): XML nach EN 16931 und PDF/A-3 gültig – für Inland mit MwSt, EU steuerfrei, Ausfuhr und Rechnungen mit abgezogener Anzahlung.",
        "**Voraussetzung:** Unter Einstellungen → Firma müssen Straße, PLZ, Ort und Steuernummer oder USt-IdNr. eingetragen sein – sonst lässt sich nicht buchen. IBAN/BIC sollten ebenfalls gepflegt sein.",
      ] },
    ],
  },
  {
    id: "auftrag-kunde",
    bereich: "Aufträge",
    titel: "Kundenblock und E-Mail an den Kunden (Angebot und Auftrag)",
    bloecke: [
      { p: "Im Reiter **Angebot** bzw. **Auftrag** zeigt die Karte **Kunde** links den vollständigen Briefkopf (wie auf den Belegen, die Firma fett) und rechts Telefon, Mobil, E-Mail sowie die Kennzeichen (Region, Währung, Vertriebsweg, Sprache, steuerpflichtig/-frei)." },
      { ul: [
        "**„✉ E-Mail schreiben …“** öffnet ein Mail-Fenster wie bei der Rechnung: Empfänger aus dem Kunden, Textbaustein wählen (Einstellungen → Textbausteine, Belegart „Angebot“ bzw. „Auftrag (allgemeine Mail)“, DE/EN), Text anpassen, optional Dateien des Belegs anhängen.",
        "Die Mail wird im **Mailversand** beim Kunden protokolliert.",
      ] },
    ],
  },
  {
    id: "lieferdatum",
    bereich: "Aufträge",
    titel: "Lieferdatum (Pflichtangabe auf der Rechnung)",
    bloecke: [
      { p: "Im Kopf des Auftrags gibt es das Feld **Lieferdatum**. Es erscheint auf dem **Lieferschein** und auf der **Rechnung** (§ 14 UStG: Zeitpunkt der Lieferung ist Pflichtangabe; in der E-Rechnung als Lieferdatum BT‑72)." },
      { ul: [
        "Beim Erstellen eines Rechnungsentwurfs wird das Lieferdatum aus dem Auftrag übernommen (fehlt es, das Versanddatum). Im Entwurf lässt es sich noch ändern.",
        "Ist im Entwurf **kein Lieferdatum** eingetragen, setzt das Programm beim Buchen das **Rechnungsdatum** als Lieferdatum (z. B. Abholung am Tag der Rechnung) – das Buchen wird dadurch nie blockiert. Anzahlungsrechnungen bekommen kein Lieferdatum (die Lieferung liegt noch nicht vor).",
        "Automatisch gesetzt wird das Lieferdatum auch, wenn der Arbeitsschritt **„Versendet“** erledigt bzw. der Auftrag **abgeschlossen** wird (falls noch leer) – das gilt ebenso für **persönliche Abholung**.",
        "Aus Ninox übernommen: das Feld „Lieferdatum“ der Aufträge.",
      ] },
    ],
  },
  {
    id: "lieferschein",
    bereich: "Aufträge",
    titel: "Lieferschein drucken",
    bloecke: [
      { p: "Oben rechts im Auftrag öffnet **„Lieferschein“** den Lieferschein in einem neuen Tab – zum Drucken oder als PDF herunterladen." },
      { ul: [
        "Inhalt wie die Auftragsbestätigung (Kunde, Auftragsnummer, alle Positionen mit Menge und Beschreibung), aber **ohne Preise, Rabatte und Summen** und ohne Zahlungsbedingung.",
        "Überschrift **„Lieferschein“** (bei englischsprachigen Kunden „Delivery Note“), Datum = heute, darunter das **Lieferdatum** des Auftrags.",
      ] },
    ],
  },
  {
    id: "auftrag-status-ab",
    bereich: "Aufträge",
    titel: "Auftragseingang: Status Eingang → Bestätigt, Auftragsbestätigung mit Unterschrift",
    bloecke: [
      { p: "Ein neuer Auftrag steht auf **Eingang** (früher „Backorder“). Angenommen ist er erst, wenn er **Bestätigt** ist – erst dann darf er in die Werkstatt. Reihenfolge: Eingang → **Bestätigt** → In Werkstatt / Bei Nicl → Produktion fertig → Abgeschlossen." },
      { p: "**Auftragsbestätigung (AB) mit elektronischer Unterschrift** – Karte „Auftragsbestätigung“ im Reiter Auftrag:" },
      { ul: [
        "„AB zur Unterschrift senden …“ öffnet ein Mail-Fenster (Text aus Einstellungen → Textbausteine → Auftragsbestätigung, DE/EN je Kundensprache, änderbar).",
        "Die Mail enthält die AB als PDF mit dem Feld **„Auftragsannahme“** und einen **persönlichen Link**. Der Kunde öffnet ihn ohne Anmeldung, sieht Positionen und Summen, gibt seinen Namen ein, unterschreibt mit Maus oder Finger (oder lädt ein Bild seiner Unterschrift als PNG/JPG hoch) und bestätigt verbindlich.",
        "Danach wird die **unterschriebene AB** (mit Unterschrift, Name, Zeitpunkt, IP) automatisch am Auftrag abgelegt, der Status springt von **Eingang auf Bestätigt**, und wer die AB gesendet hat, bekommt eine Mail mit dem PDF.",
        "Rechtlich eine einfache elektronische Signatur (wie beim Verleih).",
      ] },
      { p: "**Altbestand:** Aufträge, die noch auf „Eingang“ stehen, bitte einzeln prüfen (noch aktuell? wie beauftragt?) und über die Status-Knöpfe auf **Bestätigt** setzen. Arbeitsschritte der Werkstatt lassen sich bei „Eingang“ nicht abhaken; bei „Bestätigt“ setzt der erste erledigte Werkstatt-Schritt den Auftrag automatisch auf „In Werkstatt“." },
    ],
  },
  {
    id: "auftrag-verlauf",
    bereich: "Aufträge",
    titel: "Zeitstempel & Verlauf eines Auftrags",
    bloecke: [
      { p: "Im Reiter **Auftrag** zeigt die Karte **„Zeitstempel & Verlauf“** oben die Eckdaten (wie der Ninox-Block „Zeitstempel“) und darunter alle Ereignisse chronologisch:" },
      { ul: [
        "**Eckdaten:** erfasst am/von, erstellt und geändert am/von, Bauplan-Monat, Modellvorlage, Seriennummer vergeben, Werkstattbeginn, Endmontage, **Tage Werkstattbeginn → Endmontage** (bzw. Tage seit Werkstattbeginn), Versand-, Rechnungs- und Zahlungsdatum, Work %, Umsatzerwartung und Stand HE.",
        "**Verlauf:** jeder **Statuswechsel** mit Datum, Uhrzeit und Benutzer, Bauplandatum gesetzt, Auftragsbestätigung gesendet/unterschrieben, dazu Werkstattbeginn, Endmontage, Versand, gebuchte Rechnungen und Zahlungen.",
        "Statuswechsel werden erst ab jetzt protokolliert; für ältere Aufträge stehen nur die Datumsfelder aus Ninox zur Verfügung.",
        "**Werkstattbeginn** = Tag, an dem der erste Werkstatt-Arbeitsschritt erledigt wurde.",
        "**Work %** = Position des letzten erledigten Werkstatt-Schritts unter allen Schritten von Order 10 bis 63 (Montage) = 100 %. **Stand HE** = Umsatzerwartung × Work %.",
      ] },
    ],
  },
  {
    id: "he-stichtag",
    bereich: "Aufträge",
    titel: "Stand HE (halbfertige Erzeugnisse) und Monatsstichtag",
    bloecke: [
      { p: "**Stand HE** eines Auftrags = Umsatzerwartung (EUR-normiert) × Work %. Die Summe über alle Gitarren **„In Werkstatt“** und **„Bei Nicl“** ist der Wert der halbfertigen Erzeugnisse." },
      { ul: [
        "Unter **Verwaltung → Report Monat** steht ganz unten die Karte **„Stand HE“** mit dem heutigen Wert und allen Monats-Stichtagen.",
        "Am **letzten Tag jedes Monats** (abends) werden Work %, Umsatzerwartung und HE-Wert aller betroffenen Gitarren automatisch neu berechnet und **festgeschrieben** – je Gitarre und als Summe. „Details“ zeigt die einzelnen Gitarren des Stichtags.",
        "Festgeschriebene Stichtage sind **unveränderbar** – die Datenbank verhindert jedes Ändern oder Löschen. Der erste Stichtag entsteht am Ende des laufenden Monats.",
      ] },
    ],
  },
  {
    id: "verleih",
    bereich: "Aufträge",
    titel: "Verleih-/Testgitarren: Übersicht, Vereinbarung, Unterschrift, Erinnerung",
    bloecke: [
      { p: "Unter **Verwaltung → Verleih-/Testgitarren** sieht man alle Leihgitarren und wer welche wann hatte. Als Leihgitarre zählt jeder Auftrag, bei dem im Kopf unter **Besonderes** „Verleih-/Testgitarre“ gewählt ist." },
      { ul: [
        "Oben je Gitarre eine Kachel: **verfügbar** oder **verliehen an … bis …** (rot, wenn überfällig).",
        "Darunter die Vorgänge mit Versanddatum, „zur Verfügung bis“, Rückgabe, Status (vorbereitet / verliehen / **überfällig** / zurück), Stand der Vereinbarung und der letzten Erinnerung. Zurückgegebene sind ausgeblendet (Häkchen „zurückgegebene anzeigen“).",
      ] },
      { p: "**Neuer Verleih:** Zuerst den **Kontakt** suchen und wählen – der Empfänger muss in den Adressen angelegt sein (Link „Neuen Kontakt anlegen“). Dann Gitarre, Versanddatum, **zur Verfügung bis**, Zweck, **Zubehör** (Standard „Koffer, Gurt“ – mit Komma getrennt, erscheint in der Vereinbarung als Liste) und **Wert** (für die Haftung; vorbelegt mit der Umsatzerwartung) eintragen. Eine Gitarre kann nicht zweimal gleichzeitig verliehen sein." },
      { p: "**Übergabevereinbarung** (zugleich Lieferschein): PDF mit Verleiher, Leihnehmer, Gitarre (Modell, Seriennummer, Zubehör, Wert), Leihdauer und Bedingungen – auf Deutsch oder Englisch je nach Sprache des Kontakts. **Modell und Seriennummer sind Pflicht** – fehlt eine davon, lässt sich die Vereinbarung nicht erzeugen (in der Übersicht steht dann „Seriennummer fehlt“; die Seriennummer wird im Auftrag der Gitarre vergeben). Sie wird als Anhang „Verleih-Vereinbarung“ an der Gitarre (Auftrag) abgelegt." },
      { p: "**Elektronische Unterschrift:** „Zur Unterschrift senden …“ öffnet ein Mail-Fenster (Text aus den Textbausteinen, änderbar). Die Mail enthält die Vereinbarung als PDF und einen **persönlichen Link**. Der Empfänger öffnet ihn ohne Anmeldung, liest die Vereinbarung, gibt seinen Namen ein, unterschreibt mit Maus oder Finger (oder lädt ein Bild seiner Unterschrift als PNG/JPG hoch) und bestätigt. Danach:" },
      { ul: [
        "wird das **unterschriebene PDF** (mit Unterschrift, Name, Zeitpunkt und IP-Adresse) automatisch an der Gitarre abgelegt,",
        "steht im Verleih „Unterschrieben von … am …“,",
        "bekommt der Benutzer, der den Verleih angelegt hat, eine Mail mit dem PDF.",
        "Rechtlich ist das eine **einfache elektronische Signatur** – für eine Leihvereinbarung ausreichend (keine gesetzliche Schriftform nötig). Es fallen keine Kosten an, es wird kein externer Dienst benötigt.",
      ] },
      { p: "**Rückgabe und Erinnerung:** Mit „Gitarre ist zurück“ (Datum, Standard heute) wird der Vorgang abgeschlossen. Solange sie unterwegs ist, schickt „Erinnerung senden …“ eine Erinnerungsmail; Anzahl und Zeitpunkt der letzten Erinnerung werden angezeigt. Alle Mails stehen auch im Mailversand beim Kontakt." },
      { hinweis: "Die Mail-Texte (Vereinbarung und Erinnerung, DE/EN) werden unter Einstellungen → Textbausteine gepflegt; Platzhalter z. B. {{model}}, {{seriennummer}}, {{rueckgabe_bis}}, {{link}}. Die Bedingungen der Vereinbarung sind ein Vorschlag – bitte einmal prüfen (lassen)." },
    ],
  },
  {
    id: "besonderes",
    bereich: "Aufträge",
    titel: "Besonderes und Spezialauftrag",
    bloecke: [
      { p: "Im Kopf des Auftrags sind **Besonderes** und **Spezialauftrag** Auswahllisten (wie in Ninox):" },
      { ul: [
        "**Besonderes**: (leer), **★ Promotion Gitarre** (lachsrot) oder **↻ Verleih-/Testgitarre** (rot). Die Auswahl wird farbig angezeigt und erscheint zusätzlich als farbiges Kennzeichen oben im Auftrag neben Datum, Kunde und Modell.",
        "**Spezialauftrag**: (leer), Marketing, Sponsoring, Demoware oder Sonstiges.",
        "Speichern mit **„Kopf speichern“**.",
      ] },
    ],
  },
  {
    id: "umsatzerwartung",
    bereich: "Aufträge",
    titel: "Umsatzerwartung (wird berechnet)",
    bloecke: [
      { p: "Die **Umsatzerwartung** im Kopf des Auftrags ist ein Planungswert in **Euro (netto)** – Grundlage für Bauplanung und „Stand HE“ (Umsatzerwartung × Fortschritt). Sie wird **automatisch berechnet** und kann nicht von Hand geändert werden:" },
      { ul: [
        "**Positionen vorhanden** → die **Summe netto** des Auftrags (nach Gesamtrabatt, mit Versand), also der konkret erreichte Preis.",
        "**Noch keine Positionen, aber ein Modell gewählt** → der **Grundpreis (netto) des Modells** passend zum Vertriebsweg des Kunden (NET1, NET2, NET US, VK US, VK EUR). Aufpreise aus den Specs zählen erst, wenn die Positionen erzeugt sind.",
        "**US-Dollar** wird mit dem **USD → EUR Faktor** (Einstellungen → Firma) in Euro umgerechnet.",
        "Neu berechnet wird bei jeder Änderung der Positionen, beim Übernehmen einer Modellvorlage, beim Wechsel des Kunden und beim Speichern des Kopfes.",
      ] },
    ],
  },
  {
    id: "nks",
    bereich: "Aufträge",
    titel: "NKS: Lacey Act, CITES, Fish&Wildlife und Ausfuhrantrag",
    bloecke: [
      { p: "Der Reiter **NKS** im Auftrag bündelt alles rund um Holz-Compliance (der Name ist ein Phantasiename aus Ninox-Zeiten). Er zeigt die **Holzpositionen**, die Belege **Lacey Act** und **CITES** und den Stand der zugehörigen Arbeitsschritte." },
      { p: "**Holzpositionen** sind alle Artikel aus den Specs (Tab Details) mit Artikeltyp **„Holz / Fertigung“** – mit Holzart, botanischem Namen, Herkunft, Volumen und Gewicht. Geschütztes Holz (CITES) ist rot markiert; darunter stehen die Summen und die CITES-Nettomasse." },
      { ul: [
        "**Volumen** = Volumen des Bauteils („NKS Gewichte“, z. B. Fretboard 0,00058 m³, Headstock Overlay 0,00018 m³). Es wird am Artikel als **„NKS Volumen (Bauteil)“** gewählt.",
        "**Gewicht kg** = Volumen × **Holzdichte** der Holzart (Holzbestand → Holzarten). Nur wenn am Artikel ein Gewicht eingetragen ist, gilt dieses.",
        "Holzart, Volumen und **„Geschütztes Holz (CITES)“** werden im **Artikel** unter „NKS / Sonstiges“ gepflegt. Fehlt etwas, steht in der Tabelle „fehlt“.",
      ] },
      { p: "**Belege erzeugen** (Knopf „Erzeugen“ bzw. „Neu erzeugen“): Das PDF wird auf dem Original-Formular ausgefüllt, als Anhang am Auftrag gespeichert (Art „Lacey Act“ bzw. „CITES“, auch unter Dokumente & Bilder) und lässt sich per Klick öffnen." },
      { ul: [
        "**Lacey Act (PPQ Form 505)** – für Lieferungen in die **USA**. Enthält alle Holzpositionen (HTS-Code, Bauteil, botanischer Name, Herkunft, Volumen in m³), Kundenadresse als Importer und Consignee, Seriennummer, Bruttobetrag, voraussichtliche Ankunft (heute + 3 Tage) sowie Unterzeichner und Datum. **HTS-Code** und **Unterzeichner** stehen unter Einstellungen → Firma.",
        "**CITES-Antrag** (Regierungspräsidium Darmstadt) – nur möglich, wenn geschütztes Holz im Auftrag ist. Enthält die CITES-Bauteile („… für elektr. Gitarre“), die Nettomasse in kg (eine Nachkommastelle), Stempel, Unterschrift und Datum.",
        "Vor dem Erzeugen prüft das Programm, ob jede Holzposition Holzart und Volumen hat.",
      ] },
      { p: "**Arbeitsschritte** werden automatisch eingefügt bzw. entfernt – beim Wählen des Kunden, beim Ändern der Specs und beim Statuswechsel:" },
      { ul: [
        "**#93 Cites** – wenn ein Spec-Artikel mit Artikeltyp „Holz / Fertigung“ als geschütztes Holz (CITES) markiert ist.",
        "**#94 Fish&Wildlife** – wenn der Kunde in den **USA** ist.",
        "**#96 Ausfuhrantrag** – wenn der Kunde **außerhalb der EU** ist (nicht Deutschland, nicht EU).",
        "Entfallen die Voraussetzungen, wird der Schritt entfernt – aber nur, solange er noch **offen** ist. Bereits bearbeitete Schritte bleiben erhalten.",
      ] },
    ],
  },

  /* ------------------------------------------------- Angebot & Auftrag */
  {
    id: "modellvorlage",
    bereich: "Angebot & Auftrag",
    titel: "Modellvorlage übernehmen",
    bloecke: [
      { p: "Im Tab **Details** wählt man ein Modell und klickt **„Vorlage übernehmen“**. Dabei werden die Standard-Specs des Modells und seine Freitexte (Body, Colour, Neck, Assembly) in den Beleg kopiert." },
      { ul: [
        "Ist schon eine Vorlage gesetzt oder gibt es bereits Specs, fragt das Programm vorher nach, ob alles **überschrieben** werden soll.",
        "Das Feld **„Übernommene Vorlage“** zeigt, welches Modell (langer Name) zuletzt übernommen wurde.",
        "Die Specs werden danach sofort mit den Werten der Vorlage angezeigt.",
      ] },
    ],
  },
  {
    id: "specs-holz",
    bereich: "Angebot & Auftrag",
    titel: "Holz- und CITES-Kennzeichnung in den Specs",
    bloecke: [
      { p: "Im Tab **Details (Specs)** steht links neben jeder Auswahl ein Symbol, wenn der gewählte Artikel Holz ist:" },
      { ul: [
        "**Braune Holzscheibe** (Stammquerschnitt mit Jahresringen) – Artikeltyp **„Holz / Fertigung“**.",
        "**Rote Holzscheibe** – zusätzlich **geschütztes Holz (CITES)**. Hier sind Herkunfts- bzw. Ausfuhrdokumente zu beachten.",
        "Das Symbol wechselt sofort beim Auswählen; mit der Maus darüber erscheint eine Erklärung.",
        "Artikeltyp und CITES-Kennzeichen werden im **Artikel** gepflegt.",
      ] },
      { p: "**Artikel direkt öffnen:** Rechts neben jeder Auswahl steht ein kleines Pfeil-Symbol. Ein Klick öffnet den gewählten Artikel in einem **neuen Tab** – dort kann man ihn bearbeiten (z. B. Holzart, Volumen, CITES), ohne den Beleg zu verlassen. Danach den Beleg-Tab neu laden, um Änderungen zu sehen." },
    ],
  },
  {
    id: "freitext",
    bereich: "Angebot & Auftrag",
    titel: "Freitext-Felder (gelb)",
    bloecke: [
      { p: "Freitext-Felder in den Specs werden **gelb hinterlegt, sobald etwas drinsteht**. So fallen individuelle Kundenwünsche sofort auf. Leere Freitext-Felder bleiben weiß." },
      { p: "Freitexte werden **automatisch gespeichert**, sobald man das Feld verlässt (Klick daneben oder Tab-Taste) – es gibt keinen eigenen Speichern-Button. Unter dem Feld erscheint kurz „✓ gespeichert“." },
    ],
  },
  {
    id: "positionen",
    bereich: "Angebot & Auftrag",
    titel: "Positionen: generieren, anzeigen, bearbeiten",
    bloecke: [
      { p: "**„Aus Specs generieren“** erzeugt die Positionen aus Modell + Specs. **Vorhandene Positionen werden dabei gelöscht** und neu angelegt. Die Preise kommen aktuell aus den Artikeln (siehe „Preise“)." },
      { ul: [
        "**„nur relevante“** (über der Tabelle) ist standardmäßig angehakt: Es werden nur Positionen gezeigt, die auf dem Beleg erscheinen. Haken entfernen zeigt alle, auch die Info-Zeilen ohne Aufpreis.",
        "Spalte **rel.**: Häkchen = Position erscheint auf dem Beleg und zählt zur Summe.",
        "Anzahl, Einzelpreis, Rabatt % und rel. lassen sich je Zeile ändern und mit **OK** speichern. × löscht die Zeile.",
        "**Neue Position:** Artikel suchen (Name / Nummer) oder Freitext eingeben. Bleibt der Einzelpreis bei einem Artikel leer, wird er automatisch aus dem Artikel ermittelt.",
        "**Alle löschen** entfernt nach einer Sicherheitsabfrage alle Positionen des Belegs.",
      ] },
    ],
  },
  {
    id: "porto",
    bereich: "Angebot & Auftrag",
    titel: "Versandkosten (Porto) im Summenblock",
    bloecke: [
      { p: "Versandkosten sind **keine Position** mehr, sondern stehen – wie bei den meisten Unternehmen – im **Summenblock** unter den Positionen. So ist klar: Versand wird **nie rabattiert**." },
      { ul: [
        "Reihenfolge im Summenblock (Bildschirm, PDF, E-Rechnung): **Summe Positionen − Gesamtrabatt + Versandkosten = Summe netto**, dann MwSt und Brutto.",
        "**„Porto nach Staat“** setzt das passende Porto automatisch nach dem **Staat des Kunden**: mit **Modell-Artikel (Gitarre)** das Gitarren-Porto, sonst das Teile-Porto. Der Preis richtet sich nach Vertriebsweg und Währung (ohne Sonderrabatt).",
        "Den Betrag kann man auch **von Hand** eintragen (OK) oder mit **×** entfernen.",
        "Der Versand geht vom Angebot in den Auftrag und weiter in die Rechnung. Bei **Teilrechnungen** wird er nur **einmal** berechnet (in der ersten Rechnung); ein Storno gibt ihn wieder frei.",
        "Ist für den Staat kein Porto hinterlegt, erscheint ein Hinweis – dann unter **Einstellungen → Staaten** ein Porto zuordnen.",
      ] },
      { hinweis: "Bereits gebuchte Rechnungen und abgeschlossene Aufträge aus der Zeit davor zeigen das Porto weiterhin als Position – sie werden nicht verändert." },
    ],
  },
  {
    id: "preise",
    bereich: "Angebot & Auftrag",
    titel: "Preise nach Vertriebsweg",
    bloecke: [
      { p: "Der Einzelpreis einer Position wird aus dem Artikel nach dem **Vertriebsweg des Kunden** berechnet:" },
      { ul: [
        "**VK_EUR** (Endkunde): Artikelpreis ÷ 1,19 (netto). Ist am Artikel **„Brutto für Netto“** gesetzt, gilt der Artikelpreis direkt.",
        "**NET1 / NET2** (Händler): Artikelpreis abzüglich Händlerrabatt aus den Firmen-Einstellungen.",
        "**VK_US / NET_US**: US-Preis bzw. US-Preis abzüglich US-Händlerrabatt.",
        "Artikel mit **„nicht rabattierfähig“** (z. B. alle Porto-Artikel) bekommen keinen Händlerrabatt.",
        "Hat der Kunde einen **Sonderrabatt**, hat dieser Vorrang vor dem Händlerrabatt.",
      ] },
    ],
  },
  {
    id: "gesamtrabatt",
    bereich: "Angebot & Auftrag",
    titel: "Gesamtrabatt",
    bloecke: [
      { p: "Im Auftrag (und in der Rechnung) kann unter den Positionen ein **Gesamtrabatt** in Prozent gewährt werden (Haken „Gesamtrabatt“ + Prozent + OK)." },
      { ul: [
        "Der Gesamtrabatt steht als **eigene Zeile im Summenblock** (z. B. „Gesamtrabatt (10 %) − 300,00 €“) – auf dem Bildschirm, im PDF und in der E-Rechnung.",
        "Der Gesamtrabatt rechnet **nur auf rabattierfähige Positionen**. Artikel mit „nicht rabattierfähig“ – darunter **alle Porto-Artikel** – sind ausgenommen.",
        "Freitext-Positionen ohne Artikel gelten als rabattierfähig.",
        "Beispiel: 3.000 € Gitarre + 250 € Porto, 10 % → Rabatt 300 € (nicht 325 €), netto 2.950 €.",
      ] },
    ],
  },

  /* --------------------------------------------------------- Rechnungen */
  {
    id: "rechnung-ablauf",
    bereich: "Rechnungen",
    titel: "Ablauf: Entwurf → Buchen → Versenden",
    bloecke: [
      { p: "Rechnungen entstehen in zwei Stufen – so verlangen es § 14 UStG (fortlaufende, einmalige Nummer) und die GoBD (Unveränderbarkeit):" },
      { ul: [
        "**Entwurf:** Im Auftrag unter **Rechnung → „Rechnungsentwurf erstellen“** (oder unter Rechnungen → „Neue Rechnung ohne Auftrag“). Der Entwurf hat **noch keine Nummer und kein Datum**, ist frei änderbar und kann **gelöscht** werden – es entsteht keine Lücke.",
        "**Nachfrage vor dem Entwurf:** Fehlt im Auftrag der **Kunde**, sind **keine Versandkosten** eingetragen oder hat ein Gitarren-Auftrag (Produktion) **kein Modell**, listet das Programm die fehlenden Punkte auf und fragt, ob der Entwurf trotzdem erstellt werden soll.",
        "**Vorschau** prüfen (oben rechts) – das Dokument ist dort als „ENTWURF“ gekennzeichnet.",
        "**Buchen:** In einem Schritt wird die **Rechnungsnummer** vergeben, das **Rechnungsdatum auf heute** gesetzt, die Rechnung **gesperrt** und die **E-Rechnung (ZUGFeRD-PDF)** erzeugt und unveränderbar abgelegt. Schlägt ein Teil fehl, passiert gar nichts (keine Nummer verbraucht).",
        "**„Buchen und per E-Mail versenden“** öffnet danach direkt das E-Mail-Fenster; nach einfachem „Buchen“ fragt das Programm nach.",
      ] },
      { p: "Nach dem Buchen gilt:" },
      { ul: [
        "Positionen, Lieferdatum, Bemerkung und Anzahlung sind **gesperrt**; **PDF** öffnet immer das archivierte Original.",
        "Änderbar bleiben nur Zahlung (→ Status „Bezahlt“), Report-Monat und „beim Steuerbüro gebucht“.",
        "Korrekturen **nur über neue Belege**: Storno oder Rechnungskorrektur (siehe dort).",
      ] },
      { hinweis: "Nummernkreis: Rechnungen (RG-) und Stornos/Korrekturen (ST-) teilen sich wie in Ninox einen fortlaufenden Zähler, z. B. RG-2026-3723, ST-2026-3724, RG-2026-3725. Die laufende Nummer geht über den Jahreswechsel weiter." },
    ],
  },
  {
    id: "rechnung-teil",
    bereich: "Rechnungen",
    titel: "Teilrechnungen und Abrechnungsstand des Auftrags",
    bloecke: [
      { p: "Ein Auftrag kann **mehrere Rechnungen** haben. Jede Rechnungsposition merkt sich, aus welcher Auftragsposition sie stammt." },
      { ul: [
        "Ein neuer Entwurf übernimmt nur die **noch offenen Mengen** – bereits gebuchte Mengen werden abgezogen. Für eine Teilrechnung im Entwurf einfach Positionen löschen oder Mengen reduzieren.",
        "**„Offene Positionen aus Auftrag einlesen“** im Entwurf setzt die Positionen auf den aktuellen offenen Stand zurück.",
        "Im Auftrag zeigt der Tab **Rechnung** den Stand („noch nicht / teilweise / vollständig berechnet“); in den Positionen steht bei berechneten Zeilen „berechnet: x von y“.",
        "Ein Storno gibt die Mengen wieder frei – danach kann neu abgerechnet werden.",
      ] },
      { p: "Der **Auftrag bleibt änderbar, solange er nicht vollständig berechnet ist**. Dabei gilt:" },
      { ul: [
        "Schon berechnete Positionen: nicht löschbar, Preis und Rabatt gesperrt, Menge nicht unter die berechnete Menge.",
        "„Aus Specs generieren“, „Alle löschen“ und Gesamtrabatt nur, solange noch nichts berechnet ist.",
        "Vollständig berechnet → alle Positionen gesperrt.",
      ] },
    ],
  },
  {
    id: "rechnung-storno",
    bereich: "Rechnungen",
    titel: "Storno und Rechnungskorrektur",
    bloecke: [
      { p: "Gebuchte Rechnungen werden nie geändert. Korrekturen laufen über eigene Belege mit Verweis auf das Original:" },
      { ul: [
        "**Stornieren:** erzeugt eine **Stornorechnung** – vollständige Kopie mit negativen Beträgen, eigener ST-Nummer und Verweis aufs Original – und bucht sie sofort. Das Original wird als **„Storniert“** gekennzeichnet, bleibt sonst unverändert. War die Rechnung falsch: stornieren und eine neue Rechnung erstellen.",
        "**Rechnungskorrektur** (z. B. eine Position zurück): legt einen **Entwurf** mit allen Positionen negativ an. Nicht betroffene Positionen löschen bzw. Mengen anpassen, dann **buchen** (ST-Nummer).",
        "Auf dem PDF steht „Bezug: Rechnung RG-…“. In der Originalrechnung werden die Folgebelege verlinkt.",
      ] },
      { hinweis: "Begriff: „Gutschrift“ bedeutet umsatzsteuerlich die Abrechnung durch den Leistungsempfänger (§ 14 Abs. 2 UStG). Die frühere „Gutschrift“ heißt deshalb jetzt Rechnungskorrektur." },
    ],
  },
  {
    id: "rechnung-mail",
    bereich: "Rechnungen",
    titel: "Rechnung per E-Mail versenden",
    bloecke: [
      { p: "Nach dem Buchen öffnet **„Per E-Mail versenden“** das interne E-Mail-Fenster:" },
      { ul: [
        "**An:** E-Mail aus dem Kundendatensatz (änderbar, mehrere Adressen mit Komma).",
        "**Weitere Empfänger (CC):** beliebige Adresse von Hand eintragen. Ist beim Kunden eine **„E-Mail Rechnung CC“** (Rechnungsempfänger) hinterlegt, fügt der Button **„+ Rechnungsempfänger“** sie per Klick ein.",
        "**Textbaustein:** Standardtext in der Sprache des Kunden ist vorausgewählt; andere Bausteine lassen sich auswählen. Betreff und Text sind danach frei änderbar.",
        "**Anhänge:** Das Rechnungs-PDF ist immer dabei. **Fotos** vom Auftrag (und von der Rechnung) können per Häkchen mitgeschickt werden – Fotos mit „Mit Rechnung“ sind vorausgewählt. Max. 25 MB insgesamt.",
        "**E-Mail senden** verschickt sofort über info@nikhuber-guitars.com. Die Mail wird unter **Mailversand** protokolliert (bei Fehlern dort mit Fehlermeldung).",
      ] },
    ],
  },
  {
    id: "rechnung-fotos",
    bereich: "Rechnungen",
    titel: "Fotos der fertigen Gitarre mitsenden",
    bloecke: [
      { p: "Fotos der fertigen Gitarre im **Auftrag** unter **Dokumente & Bilder** hochladen. Bei jedem Foto gibt es das Häkchen **„Mit Rechnung“**." },
      { ul: [
        "Angehakte Fotos sind im E-Mail-Fenster der Rechnung **automatisch ausgewählt**.",
        "Dort kann man trotzdem jedes Foto noch an- oder abwählen.",
      ] },
    ],
  },
  {
    id: "rechnung-verlauf",
    bereich: "Rechnungen",
    titel: "Verlauf einer Rechnung",
    bloecke: [
      { p: "Auf der Startseite jeder Rechnung (Tab **Rechnung**, rechte Spalte ganz unten) zeigt der Kasten **„Verlauf“** chronologisch, was wann passiert ist – mit Datum, Uhrzeit, Benutzer und Links zu den jeweiligen Belegen:" },
      { ul: [
        "**Auftrag angelegt** (mit Link zum Auftrag).",
        "**Entwurf angelegt**, **gebucht** (mit Nummer), **per E-Mail versendet** (mit Link zum Mail-Protokoll; auch fehlgeschlagene Versuche), **Zahlung eingegangen** (Betrag, Bank).",
        "**Storniert durch** Stornorechnung ST-… bzw. Rechnungskorrekturen.",
        "**Anzahlungen**: in der Endrechnung „als Abzug übernommen“, in der Anzahlungsrechnung „abgezogen in Rechnung RG-…“.",
        "Ereignisse **anderer Belege desselben Auftrags** (z. B. Anzahlungsrechnung, frühere Teilrechnung) erscheinen grau mit Link – so sieht man die ganze Abrechnungsgeschichte des Auftrags.",
        "Belege aus **Ninox** haben keinen genauen Zeitpunkt; dort steht das Rechnungsdatum mit dem Hinweis „aus Ninox übernommen“.",
      ] },
    ],
  },
  {
    id: "rechnung-zahlung",
    bereich: "Rechnungen",
    titel: "Zahlung erfassen (Abzug %)",
    bloecke: [
      { p: "Im Tab **Zahlung** einer gebuchten Rechnung den **tatsächlichen Zahlbetrag laut Bankauszug** eintragen, dazu Datum, Bank und Zahlungsstatus." },
      { ul: [
        "**Abzug %** und **Differenz** werden sofort aus dem Zahlbetrag berechnet: Abzug % = (Rechnungsbetrag − Zahlbetrag) ÷ Rechnungsbetrag. Beispiel: 100,00 € Rechnung, 80,00 € Eingang → Abzug **20 % · 20,00 €**, Differenz −20,00 €.",
        "Zahlt der Kunde mehr, erscheint ein negativer Abzug („Überzahlung“).",
        "Zahlungsstatus **BEZAHLT** setzt die Rechnung auf „Bezahlt“.",
      ] },
    ],
  },
  {
    id: "anzahlung-hintergrund",
    bereich: "Anzahlungen",
    titel: "Anzahlungen – warum eine Anzahlungsrechnung? (Hintergrund)",
    bloecke: [
      { p: "Bei Auftragserteilung lassen wir uns manchmal eine **Anzahlung** zahlen. Steuerlich gilt dafür Folgendes (vereinfacht dargestellt, ohne Gewähr – im Zweifel mit dem Steuerbüro abstimmen):" },
      { ul: [
        "**Die Umsatzsteuer entsteht schon mit dem Geldeingang.** Bei Anzahlungen schuldet man die USt in dem Monat, in dem das Geld eingeht – unabhängig davon, ob schon eine Rechnung geschrieben wurde („Mindest-Ist-Versteuerung“, § 13 Abs. 1 Nr. 1a Satz 4 UStG).",
        "**Über die Anzahlung wird eine Rechnung mit ausgewiesener USt gestellt** – die **Anzahlungsrechnung** (§ 14 Abs. 5 UStG). Gewerbliche Kunden (z. B. Händler) brauchen sie, um die Vorsteuer aus der Anzahlung abziehen zu können.",
        "**Eine Quittung allein reicht dafür nicht.** Eine Quittung bzw. Zahlungsbestätigung bestätigt nur den Geldeingang; sie ist kein Steuerbeleg. Sie ist aber für Privatkunden oft angenehm – deshalb gibt es in der App beides.",
        "**Die Endrechnung weist die gesamte Leistung aus** (alle Positionen, volle Summe) und zieht davon die **erhaltenen Anzahlungen mit der darauf entfallenden USt** ab (§ 14 Abs. 5 Satz 2 UStG). Nur so stimmt die Umsatzsteuer am Ende: Sie wird insgesamt genau einmal abgeführt – zum Teil mit der Anzahlung, der Rest mit der Endrechnung.",
      ] },
      { p: "So war es früher in Ninox: Die Anzahlung wurde als normale Rechnung mit einer Position „Anzahlung / down payment“ gestellt, ohne Verbindung zur späteren Endrechnung; in der Endrechnung gab es nur ein manuelles Feld „Anzahlung brutto“ ohne MwSt-Aufteilung. Das ist jetzt sauber gelöst – siehe die folgenden Artikel." },
    ],
  },
  {
    id: "anzahlung-erstellen",
    bereich: "Anzahlungen",
    titel: "Anzahlungsrechnung erstellen",
    bloecke: [
      { p: "Im **Auftrag → Tab Rechnung** gibt es den Kasten **„Anzahlungsrechnung erstellen“**:" },
      { ul: [
        "**Betrag (brutto)** – z. B. 5.000,00 € – **oder Prozent vom Auftrag** – z. B. 30 % vom Auftrags-Brutto. Prozent geht nur, wenn der Auftrag schon eine Summe hat.",
        "Der eingegebene Betrag ist immer der **Brutto-Zahlbetrag**; die MwSt wird automatisch **herausgerechnet** und cent-genau aufgeteilt (Beispiel: 5.000,00 € brutto = 4.201,68 € netto + 798,32 € MwSt). Die Vorschau unter dem Feld zeigt die Aufteilung sofort.",
        "Bei **steuerfreien Kunden** (EU mit USt-IdNr., Export) gibt es keine MwSt – die Anzahlungsrechnung trägt dann wie jede Rechnung den passenden Steuerhinweis.",
        "**„Entwurf anlegen“** erzeugt einen **Entwurf** vom Typ „Anzahlungsrechnung“ mit einer Position „Anzahlung gemäß Auftrag A-…“ (englisch: „Down payment for order …“) und dem Modell als Beschreibung. Der Entwurf kann noch geändert oder gelöscht werden.",
        "Danach wie jede Rechnung **buchen** (RG-Nummer aus dem gemeinsamen Nummernkreis, Rechnungsdatum = heute, E-Rechnung wird erzeugt und archiviert) und **per E-Mail versenden**.",
        "In der E-Rechnung ist die Anzahlungsrechnung als solche gekennzeichnet (Rechnungsart 386 „Anzahlungsrechnung“).",
        "Mehrere Anzahlungen zu einem Auftrag sind möglich (z. B. 30 % bei Auftrag, 30 % bei Fertigungsbeginn).",
      ] },
      { p: "Sobald das Geld da ist: in der Anzahlungsrechnung im Tab **Zahlung** Zahlbetrag, Datum und Bank eintragen und Zahlungsstatus „BEZAHLT“ setzen." },
    ],
  },
  {
    id: "anzahlung-endrechnung",
    bereich: "Anzahlungen",
    titel: "Anzahlung in der Endrechnung abziehen",
    bloecke: [
      { p: "Wird später im Auftrag der **Rechnungsentwurf erstellt**, übernimmt die App **automatisch alle gebuchten Anzahlungsrechnungen** dieses Auftrags als Abzug. Die Endrechnung zeigt die volle Leistung und darunter die Abzüge:" },
      { ul: [
        "Summe Positionen 13.002,89 € · Versandkosten 25,63 € · **Summe netto 13.028,52 €** · MwSt 19 % 2.475,42 € · **Gesamtbetrag brutto 15.503,94 €**",
        "**abzgl. Anzahlung RG-2026-3715 vom 19.08.2026** (netto 4.201,68 € + MwSt 798,32 €) **− 5.000,00 €**",
        "**Noch zu zahlen: 10.503,94 €**",
      ] },
      { p: "Weitere Regeln:" },
      { ul: [
        "Im Kasten **„Anzahlungen“** der Rechnung stehen alle Abzüge mit Status. Ist eine Anzahlung **noch nicht bezahlt**, erscheint ein gelber Hinweis – abgezogen werden sollten nur tatsächlich erhaltene Anzahlungen. Im Entwurf kann ein Abzug mit **×** entfernt und mit **„Anzahlungen des Auftrags übernehmen“** wieder geholt werden (z. B. wenn eine Anzahlung erst nach dem Entwurf gebucht wurde).",
        "Die Beträge des Abzugs werden in der Endrechnung **eingefroren**; nach dem Buchen ändert sich nichts mehr.",
        "Jede Anzahlung wird **nur einmal** abgezogen – auch bei mehreren Teilrechnungen. Sie landet in der ersten Rechnung, die sie übernimmt.",
        "In der **E-Rechnung** der Endrechnung stehen Gesamtbetrag, „bereits gezahlt“ (Summe der Anzahlungen) und der verbleibende Zahlbetrag.",
        "Im Tab **Zahlung** der Endrechnung ist der Rechnungsbetrag bereits um die Anzahlungen gemindert – eingetragen wird nur noch der Restbetrag laut Bankauszug.",
      ] },
    ],
  },
  {
    id: "anzahlung-sonderfaelle",
    bereich: "Anzahlungen",
    titel: "Sonderfälle: Storno, Auftrag abgesagt, Altbestand",
    bloecke: [
      { ul: [
        "**Anzahlungsrechnung falsch?** Gebuchte Anzahlungsrechnungen werden **storniert** (Button „Stornieren“, ST-Nummer) und bei Bedarf neu erstellt. Eine Rechnungskorrektur gibt es bei Anzahlungen nicht.",
        "**Anzahlung schon in einer Endrechnung abgezogen?** Dann kann sie nicht storniert werden – zuerst im Entwurf den Abzug entfernen bzw. die gebuchte Endrechnung stornieren.",
        "**Endrechnung storniert?** Die Stornorechnung übernimmt die Abzüge mit umgekehrtem Vorzeichen; die Anzahlungen sind danach wieder frei und werden in der neuen Endrechnung abgezogen.",
        "**Auftrag abgesagt:** Anzahlungsrechnung stornieren und die Rückzahlung an den Kunden über die Bank abwickeln.",
        "**Altbestand:** Ältere Rechnungen mit dem früheren manuellen Feld „Anzahlung brutto“ zeigen es weiter im Kasten „Anzahlung (Altbestand, manuell)“. Für neue Rechnungen wird es nicht mehr verwendet.",
      ] },
    ],
  },
  {
    id: "zahlungsbestaetigung",
    bereich: "Anzahlungen",
    titel: "Zahlungsbestätigung (Quittung)",
    bloecke: [
      { p: "Zu jeder gebuchten Rechnung oder Anzahlungsrechnung kann eine **Zahlungsbestätigung** als PDF erzeugt werden – z. B. für Privatkunden, die eine Quittung über ihre Anzahlung möchten." },
      { ul: [
        "Voraussetzung: Im Tab **Zahlung** sind **Zahlbetrag und Zahlungsdatum** eingetragen. Dann erscheint oben der Button **„Zahlungsbestätigung“**.",
        "Inhalt: Firma, Kunde, „Hiermit bestätigen wir den Eingang von … am …“, Bezug auf Rechnung/Anzahlungsrechnung und Auftrag, Bank, Betrag – in der Sprache des Kunden (DE/EN).",
        "Hinweis auf dem Dokument: Die Bestätigung **ersetzt keine Rechnung**; die Umsatzsteuer steht in der Rechnung.",
      ] },
    ],
  },
  {
    id: "rechnung-adhoc",
    bereich: "Rechnungen",
    titel: "Rechnung ohne Auftrag (Kleinteile, Ersatzteile)",
    bloecke: [
      { p: "Unter **Rechnungen → „Neue Rechnung ohne Auftrag“**: Kunde suchen, **„Entwurf anlegen“** klicken. Der Entwurf öffnet sich im Tab Positionen; dort die Artikel über „Neue Position“ hinzufügen und anschließend buchen." },
      { ul: [
        "Gedacht für **Nicht-Gitarren-Artikel**: Kleinteile, Ersatzteile, Zubehör usw.",
        "**Modell-Artikel (Gitarren)** können hier nicht hinzugefügt werden – Gitarren werden immer über einen Auftrag abgerechnet.",
        "Kundendaten (Adresse, Währung, Vertriebsweg, Steuer) werden vom Kunden übernommen; die Adresse wird beim Buchen nochmals aktualisiert.",
      ] },
    ],
  },

  /* ----------------------------------------------------------- Anhänge */
  {
    id: "anhaenge",
    bereich: "Dokumente & Bilder",
    titel: "Anhänge hochladen und ansehen",
    bloecke: [
      { p: "Unter **Dokumente & Bilder → Anhänge** (z. B. im Auftrag, auch bei Tickets) lassen sich Dateien bis 50 MB hochladen: Datei wählen, optional die Art (Bild, Beleg-PDF, CITES …) – sonst wird sie automatisch erkannt – und **Hochladen**." },
      { ul: [
        "**Fotos** erscheinen als Vorschaubild, **PDFs** mit einem roten „PDF“-Kästchen.",
        "Klick auf Vorschaubild oder Dateiname öffnet die Datei **groß auf der Seite**. Mit den Pfeilen ‹ › oder den Pfeiltasten blättert man durch alle Bilder/PDFs; **Esc** oder Klick daneben schließt.",
        "**Herunterladen** speichert die Datei. Andere Dateitypen (Word, Excel …) werden direkt heruntergeladen.",
        "Bei **Tickets** kann man einen Screenshot mit **Strg + V** direkt einfügen.",
        "Im **Auftrag** haben Fotos das Häkchen **„Mit Rechnung“** – solche Fotos werden beim Rechnungsversand vorausgewählt.",
        "Löschen (×) dürfen Admin und Büro.",
      ] },
      { hinweis: "Die Vorschau-Links sind aus Sicherheitsgründen 10 Minuten gültig. War die Seite länger offen, einmal neu laden." },
    ],
  },

  /* ------------------------------------------------------------ Tickets */
  {
    id: "tickets",
    bereich: "Tickets",
    titel: "Tickets: Bugs, Wünsche, Fragen",
    bloecke: [
      { p: "Unter **Tickets** meldet jeder Benutzer Fehler oder Wünsche zur App. Typen: **Bug, Wunsch, Frage, Sonstiges**; dazu Titel, Beschreibung, Priorität (niedrig / mittel / hoch) und Screenshots." },
      { ul: [
        "Status: Neu → In Arbeit → Rückfrage → Erledigt (oder Abgelehnt).",
        "Der **Aufwand** (Umsetzungszeit in Minuten) wird beim Bearbeiten des Tickets eingetragen – beim Anlegen gibt es das Feld noch nicht.",
        "Wird ein Ticket auf **Erledigt** gesetzt, bekommt der Ersteller eine **E-Mail**.",
        "Ein Kommentar als **Rückfrage** setzt das Ticket auf „Rückfrage“ und schickt der jeweils anderen Seite eine E-Mail.",
        "In der Liste sind **erledigte und abgelehnte Tickets ausgeblendet**. Mit dem Häkchen **„erledigte anzeigen“** (und „Filtern“) erscheinen sie wieder – unten, nach den offenen. Wer im Status-Filter „Erledigt“ oder „Abgelehnt“ wählt, sieht diese auch ohne Häkchen.",
      ] },
    ],
  },

  /* ------------------------------------------------------- Einstellungen */
  {
    id: "textbausteine",
    bereich: "Einstellungen",
    titel: "Textbausteine für E-Mails",
    bloecke: [
      { p: "Unter **Einstellungen → Textbausteine** werden die Texte für E-Mails gepflegt (Name, Belegart, Sprache DE/EN, Betreff, Text)." },
      { ul: [
        "Je Belegart und Sprache kann ein Baustein **Standard** sein – er wird im E-Mail-Fenster automatisch passend zur Kundensprache gewählt.",
        "Platzhalter werden beim Einfügen ersetzt: {{briefanrede}} (z. B. „Hallo Rainer,“), {{rechnungsnummer}}, {{auftragsnummer}}, {{model}}, {{kunde}}.",
        "Der Text ist Klartext; Zeilenumbrüche bleiben in der Mail erhalten.",
      ] },
    ],
  },
  {
    id: "themes",
    bereich: "Einstellungen",
    titel: "Themes (Farben der Oberfläche)",
    bloecke: [
      { p: "Unter **Einstellungen → Themes** werden Farbschemata verwaltet. Das **aktive** Theme gilt für alle Benutzer, auch auf der Anmeldeseite." },
      { ul: [
        "Mitgeliefert: **„Navy & Petrol“** (Standard) und **„Claude“** (die frühere Creme/Clay-Optik).",
        "**Neu aus Vorlage**, **Duplizieren** und **Bearbeiten**: Jede Farbe per Farbwähler oder als Wert (#001957 bzw. rgba(16,157,168,.24) für Transparenz). Rechts zeigt eine **Live-Vorschau** das Ergebnis.",
        "**Aktivieren** schaltet sofort für alle um. Das aktive Theme kann nicht gelöscht werden.",
        "Nur Admins dürfen Themes anlegen, ändern und aktivieren.",
      ] },
      { p: "Bedeutung der Farbfelder:" },
      { ul: [
        "**Schrift dunkel** = Überschriften · **Schrift mittel** = Fließtext · **Schrift gedämpft** = Nebentexte.",
        "**Seitenhintergrund**, **Kartenfläche**, **Linien & Rahmen** = Flächen und Trennlinien.",
        "**Kartenkopf (Überschrift)** = Hintergrund des Kopfbereichs eines Blocks, in dem die Überschrift steht (z. B. ein helles Grün) – unabhängig von der Kartenfläche. Gleiche Farbe wie die Kartenfläche = kein sichtbarer Kopf.",
        "**Akzent** = Links, Fokus-Rahmen, aktive Tabs · **Akzent hell** = Hover-Flächen und Badges · **Schein** = Leuchten um fokussierte Eingabefelder.",
        "**Schaltfläche** = aktiver Menüpunkt, aktive Filter, Logo · **Hauptschaltfläche** = Speichern-/Haupt-Buttons (mit eigener Schriftfarbe).",
        "**Eingabefeld** / **Eingabefeld-Rahmen** = Grund und Rand von Eingabefeldern.",
      ] },
    ],
  },
  {
    id: "arbeitszeit",
    bereich: "Einstellungen",
    titel: "Arbeitszeit-Protokoll der App-Entwicklung (nur Admin)",
    bloecke: [
      { p: "Unter **Einstellungen → Arbeitszeit** steht, wie lange an Entwurf, Aufbau und Weiterentwicklung dieser App gearbeitet wurde – ein Eintrag je Arbeitstag mit Beginn, Ende, Stunden und kurzer Beschreibung." },
      { ul: [
        "Ein Arbeitstag endet um **4:00 Uhr** morgens, nicht um Mitternacht.",
        "Die Zeit wird aus den Claude-Code-Sitzungsprotokollen und den Git-Commits berechnet; **Pausen über 30 Minuten** zählen nicht. Am Ende jedes Arbeitsblocks (vor einer Pause und am Tagesende) kommen **10 Minuten** fürs Testen im Frontend dazu. „Git (geschätzt)“ heißt: Sitzungsprotokoll nicht mehr vorhanden, Zeit aus den Commits geschätzt.",
        "Die Tabelle aktualisiert sich **automatisch nach jeder Claude-Antwort**.",
        "**Bearbeiten**: Beschreibung anpassen und **manuelle Zeit** nachtragen (z. B. Tests, Einrichtung ohne Claude, als 1:30 oder 1,5). Mit **Tag nachtragen** lassen sich Tage ganz ohne Claude erfassen.",
      ] },
    ],
  },
  {
    id: "adresse-ableitung",
    bereich: "Einstellungen",
    titel: "Adresse: Werte aus dem Staat übernehmen",
    bloecke: [
      { p: "Im Kontakt unter **Preise / Steuer / Zahlung** zeigt die graue Zeile, was sich aus dem gewählten **Staat** ergibt. Ein Klick auf **„Übernehmen“** setzt:" },
      { ul: [
        "**Region** (aus dem Staat), **Vertriebsweg** und **Steuerpflichtig** (aus Kontaktart × Region),",
        "**Währung**: USD bei USA und Kanada, sonst EUR,",
        "**Sprache**: Deutsch bei Deutschland und Österreich, sonst Englisch.",
        "Beim Neuanlegen werden leere Felder automatisch so vorbelegt. Danach mit „Speichern“ übernehmen.",
      ] },
    ],
  },
  {
    id: "staaten",
    bereich: "Einstellungen",
    titel: "Staaten und Porto-Zuordnung",
    bloecke: [
      { p: "Unter **Einstellungen → Staaten** hat jeder Staat Kürzel, Region, Standard-Sprache, -Währung und -Zahlungsbedingung – und zwei Porto-Artikel:" },
      { ul: [
        "**Porto Gitarre**: wird bei Belegen mit Gitarre (Modell-Artikel) eingesetzt.",
        "**Porto Teile**: für alle anderen Belege (z. B. Ersatzteile).",
        "Zur Auswahl stehen alle aktiven Artikel der Gruppe **Versand**. Preise ändert man wie gewohnt am Artikel.",
        "Neue Länder-Portos: Artikel in der Gruppe Versand anlegen (als „nicht rabattierfähig“) und beim Staat zuordnen.",
      ] },
    ],
  },
];
