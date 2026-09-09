"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import { requireUser } from "@/lib/domain/context";
import { createClient } from "@/lib/supabase/server";

/** Abmelden: Supabase-Session beenden, zurück zur Anmeldung. */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const passwortSchema = z
  .object({
    aktuell: z.string().min(1, "Bitte das aktuelle Passwort eingeben."),
    neu: z.string().min(8, "Mindestens 8 Zeichen."),
    wiederholen: z.string(),
  })
  .refine((v) => v.neu === v.wiederholen, {
    message: "Die neuen Passwörter stimmen nicht überein.",
    path: ["wiederholen"],
  });

/** Eigenes Passwort ändern (mit Prüfung des aktuellen Passworts). */
export async function changePasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser();
    const input = parseForm(passwortSchema, fd);

    const supabase = await createClient();
    const { error: reauth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.aktuell,
    });
    if (reauth) return fail("Das aktuelle Passwort ist falsch.");

    const { error } = await supabase.auth.updateUser({ password: input.neu });
    if (error) return fail(error.message);

    return ok("Passwort geändert.");
  });
}
