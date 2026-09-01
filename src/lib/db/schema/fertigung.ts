import {
  boolean, integer, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { schrittStatusEnum, vorratGruppeEnum, vorratTypEnum } from "./_enums";
import { auftrag } from "./belege";
import { appUser } from "./users";

/**
 * §3.6 Fertigung.
 * `arbeitsschritt_vorrat` = Schritt-Katalog (ex PB).
 * `arbeitsschritt`        = konkrete Schritte je Auftrag (ex D).
 *
 * `ThisNext` (nächster offener Schritt) ist ABGELEITET (View/Service, 7s/7t) — nicht gespeichert.
 * Status-Kaskaden → Service `/lib/domain/fertigung` (7g + 7s).
 */

export const arbeitsschrittVorrat = pgTable("arbeitsschritt_vorrat", {
  id: uuid("id").primaryKey().defaultRandom(),
  nr: integer("nr").notNull().unique(),      // 81 Montage · 84 Reparatur · 93 Cites · 94 F&W · 95 Rechnung · 96 Ausfuhr · 99 Versendet
  workstep: text("workstep").notNull(),
  workstepEn: text("workstep_en"),
  reihenfolge: integer("reihenfolge").notNull(), // "Order" (29 = Kiste packen — Sonderfall 7h/7s/7t)
  typ: vorratTypEnum("typ"),                 // WERKSTATT | OFFICE
  part: text("part"),                        // Zeilen-Label
  partFarbe: text("part_farbe"),             // Farb-Banding (7u)
  gruppe: vorratGruppeEnum("gruppe"),        // grobe Phase
});

export const arbeitsschritt = pgTable("arbeitsschritt", {
  id: uuid("id").primaryKey().defaultRandom(),
  auftragId: uuid("auftrag_id").notNull().references(() => auftrag.id, { onDelete: "cascade" }),
  vorratId: uuid("vorrat_id").notNull().references(() => arbeitsschrittVorrat.id),
  status: schrittStatusEnum("status").default("OFFEN").notNull(),
  erledigtAm: timestamp("erledigt_am", { withTimezone: true }),
  erledigtVonId: uuid("erledigt_von_id").references(() => appUser.id), // ex 'MA', kein Freitext (7r)
  bemerkungBearbeiter: text("bemerkung_bearbeiter"),
  wartenAuf: text("warten_auf"),             // TODO: an app_user / kleine Partnerliste koppeln (7r)
  dauerMinuten: integer("dauer_minuten"),    // E13: optionale manuelle Zeiterfassung
  ...auditCols,
});
