/** Client-sichere ToDo-Konstanten (kein DB-Zugriff). */

export const TODO_STATUS_VALUES = ["BESTELLUNG", "IN_ARBEIT", "KLAEREN", "ERLEDIGT"] as const;
export type TodoStatus = (typeof TODO_STATUS_VALUES)[number];

export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  BESTELLUNG: "Bestellung",
  IN_ARBEIT: "In Arbeit",
  KLAEREN: "Klären",
  ERLEDIGT: "Erledigt",
};
export const TODO_STATUS = TODO_STATUS_VALUES.map((value) => ({ value, label: TODO_STATUS_LABEL[value] }));
export const TODO_STATUS_TONE: Record<TodoStatus, "neutral" | "blue" | "green" | "amber" | "red"> = {
  BESTELLUNG: "blue",
  IN_ARBEIT: "amber",
  KLAEREN: "red",
  ERLEDIGT: "green",
};

export const TODO_PRIO_VALUES = ["DRINGEND", "GELEGENTLICH"] as const;
export type TodoPrio = (typeof TODO_PRIO_VALUES)[number];

export const TODO_PRIO_LABEL: Record<TodoPrio, string> = {
  DRINGEND: "dringend",
  GELEGENTLICH: "gelegentlich",
};
export const TODO_PRIO = TODO_PRIO_VALUES.map((value) => ({ value, label: TODO_PRIO_LABEL[value] }));
