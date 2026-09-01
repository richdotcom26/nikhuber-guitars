import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NAV, NAV_VERWALTUNG } from "@/lib/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-[1600px] px-4">
          <div className="flex items-center gap-2 py-2 text-sm font-semibold">
            Nik Huber Guitars
            <span className="ml-auto text-xs font-normal text-neutral-500">{user.email}</span>
          </div>
          <nav className="flex flex-wrap gap-1 pb-2 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="rounded px-2 py-1 hover:bg-neutral-100">
                {n.label}
              </Link>
            ))}
            <span className="mx-2 w-px bg-neutral-200" />
            {NAV_VERWALTUNG.map((n) => (
              <Link key={n.href} href={n.href}
                className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6">{children}</main>
    </div>
  );
}
