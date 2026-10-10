"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendePasswortLink } from "@/lib/domain/benutzer";

/** „Passwort vergessen": Link geht an die Adresse, unter der die App gerade aufgerufen wurde. */
export async function passwortVergessenAction(email: string): Promise<void> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  await sendePasswortLink(email, host ? `${proto}://${host}` : "");
}

/**
 * Anmeldung serverseitig (funktioniert auch, wenn im Browser kein JavaScript läuft — z. B. ältere iPads).
 * Fehler → zurück zur Anmeldeseite mit Hinweis; Erfolg → Zielseite.
 */
export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const passwort = String(formData.get("passwort") ?? "");
  const next = String(formData.get("next") ?? "");
  const ziel = next.startsWith("/") && !next.startsWith("//") ? next : "/todo";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
  if (error) {
    const p = new URLSearchParams({ fehler: "1", email });
    if (next) p.set("next", next);
    redirect(`/login?${p.toString()}`);
  }
  redirect(ziel);
}
