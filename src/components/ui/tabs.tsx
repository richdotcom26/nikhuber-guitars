import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
}

/**
 * URL-getriebene Tab-Leiste (Server-Component-tauglich).
 * Der aktive Tab steht in `?<param>=<key>`; die Seite liest ihn aus `searchParams`.
 */
export function Tabs({
  items,
  active,
  param = "tab",
  basePath,
  className,
}: {
  items: readonly TabItem[];
  active: string;
  param?: string;
  basePath: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1 border-b border-line", className)}>
      {items.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={`${basePath}?${param}=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-brand font-semibold text-brand"
                : "border-transparent text-muted hover:text-navy",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
