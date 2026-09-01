/**
 * Legt für einen bereits in Supabase-Auth angelegten Benutzer das app_user-Profil an.
 *
 *   node scripts/seed-user.mjs <email> [rolle]
 *
 * rolle: ADMIN | BUERO | WERKSTATT   (Default: ADMIN für den ersten Benutzer)
 *
 * Voraussetzung: Benutzer in Supabase → Authentication → Users → Add user angelegt.
 * Braucht SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL + DATABASE_URL_DIRECT aus .env.local.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

config({ path: ".env.local" });

const [email, rolle = "ADMIN"] = process.argv.slice(2);
if (!email) {
  console.error("Aufruf: node scripts/seed-user.mjs <email> [ADMIN|BUERO|WERKSTATT]");
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`Kein Auth-Benutzer mit E-Mail ${email}. Erst in Supabase → Authentication anlegen.`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL_DIRECT, { prepare: false, max: 1 });
const name = email.split("@")[0];
const initialen = name.slice(0, 3).toUpperCase();
await sql`
  insert into app_user (id, name, email, rolle, initialen)
  values (${user.id}, ${name}, ${email}, ${rolle}, ${initialen})
  on conflict (id) do update set email = excluded.email, rolle = excluded.rolle
`;
await sql.end();
console.log(`app_user ok: ${email} (${rolle}), id=${user.id}`);
