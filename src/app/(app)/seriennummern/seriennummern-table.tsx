"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { SortSpec } from "@/lib/table-sort";
import { formatDate } from "@/lib/utils";

export interface SeriennummerRow {
  id: string;
  anzeige: string | null;
  lfd: number;
  manuell: boolean;
  vergebenAm: string | Date | null;
  auftragId: string | null;
  auftragNummer: string | null;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kdOrt: string | null;
  modellName: string | null;
}

export function SeriennummernTable({
  rows, sort, query,
}: {
  rows: SeriennummerRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<SeriennummerRow>[] = [
    {
      key: "lfd", header: "lfd", sortable: true, firstDir: "desc", align: "right",
      className: "tabular-nums text-muted",
      cell: (r) => r.lfd,
    },
    {
      key: "anzeige", header: "Seriennummer", sortable: true, hideable: false, className: "font-mono font-medium",
      cell: (r) => r.anzeige ?? "–",
    },
    {
      key: "vergabe", header: "Vergabe", sortable: true,
      cell: (r) => (r.manuell ? <Badge tone="amber">manuell</Badge> : <Badge tone="neutral">auto</Badge>),
    },
    {
      key: "modell", header: "Modell", sortable: true,
      cell: (r) => <span className="text-muted">{r.modellName ?? "–"}</span>,
    },
    {
      key: "kunde", header: "Kunde", sortable: true,
      cell: (r) => {
        const kunde = r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || null;
        return kunde ? `${kunde}${r.kdOrt ? ` (${r.kdOrt})` : ""}` : "–";
      },
    },
    {
      key: "vergebenAm", header: "vergeben am", sortable: true, firstDir: "desc", className: "text-muted",
      cell: (r) => formatDate(r.vergebenAm),
    },
    {
      key: "auftrag", header: "Auftrag", sortable: true, className: "font-mono text-xs",
      cell: (r) => (r.auftragId
        ? <Link href={`/auftraege/${r.auftragId}`} className="text-brand hover:underline">{r.auftragNummer}</Link>
        : "–"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/seriennummern"
      query={query}
      storageKey="seriennummern"
      empty="Keine Seriennummern."
    />
  );
}
