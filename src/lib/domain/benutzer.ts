import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUser } from "@/lib/db/schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

const ROLLEN = ["ADMIN", "BUERO", "WERKSTATT"] as const;

/* --------------------------------------------------------------------- liste */

export async function listBenutzer() {
  const user = await requireUser();
  assertRolle(user, "ADMIN");

  const rows = await db.select().from(appUser).orderBy(asc(sql`lower(${appUser.name})`));

  // Auth-Konten abgleichen (welche app_user können sich anmelden?)
  const mitLogin = new Set<string>();
  try {
    const { data } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data.users) mitLogin.add(u.id);
  } catch {
    // Storage/Auth nicht erreichbar -> Flag bleibt false
  }

  return rows.map((r) => ({ ...r, hatLogin: mitLogin.has(r.id), istIch: r.id === user.id }));
}

/* ------------------------------------------------------------------- schema */

const emailSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.email("Ungültige E-Mail."),
);
const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const benutzerNeuSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Name fehlt."),
  rolle: z.enum(ROLLEN),
  kannTodo: boolFlag,
  kannWerkstatt: boolFlag,
});
export type BenutzerNeuInput = z.infer<typeof benutzerNeuSchema>;

export const benutzerPatchSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt."),
  rolle: z.enum(ROLLEN),
  aktiv: boolFlag,
  kannTodo: boolFlag,
  kannWerkstatt: boolFlag,
  initialen: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase().slice(0, 4) : null),
    z.string().nullable(),
  ),
});
export type BenutzerPatchInput = z.infer<typeof benutzerPatchSchema>;

/* ------------------------------------------------------------------ mutationen */

/** Neuen Benutzer anlegen: Auth-Konto (ohne Passwort) + app_user-Profil. Gibt den Recovery-Link zurück. */
export async function createBenutzer(input: BenutzerNeuInput): Promise<{ id: string; link: string | null }> {
  const me = await requireUser();
  assertRolle(me, "ADMIN");

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new DomainError("CONFLICT", error?.message ?? "Auth-Konto konnte nicht angelegt werden.");
  }

  try {
    await db.insert(appUser).values({
      id: data.user.id,
      email: input.email,
      name: input.name,
      rolle: input.rolle,
      aktiv: true,
      kannTodo: input.kannTodo,
      kannWerkstatt: input.kannWerkstatt,
      createdBy: me.id,
      updatedBy: me.id,
    });
  } catch (e) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw e instanceof DomainError ? e : new DomainError("CONFLICT", "Profil konnte nicht angelegt werden (E-Mail schon vergeben?).");
  }

  const link = await recoveryLinkFuer(input.email).catch(() => null);
  return { id: data.user.id, link };
}

export async function updateBenutzer(id: string, patch: BenutzerPatchInput) {
  const me = await requireUser();
  assertRolle(me, "ADMIN");

  // Selbst-Aussperrung / letzten aktiven Admin schützen
  if (!patch.aktiv || patch.rolle !== "ADMIN") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(appUser)
      .where(sql`${appUser.rolle} = 'ADMIN' and ${appUser.aktiv} = true and ${appUser.id} <> ${id}`);
    if (n === 0) throw new DomainError("STATE", "Es muss mindestens ein aktiver Admin bleiben.");
  }

  const res = await db
    .update(appUser)
    .set({ ...patch, updatedAt: new Date(), updatedBy: me.id })
    .where(eq(appUser.id, id))
    .returning({ id: appUser.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Benutzer nicht gefunden.");
}

/** Passwort-Reset-Link (Recovery) erzeugen — Admin leitet ihn an den Benutzer weiter. */
export async function benutzerRecoveryLink(id: string): Promise<string> {
  const me = await requireUser();
  assertRolle(me, "ADMIN");
  const [row] = await db.select({ email: appUser.email }).from(appUser).where(eq(appUser.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Benutzer nicht gefunden.");
  return recoveryLinkFuer(row.email);
}

async function recoveryLinkFuer(email: string): Promise<string> {
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/auth/reset`
    : undefined;
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({
    type: "recovery",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error || !data.properties?.action_link) {
    throw new DomainError("STATE", error?.message ?? "Recovery-Link konnte nicht erzeugt werden.");
  }
  return data.properties.action_link;
}
