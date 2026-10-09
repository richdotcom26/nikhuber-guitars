/** Client-sichere Verleih-Helfer (Status, Vereinbarungstext) — kein DB-Zugriff. */

export type VerleihStatus = "VORBEREITET" | "VERLIEHEN" | "UEBERFAELLIG" | "ZURUECK";

export const VERLEIH_STATUS_LABEL: Record<VerleihStatus, string> = {
  VORBEREITET: "vorbereitet",
  VERLIEHEN: "verliehen",
  UEBERFAELLIG: "überfällig",
  ZURUECK: "zurück",
};
export const VERLEIH_STATUS_TON: Record<VerleihStatus, "neutral" | "blue" | "red" | "green"> = {
  VORBEREITET: "neutral",
  VERLIEHEN: "blue",
  UEBERFAELLIG: "red",
  ZURUECK: "green",
};

/** Status aus den Daten ableiten (`heute` = YYYY-MM-DD, Europe/Berlin). */
export function verleihStatus(
  v: { versendetAm: string | null; verfuegbarBis: string | null; zurueckAm: string | null },
  heute: string,
): VerleihStatus {
  if (v.zurueckAm) return "ZURUECK";
  if (!v.versendetAm) return "VORBEREITET";
  if (v.verfuegbarBis && v.verfuegbarBis < heute) return "UEBERFAELLIG";
  return "VERLIEHEN";
}

/** Platzhalter für die Verleih-Textbausteine (Einstellungen → Textbausteine). */
export const VERLEIH_PLATZHALTER = [
  { key: "briefanrede", label: "Briefanrede (z. B. „Hallo Rainer,“)" },
  { key: "model", label: "Modell der Gitarre" },
  { key: "seriennummer", label: "Seriennummer" },
  { key: "versendet_am", label: "Versanddatum" },
  { key: "rueckgabe_bis", label: "Rückgabe bis (Datum)" },
  { key: "link", label: "Link zur elektronischen Unterschrift" },
] as const;

/** Vereinbarungstexte (Übergabe-/Leihvereinbarung). Platzhalter: {wert}, {bis}. */
export const VEREINBARUNG = {
  DE: {
    titel: "Übergabevereinbarung (Leihgabe)",
    verleiher: "Verleiher",
    leihnehmer: "Leihnehmer",
    gegenstand: "Leihgegenstand",
    modell: "Modell",
    seriennummer: "Seriennummer",
    zubehoer: "Zubehör",
    wert: "Wert",
    zweck: "Zweck",
    zeitraum: "Leihdauer",
    vom: "ab",
    bis: "bis spätestens",
    bedingungenTitel: "Bedingungen",
    bedingungen: [
      "Die Gitarre bleibt Eigentum von Nik Huber Guitars. Sie wird ausschließlich zu Test- bzw. Vorführzwecken überlassen.",
      "Der Leihnehmer behandelt die Gitarre sorgfältig. Umbauten, Lackarbeiten oder sonstige Veränderungen sind nicht erlaubt; Einstellarbeiten nur nach Absprache. Eine Weitergabe an Dritte bedarf der Zustimmung von Nik Huber Guitars.",
      "Der Leihnehmer haftet während der Leihdauer für Verlust und Beschädigung bis zur Höhe des oben genannten Wertes ({wert}); ausgenommen ist die normale Abnutzung bei bestimmungsgemäßem Gebrauch.",
      "Die Gitarre ist spätestens am {bis} vollständig (mit Zubehör), sicher verpackt und versichert zurückzugeben. Die Kosten der Rücksendung trägt der Leihnehmer, sofern nichts anderes vereinbart ist.",
      "Schäden oder Mängel sind Nik Huber Guitars unverzüglich mitzuteilen.",
    ],
    ortDatum: "Ort, Datum",
    unterschriftLeihnehmer: "Unterschrift Leihnehmer",
    fuerVerleiher: "für Nik Huber Guitars",
    elektronisch: (name: string, zeit: string, ip: string) =>
      `Elektronisch unterschrieben von ${name} am ${zeit}${ip ? ` (IP ${ip})` : ""}.`,
  },
  EN: {
    titel: "Loan Agreement (Handover)",
    verleiher: "Lender",
    leihnehmer: "Borrower",
    gegenstand: "Loaned item",
    modell: "Model",
    seriennummer: "Serial number",
    zubehoer: "Accessories",
    wert: "Value",
    zweck: "Purpose",
    zeitraum: "Loan period",
    vom: "from",
    bis: "until",
    bedingungenTitel: "Terms",
    bedingungen: [
      "The guitar remains the property of Nik Huber Guitars. It is provided solely for testing or demonstration purposes.",
      "The borrower shall handle the guitar with care. Modifications, refinishing or other alterations are not permitted; setup work only by prior agreement. Passing the guitar on to third parties requires the consent of Nik Huber Guitars.",
      "During the loan period the borrower is liable for loss of and damage to the guitar up to the value stated above ({wert}), excluding normal wear and tear from proper use.",
      "The guitar must be returned complete (including accessories), safely packed and insured, no later than {bis}. Return shipping costs are borne by the borrower unless otherwise agreed.",
      "Any damage or defects must be reported to Nik Huber Guitars without delay.",
    ],
    ortDatum: "Place, date",
    unterschriftLeihnehmer: "Borrower's signature",
    fuerVerleiher: "for Nik Huber Guitars",
    elektronisch: (name: string, zeit: string, ip: string) =>
      `Electronically signed by ${name} on ${zeit}${ip ? ` (IP ${ip})` : ""}.`,
  },
} as const;
export type VerleihSprache = keyof typeof VEREINBARUNG;
