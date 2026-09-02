import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "./app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-page">
      <AppNav email={user.email ?? null} />
      <main className="mx-auto max-w-[1600px] px-4 py-8">{children}</main>
    </div>
  );
}
