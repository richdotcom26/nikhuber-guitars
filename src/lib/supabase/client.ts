import { createBrowserClient } from "@supabase/ssr";

/** Supabase-Client fürs Browser (Client Components) — nur Auth-UI/Session. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
