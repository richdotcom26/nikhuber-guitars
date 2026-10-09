"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabellenzeile, die als Ganzes den Datensatz öffnet (wie in DataTable): Klick irgendwo in die Zeile,
 * Strg/Cmd+Klick in neuem Tab. Klicks auf Links/Bedienelemente in der Zeile und Textmarkierung bleiben unberührt.
 */
export function LinkRow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={cn("cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-brand-soft/50", className)}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("a, button, input, select, textarea, label, form")) return;
        if (window.getSelection()?.toString()) return;
        if (e.ctrlKey || e.metaKey) window.open(href, "_blank");
        else router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
