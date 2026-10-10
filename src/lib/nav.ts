/** Hauptnavigation — oberste Ebene (ZIELMODELL §7aa / MIGRATION 7aa). */
export const NAV = [
  { href: "/todo", label: "ToDo" },
  { href: "/adressen", label: "Adressen" },
  { href: "/angebote", label: "Angebote" },
  { href: "/auftraege", label: "Aufträge" },
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/wiki", label: "Wiki" },
] as const;

/** Untermenüs (Aufklapp-Register neben der obersten Ebene). */
export const NAV_GRUPPEN = [
  {
    label: "Weitere",
    items: [
      { href: "/seriennummern", label: "SerNo #" },
      { href: "/artikel", label: "Artikel" },
      { href: "/modelle", label: "Modelle" },
      { href: "/holzbestand", label: "Holzbestand" },
      { href: "/tickets", label: "Tickets" },
    ],
  },
  {
    label: "Verwaltung",
    items: [
      { href: "/verleih", label: "Verleih-/Testgitarren" },
      { href: "/bauplanung", label: "Bauplanung" },
      { href: "/betriebsmittel", label: "Betriebsmittel" },
      { href: "/report", label: "Report Monat" },
      { href: "/mailversand", label: "Mailversand" },
    ],
  },
] as const;

