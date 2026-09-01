import {
  integer, numeric, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { artikel } from "./artikel";

/**
 * §9 Neuentwurf-Module: Bauplanung (E14) + Kalkulation (E12).
 * Reporting (E11) = nur Views/Materialized Views — hier keine Tabelle außer `report_monat`
 * (nächtlich per Vercel-Cron befüllt), Struktur beim Bau festlegen.
 */

/** Ex Modellgruppen (OD) — Kapazitätsbänder je Modellfamilie. */
export const modellgruppe = pgTable("modellgruppe", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),               // "Krautster", "Dolphin", "Orca 59", …
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
