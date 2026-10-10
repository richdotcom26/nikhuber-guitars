"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Aufklapp-Register „Weitere“ / „Verwaltung“: Klick öffnet die Unterregister, Klick daneben oder Navigation schließt. */
export function NavGruppe({ label, items }: { label: string; items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const aktiv = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  useEffect(() => {
    if (!offen) return;
    const zu = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOffen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOffen(false); };
    document.addEventListener("mousedown", zu);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", zu); document.removeEventListener("keydown", esc); };
  }, [offen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={offen}
        onClick={() => setOffen((o) => !o)}
        className={cn(
          "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
          aktiv ? "bg-button text-primary-fg shadow-sm" : "text-ink/75 hover:bg-brand-soft hover:text-brand",
        )}
      >
        {/* aktives Unterregister im Knopf anzeigen, damit man sieht, wo man ist */}
        {aktiv ? `${label}: ${aktiv.label}` : label}
        <span className={cn("text-[10px] transition-transform", offen && "rotate-180")}>▾</span>
      </button>
      {offen ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-52 rounded-lg border border-line bg-surface p-1 shadow-lg">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOffen(false)}
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                i === aktiv ? "bg-brand-soft font-medium text-brand" : "text-ink hover:bg-brand-soft hover:text-brand",
              )}
            >
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
