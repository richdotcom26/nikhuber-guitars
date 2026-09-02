"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { HOLZ_STATUS_LABEL, HOLZ_STATUS_TONE, type HolzStatus } from "@/lib/holz-shared";
import type { SortSpec } from "@/lib/table-sort";

export interface HolzRow {
  id: string;
  inventarId: string;
  holzartName: string | null;
  unterart: string | null;
  struktur: string | null;
  qualitaet: string | null;
  piece: string | null;
  fuer: string | null;
  status: string;
  reserviertFuerAuftragId: string | null;
  auftragNummer: string | null;
}

export function HolzTable({
  rows, sort, query,
}: {
  rows: HolzRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<HolzRow>[] = [
    {
      key: "inventarId", header: "Inventar-ID", sortable: true, hideable: false, className: "font-mono",
      cell: (r) => <span className="font-medium hover:underline">{r.inventarId}</span>,
    },
    {
      key: "holzart", header: "Holzart", sortable: true,
      cell: (r) => r.holzartName ?? "–",
    },
    {
      key: "unterart", header: "Unterart", sortable: true,
      cell: (r) => <span className="text-muted">{r.unterart ?? "–"}</span>,
    },
    {
      key: "struktur", header: "Struktur", sortable: true,
      cell: (r) => <span className="text-muted">{r.struktur ?? "–"}</span>,
    },
    {
      key: "qual", header: "Qual.", sortable: true,
      cell: (r) => (
        <span className="text-muted">
          {r.qualitaet === "EXCEPTIONAL" ? "Exc." : r.qualitaet === "STANDARD" ? "Std." : "–"}
        </span>
      ),
    },
    {
      key: "piece", header: "Piece", sortable: true,
      cell: (r) => (
        <span className="text-muted">
          {r.piece === "EIN_PC" ? "1pc" : r.piece === "ZWEI_PC" ? "2pc" : "–"}
        </span>
      ),
    },
    {
      key: "fuer", header: "Für", sortable: true,
      cell: (r) => <span className="text-muted">{r.fuer ?? "–"}</span>,
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (r) => (
        <Badge tone={HOLZ_STATUS_TONE[r.status as HolzStatus] ?? "neutral"}>
          {HOLZ_STATUS_LABEL[r.status as HolzStatus] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "auftrag", header: "Auftrag", sortable: true, className: "font-mono text-xs text-muted",
      cell: (r) => (r.reserviertFuerAuftragId
        ? <Link href={`/auftraege/${r.reserviertFuerAuftragId}`} className="hover:underline">{r.auftragNummer}</Link>
        : "–"),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/holzbestand"
      query={query}
      storageKey="holzbestand"
      empty="Kein Holz erfasst — oben rechts anlegen."
      rowHref={(r) => `/holzbestand/${r.id}`}
    />
  );
}
