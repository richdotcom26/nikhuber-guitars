import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-Admin-Client (service_role) — nur serverseitig, umgeht RLS.
 * Für Storage (signierte URLs, Uploads) und Auth-Admin (Benutzerverwaltung).
 * NIEMALS an den Client geben.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase-Admin nicht konfiguriert (URL / SERVICE_ROLE_KEY).");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export const ANHANG_BUCKET = "anhaenge";
