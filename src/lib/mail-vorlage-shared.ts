/** Client-sichere Helfer für Mail-Textbausteine (Platzhalter füllen, Text → HTML). */

export const MAIL_PLATZHALTER = [
  { key: "briefanrede", label: "Briefanrede des Kunden (z. B. „Hallo Rainer,“)" },
  { key: "rechnungsnummer", label: "Rechnungsnummer" },
  { key: "auftragsnummer", label: "Auftragsnummer" },
  { key: "model", label: "Modell (Gitarre)" },
  { key: "kunde", label: "Kundenname" },
] as const;

export type MailPlatzhalterWerte = Partial<Record<(typeof MAIL_PLATZHALTER)[number]["key"], string | null>>;

/** `{{key}}` durch Werte ersetzen; unbekannte/leere Platzhalter werden entfernt. */
export function fuelleVorlage(text: string | null | undefined, werte: MailPlatzhalterWerte): string {
  return (text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = werte[k as keyof MailPlatzhalterWerte];
    return v == null ? "" : String(v);
  });
}

/** Klartext (mit Zeilenumbrüchen) → einfaches, escaptes HTML. */
export function textZuHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(/\r?\n/g, "<br>");
}

/** „a@b.de; c@d.de, e@f.de" → bereinigte Liste. */
export function splitEmails(s: string | null | undefined): string[] {
  return (s ?? "").split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
}

export function istEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Platzhalter der Mahn-Bausteine (Zahlungserinnerung 1/2, letzte Mahnung). */
export const MAHN_PLATZHALTER = [
  { key: "briefanrede", label: "Briefanrede des Kunden" },
  { key: "rechnungsnummer", label: "Rechnungsnummer" },
  { key: "rechnungsdatum", label: "Rechnungsdatum" },
  { key: "betrag", label: "Rechnungsbetrag (Gesamtpreis)" },
  { key: "mahngebuehr", label: "Mahngebühr dieser Stufe" },
  { key: "gesamtbetrag", label: "Rechnungsbetrag + Mahngebühr" },
] as const;
