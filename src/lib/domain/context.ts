import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appUser } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { DomainError } from "./errors";

export type Rolle = "ADMIN" | "BUERO" | "WERKSTATT";

export interface CurrentUser {
  /** app_user.id === auth.users.id (1:1-Profil). Für Audit-Spalten (created_by/updated_by). */
  id: string;
  email: string;
  name: string;
  rolle: Rolle;
  aktiv: boolean;
}

/**
 * Angemeldeten Benutzer + Profil laden. Wirft, wenn nicht angemeldet oder ohne `app_user`-Profil.
 * `cache()` dedupliziert den Aufruf innerhalb eines Requests.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new DomainError("UNAUTHENTICATED", "Nicht angemeldet.");

  const row = await db.query.appUser.findFirst({ where: eq(appUser.id, user.id) });
  if (!row) {
    throw new DomainError(
      "FORBIDDEN",
      `Kein Benutzerprofil für ${user.email}. Anlegen: node scripts/seed-user.mjs ${user.email} ADMIN`,
    );
  }
  if (!row.aktiv) throw new DomainError("FORBIDDEN", "Benutzerkonto ist deaktiviert.");

  return { id: row.id, email: row.email, name: row.name, rolle: row.rolle, aktiv: row.aktiv };
});

/** Wirft `FORBIDDEN`, wenn der Benutzer keine der erlaubten Rollen hat. */
export function assertRolle(user: CurrentUser, ...erlaubt: Rolle[]): void {
  if (!erlaubt.includes(user.rolle)) {
    throw new DomainError("FORBIDDEN", `Aktion erfordert Rolle: ${erlaubt.join(" / ")}.`);
  }
}
