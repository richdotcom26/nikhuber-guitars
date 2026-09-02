"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { SortSpec } from "@/lib/table-sort";

export interface Column<T> {
  key: string;
  header: string;
  /** Als Sortier-Link darstellen (Server sortiert über ?sort=key). */
  sortable?: boolean;
  /** Erste Klickrichtung auf dieser Spalte (Standard "asc"). */
  firstDir?: "asc" | "desc";
  /** Über die Spaltenauswahl aus-/einblendbar. */
  hideable?: boolean;
  /** Standardmäßig ausgeblendet. */
  defaultHidden?: boolean;
  align?: "left" | "right" | "center";
  /** th/td-Zusatzklassen (z. B. Breite). */
  className?: string;
  cell: (row: T) => React.ReactNode;
}

function buildHref(basePath: string, query: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

const alignCls = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  basePath,
  query = {},
  storageKey,
  empty = "Keine Einträge.",
  rowHref,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort: SortSpec;
  basePath: string;
  query?: Record<string, string | undefined>;
  storageKey: string;
  empty?: string;
  rowHref?: (row: T) => string;
  rowClassName?: (row: T) => string;
}) {
  const lsKey = `dt:${storageKey}`;
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const init = new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key));
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* leerer/blockierter Storage */ }
    return init;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(lsKey, JSON.stringify([...hidden])); } catch { /* ignore */ }
  }, [hidden, lsKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const toggle = (key: string) =>
    setHidden((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });

  const visible = columns.filter((c) => !hidden.has(c.key));
  const hideable = columns.filter((c) => c.hideable ?? true);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm hover:bg-brand-soft"
          >
            Spalten
            <span className="text-muted">▾</span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border border-line bg-white p-1.5 shadow-lg">
              {hideable.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={!hidden.has(c.key)}
                    onChange={() => toggle(c.key)}
                  />
                  {c.header}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-line bg-neutral-50/70 text-left text-[11px] font-medium uppercase tracking-wide text-muted">
            <tr>
              {visible.map((c) => {
                const active = sort.key === c.key;
                const nextDir = active ? (sort.dir === "asc" ? "desc" : "asc") : (c.firstDir ?? "asc");
                const th = (
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable ? (
                      <span className={cn("text-[10px]", active ? "text-brand" : "text-neutral-300")}>
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "▲"}
                      </span>
                    ) : null}
                  </span>
                );
                return (
                  <th
                    key={c.key}
                    className={cn("px-2.5 py-2.5 font-medium", c.align && alignCls[c.align], c.className)}
                  >
                    {c.sortable ? (
                      <Link
                        href={buildHref(basePath, query, { sort: c.key, dir: nextDir, page: undefined })}
                        className="hover:text-navy"
                      >
                        {th}
                      </Link>
                    ) : th}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-b border-line last:border-0 transition-colors hover:bg-brand-soft/50",
                    rowClassName?.(row),
                  )}
                >
                  {visible.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-2.5 py-2 align-middle", c.align && alignCls[c.align], c.className)}
                    >
                      {href && c === visible[0] ? (
                        <Link href={href} className="block">{c.cell(row)}</Link>
                      ) : c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visible.length} className="py-6 text-center text-neutral-400">{empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
