/** Client-sichere Ticket-Konstanten (kein DB-Zugriff). */

export const TICKET_TYP_VALUES = ["BUG", "WUNSCH", "FRAGE", "SONSTIGES"] as const;
export type TicketTyp = (typeof TICKET_TYP_VALUES)[number];
export const TICKET_TYP_LABEL: Record<TicketTyp, string> = {
  BUG: "Bug",
  WUNSCH: "Wunsch",
  FRAGE: "Frage",
  SONSTIGES: "Sonstiges",
};
export const TICKET_TYP = TICKET_TYP_VALUES.map((value) => ({ value, label: TICKET_TYP_LABEL[value] }));

export const TICKET_STATUS_VALUES = [
  "NEU", "IN_ARBEIT", "RUECKFRAGE", "ERLEDIGT", "ABGELEHNT",
] as const;
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  NEU: "Neu",
  IN_ARBEIT: "In Arbeit",
  RUECKFRAGE: "Rückfrage",
  ERLEDIGT: "Erledigt",
  ABGELEHNT: "Abgelehnt",
};
export const TICKET_STATUS = TICKET_STATUS_VALUES.map((value) => ({ value, label: TICKET_STATUS_LABEL[value] }));

/** Badge-Farbton je Status (siehe components/ui/badge). */
export const TICKET_STATUS_TON: Record<TicketStatus, "neutral" | "amber" | "green" | "red" | "blue"> = {
  NEU: "blue",
  IN_ARBEIT: "amber",
  RUECKFRAGE: "amber",
  ERLEDIGT: "green",
  ABGELEHNT: "neutral",
};

export const TICKET_PRIO_VALUES = ["NIEDRIG", "MITTEL", "HOCH"] as const;
export type TicketPrio = (typeof TICKET_PRIO_VALUES)[number];
export const TICKET_PRIO_LABEL: Record<TicketPrio, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
};
export const TICKET_PRIO = TICKET_PRIO_VALUES.map((value) => ({ value, label: TICKET_PRIO_LABEL[value] }));

/** Minuten → „1 h 20 min" / „45 min" / „–". */
export function formatAufwand(minuten: number | null | undefined): string {
  if (minuten == null || minuten <= 0) return "–";
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
