"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { artikelName, gruppeLabel } from "@/lib/artikel-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatMoney } from "@/lib/utils";

export interface ArtikelRow {
  id: string;
  artikelNr: string | null;
  artikelgruppe: string;
  artikeltyp: string | null;
  nameBelege: string | null;
  nameLang: string | null;
  nameKurz: string | null;
  vkEur: string | null;
  vkUs: string | null;
  geschuetztesHolzCites: boolean | null;
  datensatzInaktiv: boolean | null;
}

export function ArtikelTable({
  rows, sort, query,
}: {
  rows: ArtikelRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<ArtikelRow>[] = [
    {
      key: "gruppe", header: "Gruppe", sortable: true,
      cell: (r) => <Badge>{gruppeLabel(r.artikelgruppe)}</Badge>,
    },
    {
      key: "name", header: "Name", sortable: true, hideable: false, className: "font-medium",
      cell: (r) => <span className="hover:underline">{artikelName(r)}</span>,
    },
    {
      key: "nr", header: "Nr", sortable: true, className: "font-mono text-xs text-muted",
      cell: (r) => r.artikelNr ?? "–",
    },
    {
      key: "typ", header: "Typ", sortable: true,
      cell: (r) => (
        <span className="text-muted">
          {r.artikeltyp === "HOLZ" ? "Holz" : r.artikeltyp === "HANDELSWARE" ? "Handel" : "–"}
        </span>
      ),
    },
    {
      key: "vkEur", header: "VK EUR", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.vkEur),
    },
    {
      key: "vkUs", header: "VK US", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.vkUs, "USD"),
    },
    {
      key: "cites", header: "CITES", sortable: true,
      cell: (r) => (r.geschuetztesHolzCites ? "⚠︎" : ""),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/artikel"
      query={query}
      storageKey="artikel"
      empty="Keine Treffer."
      rowHref={(r) => `/artikel/${r.id}`}
      rowClassName={(r) => (r.datensatzInaktiv ? "opacity-50" : "")}
    />
  );
}
