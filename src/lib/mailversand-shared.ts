/** Client-sichere Mailversand-Konstanten (kein DB-Zugriff). */

export const MAIL_ART_VALUES = [
  "ANGEBOT", "AUFTRAGSBESTAETIGUNG", "RECHNUNG", "GUTSCHRIFT", "SONSTIGES",
  "MAIL_EINGANG", "MAIL_AUSGANG", "TELEFONAT", "ZAHLUNGSERINNERUNG", "LEAD",
] as const;
export type MailArt = (typeof MAIL_ART_VALUES)[number];

export const MAIL_ART_LABEL: Record<MailArt, string> = {
  ANGEBOT: "Angebot",
  AUFTRAGSBESTAETIGUNG: "Auftragsbestätigung",
  RECHNUNG: "Rechnung",
  GUTSCHRIFT: "Gutschrift",
  SONSTIGES: "Sonstiges",
  MAIL_EINGANG: "Mail-Eingang",
  MAIL_AUSGANG: "Mail-Ausgang",
  TELEFONAT: "Telefonat",
  ZAHLUNGSERINNERUNG: "Zahlungserinnerung",
  LEAD: "Lead",
};
export const MAIL_ART = MAIL_ART_VALUES.map((value) => ({ value, label: MAIL_ART_LABEL[value] }));

export const MAIL_STATUS_VALUES = ["ENTWURF", "VERSENDET", "FEHLER", "ERFOLG"] as const;
export type MailStatus = (typeof MAIL_STATUS_VALUES)[number];

export const MAIL_STATUS_LABEL: Record<MailStatus, string> = {
  ENTWURF: "Entwurf",
  VERSENDET: "versendet",
  FEHLER: "Fehler",
  ERFOLG: "erfolgreich",
};
export const MAIL_STATUS = MAIL_STATUS_VALUES.map((value) => ({ value, label: MAIL_STATUS_LABEL[value] }));
export const MAIL_STATUS_TONE: Record<MailStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  ENTWURF: "neutral",
  VERSENDET: "blue",
  FEHLER: "red",
  ERFOLG: "green",
};
