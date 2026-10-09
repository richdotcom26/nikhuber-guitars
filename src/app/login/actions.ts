"use server";

import { headers } from "next/headers";
import { sendePasswortLink } from "@/lib/domain/benutzer";

/** „Passwort vergessen": Link geht an die Adresse, unter der die App gerade aufgerufen wurde. */
export async function passwortVergessenAction(email: string): Promise<void> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  await sendePasswortLink(email, host ? `${proto}://${host}` : "");
}
