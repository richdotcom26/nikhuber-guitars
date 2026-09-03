"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { kundeKurz } from "@/lib/adressen-shared";
import {
  AUFTRAGSART_LABEL, AUFTRAG_STATUS_LABEL, AUFTRAG_STATUS_TONE,
  type Auftragsart, type AuftragStatus, fortschrittFarbe,
} from "@/lib/auftrag-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatDate, formatMoney, kontrastText } from "@/lib/utils";

export interface AuftragRow {
  id: string;
  nummer: string;
  auftragsart: string;
  status: string;
  auftragsdatum: string | null;
  bauplandatum: string | null;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kdWaehrung: string | null;
  kurzname: string | null;
  firma: string | null;
  fortschrittProzent: number | null;
  modellName: string | null;
  modellgruppeName: string | null;
  modellgruppeFarbe: string | null;
  umsatzerwartung: string | null;
}

export function AuftraegeTable({
  rows,
  sort,
  query,
}: {
  rows: AuftragRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<AuftragRow>[] = [
    {
      key: "nummer", header: "Nr", sortable: true, hideable: false, className: "font-mono text-xs",
      cell: (r) => <span className="font-medium hover:underline">{r.nummer}</span>,
    },
    {
      key: "art", header: "Art", sortable: true,
      cell: (r) => <span className="text-muted">{AUFTRAGSART_LABEL[r.auftragsart as Auftragsart] ?? r.auftragsart}</span>,
    },
    {
      key: "datum", header: "Datum", sortable: true, firstDir: "desc",
      cell: (r) => <span className="text-muted">{formatDate(r.auftragsdatum)}</span>,
    },
    {
      key: "bauplan", header: "Bauplan", sortable: true, firstDir: "desc",
      cell: (r) => <span className="text-muted">{r.bauplandatum ? r.bauplandatum.slice(0, 7) : "–"}</span>,
    },
    {
      key: "kunde", header: "Kunde", sortable: true,
      cell: (r) => kundeKurz(r),
    },
    {
      key: "modell", header: "Modell", sortable: false,
      cell: (r) => <span className="text-muted">{r.modellName ?? "–"}</span>,
    },
    {
      key: "modellgruppe", header: "Modellgruppe", sortable: true,
      cell: (r) => (r.modellgruppeName ? (
        <span
          className="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            background: r.modellgruppeFarbe ?? "#e5e7eb",
            color: kontrastText(r.modellgruppeFarbe),
          }}
        >
          {r.modellgruppeName}
        </span>
      ) : <span className="text-neutral-300">–</span>),
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (r) => (
        <Badge tone={AUFTRAG_STATUS_TONE[r.status as AuftragStatus] ?? "neutral"}>
          {AUFTRAG_STATUS_LABEL[r.status as AuftragStatus] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "work", header: "Work %", sortable: true, firstDir: "desc", align: "right", className: "w-16",
      cell: (r) => (
        <span
          className="inline-block min-w-9 rounded px-1 py-0.5 text-center text-xs tabular-nums"
          style={{ background: fortschrittFarbe(r.fortschrittProzent) }}
        >
          {r.fortschrittProzent == null ? "–" : `${r.fortschrittProzent}%`}
        </span>
      ),
    },
    {
      key: "umsatz", header: "Umsatzerw.", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.umsatzerwartung, r.kdWaehrung === "USD" ? "USD" : "EUR"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/auftraege"
      query={query}
      storageKey="auftraege"
      empty="Keine Aufträge."
      rowHref={(r) => `/auftraege/${r.id}`}
    />
  );
}
