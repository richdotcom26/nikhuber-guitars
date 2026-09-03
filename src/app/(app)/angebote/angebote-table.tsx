"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { kundeKurz } from "@/lib/adressen-shared";
import {
  ANGEBOT_STATUS_LABEL, ANGEBOT_STATUS_TONE, type AngebotStatus,
} from "@/lib/angebot-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatDate, formatMoney } from "@/lib/utils";

export interface AngebotRow {
  id: string;
  nummer: string;
  status: string;
  angebotsdatum: string | null;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kdWaehrung: string | null;
  summeNetto: string | null;
  modellName: string | null;
  kurzname: string | null;
  firma: string | null;
}

export function AngeboteTable({
  rows, sort, query,
}: {
  rows: AngebotRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<AngebotRow>[] = [
    {
      key: "nummer", header: "Nr", sortable: true, hideable: false, className: "font-mono text-xs",
      cell: (r) => <span className="font-medium hover:underline">{r.nummer}</span>,
    },
    {
      key: "datum", header: "Datum", sortable: true, firstDir: "desc",
      cell: (r) => <span className="text-muted">{formatDate(r.angebotsdatum)}</span>,
    },
    {
      key: "kunde", header: "Kunde", sortable: true,
      cell: (r) => kundeKurz(r),
    },
    {
      key: "modell", header: "Modell", sortable: true,
      cell: (r) => <span className="text-muted">{r.modellName ?? "–"}</span>,
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (r) => (
        <Badge tone={ANGEBOT_STATUS_TONE[r.status as AngebotStatus] ?? "neutral"}>
          {ANGEBOT_STATUS_LABEL[r.status as AngebotStatus] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "waehrung", header: "Whg", sortable: true,
      cell: (r) => r.kdWaehrung ?? "–",
    },
    {
      key: "netto", header: "Summe netto", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.summeNetto, r.kdWaehrung === "USD" ? "USD" : "EUR"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/angebote"
      query={query}
      storageKey="angebote"
      empty="Keine Angebote."
      rowHref={(r) => `/angebote/${r.id}`}
    />
  );
}
