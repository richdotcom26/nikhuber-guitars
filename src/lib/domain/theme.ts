import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { theme } from "@/lib/db/schema";
import { THEME_FELDER, type ThemeFarben, istFarbe, themeCss } from "@/lib/theme-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

/**
 * CSS des aktiven Themes für das Root-Layout (auch Login-Seite → ohne Anmeldung lesbar;
 * liefert nur Farbwerte). Fehler → leerer String (Standardfarben aus globals.css).
 * `connection()`: nie beim Build vorrendern — sonst wäre das Theme auf statischen Seiten
 * (Login, Passwort setzen) bis zum nächsten Deploy eingefroren.
 */
export const aktivesThemeCss = cache(async (): Promise<string> => {
  await connection();
  try {
    const [t] = await db.select({ farben: theme.farben }).from(theme).where(eq(theme.aktiv, true));
    return t ? themeCss(t.farben) : "";
  } catch {
    return "";
  }
});

export async function listThemes() {
  await requireUser();
  return db.select().from(theme).orderBy(asc(theme.name));
}

const farbe = z.string().trim().refine(istFarbe, "Keine gültige Farbe (z. B. #109DA8 oder rgba(16,157,168,.24)).");

export const themeSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt."),
  ...Object.fromEntries(THEME_FELDER.map((f) => [f.key, farbe])) as Record<keyof ThemeFarben, typeof farbe>,
});

/** Anlegen oder ändern. Gibt die ID zurück. */
export async function saveTheme(id: string | null, input: z.infer<typeof themeSchema>): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const { name, ...rest } = input;
  const farben = Object.fromEntries(THEME_FELDER.map((f) => [f.key, (rest as Record<string, string>)[f.key]]));
  if (id) {
    const res = await db.update(theme)
      .set({ name, farben, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(theme.id, id))
      .returning({ id: theme.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Theme nicht gefunden.");
    return id;
  }
  const [row] = await db.insert(theme)
    .values({ name, farben, createdBy: user.id, updatedBy: user.id })
    .returning({ id: theme.id });
  return row.id;
}

/** Theme für alle Benutzer aktivieren (genau eins aktiv). */
export async function aktiviereTheme(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  await db.transaction(async (tx) => {
    await tx.update(theme).set({ aktiv: false }).where(eq(theme.aktiv, true));
    const res = await tx.update(theme)
      .set({ aktiv: true, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(theme.id, id))
      .returning({ id: theme.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Theme nicht gefunden.");
  });
}

export async function dupliziereTheme(id: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const [t] = await db.select().from(theme).where(eq(theme.id, id));
  if (!t) throw new DomainError("NOT_FOUND", "Theme nicht gefunden.");
  const [row] = await db.insert(theme)
    .values({ name: `${t.name} (Kopie)`, farben: t.farben, createdBy: user.id, updatedBy: user.id })
    .returning({ id: theme.id });
  return row.id;
}

export async function loescheTheme(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const [t] = await db.select({ aktiv: theme.aktiv }).from(theme).where(eq(theme.id, id));
  if (!t) throw new DomainError("NOT_FOUND", "Theme nicht gefunden.");
  if (t.aktiv) throw new DomainError("STATE", "Das aktive Theme kann nicht gelöscht werden.");
  await db.delete(theme).where(eq(theme.id, id));
}
