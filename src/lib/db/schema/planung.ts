import {
  boolean, date, index, integer, numeric, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { todoPrioEnum, todoStatusEnum } from "./_enums";
import { artikel } from "./artikel";
import { auftrag } from "./belege";

/**
 * §9 Neuentwurf-Module: Bauplanung (E14) + Kalkulation (E12).
 * Reporting (E11) = nur Views/Materialized Views — hier keine Tabelle außer `report_monat`
 * (nächtlich per Vercel-Cron befüllt), Struktur beim Bau festlegen.
 */

/** Ex Modellgruppen (OD) — Kapazitätsbänder je Modellfamilie. */
export const modellgruppe = pgTable("modellgruppe", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),               // "Krautster", "Dolphin", "Orca 59", …
  farbe: text("farbe"),                                // Hex-Hintergrund für Badges (aus Ninox-Label)
  minMengeMonat: integer("min_menge_monat"),
  maxMengeMonat: integer("max_menge_monat"),
  durchschnittspreisEur: numeric("durchschnittspreis_eur", { precision: 12, scale: 2 }),
  durchschnittspreisUsd: numeric("durchschnittspreis_usd", { precision: 12, scale: 2 }),
  ...auditCols,
});

/** §9.2 Kalkulation je Modell (1:1 zu artikel mit artikelgruppe=MODEL). */
export const modellKalkulation = pgTable("modell_kalkulation", {
  artikelId: uuid("artikel_id").primaryKey().references(() => artikel.id, { onDelete: "cascade" }),
  kleinteilePauschale: numeric("kleinteile_pauschale", { precision: 12, scale: 2 }),
  planArbeitsstunden: numeric("plan_arbeitsstunden", { precision: 8, scale: 2 }),
  // material_kosten / arbeits_kosten / produktionskosten / db_net1 / db_net2 / db_vk
  //   = GENERATED bzw. View (§9.2)
  ...auditCols,
});

/**
 * ToDo-Board — ex Ninox TE „ToDo". Pro-Mitarbeiter-Aufgaben mit Absender/Empfänger
 * (beide app_user mit kann_todo). Verknüpfung „zu Auftrag" optional.
 */
export const todo = pgTable("todo", {
  id: uuid("id").primaryKey().defaultRandom(),
  aufgabe: text("aufgabe").notNull(),
  empfaengerId: uuid("empfaenger_id"),          // -> app_user (relations)
  absenderId: uuid("absender_id"),              // -> app_user (relations)
  aktuellBeiId: uuid("aktuell_bei_id"),         // -> app_user: in wessen Eingang die Aufgabe gerade liegt
  prio: todoPrioEnum("prio").default("GELEGENTLICH").notNull(),
  status: todoStatusEnum("status").default("BESTELLUNG").notNull(),
  auftragId: uuid("auftrag_id").references(() => auftrag.id, { onDelete: "set null" }),
  faelligBis: date("faellig_bis"),
  inArbeitSeit: date("in_arbeit_seit"),
  erledigtAm: date("erledigt_am"),
  erinnerung: boolean("erinnerung").default(false).notNull(),
  ...auditCols,
}, (t) => ({
  empfaengerIdx: index("todo_empfaenger_idx").on(t.empfaengerId),
  aktuellBeiIdx: index("todo_aktuell_bei_idx").on(t.aktuellBeiId),
  statusIdx: index("todo_status_idx").on(t.status),
}));

/** Konversation zu einer Aufgabe: Kommentare, Rückfragen und Status-Einträge. */
export const todoKommentar = pgTable("todo_kommentar", {
  id: uuid("id").primaryKey().defaultRandom(),
  todoId: uuid("todo_id").notNull().references(() => todo.id, { onDelete: "cascade" }),
  autorId: uuid("autor_id"),                    // -> app_user (relations)
  text: text("text"),                           // null bei reinem Status-Eintrag
  statusNachher: todoStatusEnum("status_nachher"), // gesetzt, wenn der Eintrag eine Statusänderung begleitet
  weitergabeAnId: uuid("weitergabe_an_id"),     // gesetzt bei „Antworten" — Ball ging an diese Person
  ...auditCols,
}, (t) => ({
  todoIdx: index("todo_kommentar_todo_idx").on(t.todoId),
}));

/** §9.1 Monatsreport — Struktur je nach KPI-Katalog (7z); befüllt per Cron. Platzhalter. */
export const reportMonat = pgTable("report_monat", {
  monat: text("monat").primaryKey(),                   // 'YYYY-MM'
  anzahlGitarren: integer("anzahl_gitarren"),
  umsatzGitarrenEur: numeric("umsatz_gitarren_eur", { precision: 14, scale: 2 }),
  umsatzGitarrenUsd: numeric("umsatz_gitarren_usd", { precision: 14, scale: 2 }),
  umsatzNonGuitarEur: numeric("umsatz_non_guitar_eur", { precision: 14, scale: 2 }),
  skontoEur: numeric("skonto_eur", { precision: 14, scale: 2 }),
  stornoEur: numeric("storno_eur", { precision: 14, scale: 2 }),
  umsatzGesamtEur: numeric("umsatz_gesamt_eur", { precision: 14, scale: 2 }),
  umsatzKumuliertEur: numeric("umsatz_kumuliert_eur", { precision: 14, scale: 2 }),
  kostendeckungMonatEur: numeric("kostendeckung_monat_eur", { precision: 14, scale: 2 }),
  kostenzielMonatEur: numeric("kostenziel_monat_eur", { precision: 14, scale: 2 }),
  // … weitere KPIs (7z) — TODO
});
