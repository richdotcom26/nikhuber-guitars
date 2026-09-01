import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js lädt .env.local automatisch, drizzle-kit (plain Node) nicht.
config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Drizzle-Kit-Konfiguration.
 * DATABASE_URL: Supabase → Project Settings → Database → Connection string.
 *  - Migrations/Studio: der DIREKTE Connection-String (Port 5432) — nicht der Pooler.
 *  - Zur Laufzeit (Vercel Functions): der Transaction-Pooler (Port 6543) via DATABASE_URL in lib/db.
 */
export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
