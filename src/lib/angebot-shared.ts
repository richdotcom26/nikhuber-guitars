/** Client-sichere Angebot-Konstanten (kein DB-Zugriff). */
export const ANGEBOT_STATUS_VALUES = [
  "NEU", "VERSENDET_OFFEN", "AUFTRAG", "VERLOREN", "VERWORFEN",
] as const;
export type AngebotStatus = (typeof ANGEBOT_STATUS_VALUES)[number];

export const ANGEBOT_STATUS_LABEL: Record<AngebotStatus, string> = {
  NEU: "Neu",
  VERSENDET_OFFEN: "Versendet / offen",
  AUFTRAG: "Auftrag",
  VERLOREN: "Verloren",
  VERWORFEN: "Verworfen",
};

export const ANGEBOT_STATUS = ANGEBOT_STATUS_VALUES.map((value) => ({
  value,
  label: ANGEBOT_STATUS_LABEL[value],
}));

export const ANGEBOT_STATUS_TONE: Record<AngebotStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  NEU: "neutral",
  VERSENDET_OFFEN: "blue",
  AUFTRAG: "green",
  VERLOREN: "red",
  VERWORFEN: "amber",
};
