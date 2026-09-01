import {
  boolean, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { rolleEnum } from "./_enums";

/**
 * §3.9 Benutzer. Ex Mitarbeiter (NB) + Ninox-User → EIN `app_user`.
 * Bei Supabase-Auth: `id` = auth.users.id (1:1-Profil). Login E-Mail/Passwort.
 * Der Selbst-Markier-Workaround (7r) entfällt — `erledigt_von` = angemeldeter Benutzer.
 */
export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey(),                 // = auth.users.id (Supabase)
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  aktiv: boolean("aktiv").default(true).notNull(),
  rolle: rolleEnum("rolle").default("WERKSTATT").notNull(),
  kannWerkstatt: boolean("kann_werkstatt").default(true).notNull(),  // ex NB.V (im Schritt-Picker)
  kannTodo: boolean("kann_todo").default(true).notNull(),            // ex NB.U
  initialen: text("initialen"),               // ex 'erfasst von' / 'MA'-Kürzel (Anzeige)
  ...auditCols,
});

/*
Verweise auf app_user (in relations verdrahten, nicht als Spalten-.references, um Zyklen zu meiden):
  - <alle Tabellen>.created_by / updated_by
  - arbeitsschritt.erledigt_von_id
  - seriennummer / auftrag / … Audit
RLS optional als Sicherheitsnetz; primäre Autorisierung im Service-Layer (/lib/domain).
*/
