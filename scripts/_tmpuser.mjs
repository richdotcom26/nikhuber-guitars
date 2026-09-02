import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const EMAIL = "verify+claude@nikhuber.local";
const PW = "verify-" + Math.random().toString(36).slice(2, 10) + "A1!";
if (process.argv[2] === "create") {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PW, email_confirm: true });
  if (error) { console.error(error); process.exit(1); }
  await sql`insert into app_user (id, name, email, rolle, aktiv) values (${data.user.id}, 'Verify Bot', ${EMAIL}, 'ADMIN', true) on conflict (id) do nothing`;
  console.log("PW=" + PW);
} else { const { data } = await admin.auth.admin.listUsers(); const u = data.users.find((x) => x.email === EMAIL); if (u) { await sql`delete from app_user where id = ${u.id}`; await admin.auth.admin.deleteUser(u.id); console.log("deleted"); } }
await sql.end(); process.exit(0);
