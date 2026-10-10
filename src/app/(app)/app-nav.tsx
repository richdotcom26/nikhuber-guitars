"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, NAV_GRUPPEN } from "@/lib/nav";
import { NavGruppe } from "./nav-gruppe";
import { logoutAction } from "./konto/actions";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, label, muted }: { href: string; label: string; muted?: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-button text-primary-fg shadow-sm"
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
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4">
        <div className="flex items-center gap-3 py-2.5">
          <Link href="/todo" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-button text-[13px] font-bold text-primary-fg">
              NH
            </span>
            <span className="text-sm font-semibold tracking-tight text-navy">Nik Huber Guitars</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/einstellungen"
              title="Einstellungen"
              aria-label="Einstellungen"
              className={cn(
                "grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-brand-soft hover:text-brand",
                isActive(pathname, "/einstellungen") ? "bg-button text-primary-fg" : "text-muted",
              )}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>
            <Link
              href="/konto"
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors hover:bg-brand-soft hover:text-brand",
                isActive(pathname, "/konto") ? "text-brand" : "text-muted",
              )}
            >
              {email ?? "Konto"}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-soft hover:text-brand"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 pb-2.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} />
          ))}
          {NAV_GRUPPEN.map((g) => <NavGruppe key={g.label} label={g.label} items={g.items} />)}
        </nav>
      </div>
    </header>
  );
}
