/** Hauptnavigation — die 9 Bereiche (ZIELMODELL §7aa / MIGRATION 7aa). */
export const NAV = [
  { href: "/todo", label: "ToDo" },
  { href: "/adressen", label: "Adressen" },
  { href: "/angebote", label: "Angebote" },
  { href: "/auftraege", label: "Aufträge" },
  { href: "/rechnungen", label: "Rechnungen" },
  { href: "/seriennummern", label: "Seriennummern #" },
  { href: "/artikel", label: "Artikel" },
  { href: "/modelle", label: "Modelle" },
  { href: "/holzbestand", label: "Holzbestand" },
] as const;

/** Sekundärbereiche (unter „Verwaltung"). */
export const NAV_VERWALTUNG = [
  { href: "/bauplanung", label: "Bauplanung" },
  { href: "/report", label: "Report Monat" },
  { href: "/mailversand", label: "Mailversand" },
  { href: "/betriebsmittel", label: "Betriebsmittel" },
  { href: "/einstellungen", label: "Einstellungen" },
] as const;
