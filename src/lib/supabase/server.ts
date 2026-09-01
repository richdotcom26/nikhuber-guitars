import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-Client für Server Components / Route Handler / Server Actions.
 * Nur für Auth (Session, User) und Storage — Datenzugriff läuft über Drizzle (lib/db).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // In Server Components ohne Response-Kontext: von der Middleware erledigt.
          }
        },
      },
    },
  );
}
