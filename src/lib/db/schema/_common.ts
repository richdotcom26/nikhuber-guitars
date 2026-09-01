import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Audit-Spalten für alle Tabellen (ZIELMODELL §2).
 * created_by / updated_by sind uuid und FKen auf app_user.id — die Referenz wird in
 * `relations` verdrahtet (nicht als Spalten-.references()), um Import-Zyklen zu vermeiden.
 */
export const auditCols = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
};

/** Zusätzlich `deleted_at` für Stammdaten mit Soft-Delete. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * CHECK-Ausdruck "genau eine der übergebenen Spalten ist gesetzt".
 * Verwendung im 2. pgTable-Argument:
 *   oneParent: check("beleg_position_one_parent", oneOf(t.angebotId, t.auftragId, t.rechnungId))
 */
export const oneOf = (...cols: unknown[]) =>
  sql.join(
    cols.map((c) => sql`(${c} IS NOT NULL)::int`),
    sql` + `,
  ).append(sql` = 1`);
