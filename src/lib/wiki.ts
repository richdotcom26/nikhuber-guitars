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
      { p: "Es gibt **kein automatisches Speichern**. Jeder Block (z. B. Kopf, Kunde, Specs, eine Positionszeile) hat seinen eigenen Button („Speichern“, „OK“ …). Erst der Klick übernimmt die Änderungen dieses Blocks." },
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
      { p: "Jeder Arbeitsschritt hat einen Status: offen, erledigt, „Warten auf …“ oder „Kiste vollständig“." },
      { ul: [
        "Bei **erledigt** und **Kiste vollständig** wird automatisch gespeichert, **wer** den Schritt erledigt hat und **wann** (Datum + Uhrzeit).",
        "Bei **Warten auf …** wählt man den Grund aus: Kunde, Material / Teile, Lieferant, Lackierung / extern, Freigabe / Rückmeldung, Rückfrage intern, Sonstiges.",
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
    id: "freitext",
    bereich: "Angebot & Auftrag",
    titel: "Freitext-Felder (gelb)",
    bloecke: [
      { p: "Freitext-Felder in den Specs werden **gelb hinterlegt, sobald etwas drinsteht**. So fallen individuelle Kundenwünsche sofort auf. Leere Freitext-Felder bleiben neutral." },
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
    titel: "Porto hinzufügen",
    bloecke: [
      { p: "Unter der Positionsliste (nur Angebot und Auftrag) gibt es den Button **„Porto hinzufügen“**. Er setzt automatisch das passende Porto nach dem **Staat des Kunden** ein." },
      { ul: [
        "Enthält der Beleg einen **Modell-Artikel (Gitarre)**, wird das **Gitarren-Porto** des Staats genommen, sonst das **Teile-Porto**.",
        "Ist schon eine Porto-Position da, wird sie **ersetzt** – es gibt nie doppeltes Porto.",
        "Der Preis richtet sich nach Vertriebsweg und Währung. Der Sonderrabatt des Kunden gilt **nicht** fürs Porto.",
        "Ist für den Staat kein Porto hinterlegt, erscheint ein Hinweis. Dann unter **Einstellungen → Staaten** ein Porto zuordnen.",
      ] },
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
        "Beim Ticket wird der **Aufwand** (Umsetzungszeit) festgehalten.",
        "Wird ein Ticket auf **Erledigt** gesetzt, bekommt der Ersteller eine **E-Mail**.",
        "Ein Kommentar als **Rückfrage** setzt das Ticket auf „Rückfrage“ und schickt der jeweils anderen Seite eine E-Mail.",
        "Offene Tickets stehen oben, erledigte/abgelehnte unten.",
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
        "Die Zeit wird aus den Claude-Code-Sitzungsprotokollen und den Git-Commits berechnet; **Pausen über 30 Minuten** zählen nicht. „Git (geschätzt)“ heißt: Sitzungsprotokoll nicht mehr vorhanden, Zeit aus den Commits geschätzt.",
        "Die Tabelle aktualisiert sich **automatisch nach jeder Claude-Antwort**.",
        "**Bearbeiten**: Beschreibung anpassen und **manuelle Zeit** nachtragen (z. B. Tests, Einrichtung ohne Claude, als 1:30 oder 1,5). Mit **Tag nachtragen** lassen sich Tage ganz ohne Claude erfassen.",
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
