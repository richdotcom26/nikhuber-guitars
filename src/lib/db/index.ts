import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle-Client gegen Supabase Postgres.
 * DATABASE_URL = Transaction-Pooler (Port 6543) für serverlose Umgebungen (Vercel).
 * Datenzugriff ausschließlich serverseitig (Route Handler / Server Actions / /lib/domain).
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL fehlt (siehe .env.example)");
}

// prepare:false wird für den Supabase Transaction-Pooler empfohlen.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
