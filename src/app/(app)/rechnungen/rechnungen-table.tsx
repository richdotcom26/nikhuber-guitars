"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { kundeKurz } from "@/lib/adressen-shared";
import {
  RG_BELEGART_LABEL, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatDate, formatMoney } from "@/lib/utils";

export interface RechnungRow {
  id: string;
  nummer: string;
  belegart: string;
  status: string;
  rechnungsdatum: string | null;
  zahlungsdatum: string | null;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kdWaehrung: string | null;
  summeBrutto: string | null;
  zahlungsstatus: string | null;
  kurzname: string | null;
  firma: string | null;
}

export function RechnungenTable({
  rows, sort, query,
}: {
  rows: RechnungRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<RechnungRow>[] = [
    {
      key: "nummer", header: "RG-Nr", sortable: true, hideable: false, className: "font-mono text-xs",
      cell: (r) => <span className="font-medium hover:underline">{r.nummer}</span>,
    },
    {
      key: "art", header: "Art", sortable: true,
      cell: (r) => <span className="text-muted">{RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}</span>,
    },
    {
      key: "datum", header: "Datum", sortable: true, firstDir: "desc",
      cell: (r) => <span className="text-muted">{formatDate(r.rechnungsdatum)}</span>,
    },
    {
      key: "kunde", header: "Kunde", sortable: true,
      cell: (r) => kundeKurz(r),
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (r) => (
        <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>
          {RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "zahlung", header: "Zahlung", sortable: true, firstDir: "desc",
      cell: (r) => (
        <span className="text-muted">
          {r.zahlungsdatum ? formatDate(r.zahlungsdatum) : (r.zahlungsstatus ?? "–")}
        </span>
      ),
    },
    {
      key: "brutto", header: "Brutto", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.summeBrutto, r.kdWaehrung === "USD" ? "USD" : "EUR"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/rechnungen"
      query={query}
      storageKey="rechnungen"
      empty="Keine Rechnungen."
      rowHref={(r) => `/rechnungen/${r.id}`}
    />
  );
}
