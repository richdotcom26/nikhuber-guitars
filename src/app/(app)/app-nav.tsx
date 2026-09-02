"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, NAV_VERWALTUNG } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand text-white shadow-sm"
          : muted
            ? "text-muted hover:bg-brand-soft hover:text-brand"
            : "text-ink/75 hover:bg-brand-soft hover:text-brand",
      )}
    >
      {label}
    </Link>
  );
}

export function AppNav({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4">
        <div className="flex items-center gap-3 py-2.5">
          <Link href="/todo" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-[13px] font-bold text-white">
              NH
            </span>
            <span className="text-sm font-semibold tracking-tight text-navy">Nik Huber Guitars</span>
          </Link>
          <span className="ml-auto text-xs text-muted">{email}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 pb-2.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} />
          ))}
          <span className="mx-2 h-5 w-px bg-line" />
          {NAV_VERWALTUNG.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} muted />
          ))}
        </nav>
      </div>
    </header>
  );
}
