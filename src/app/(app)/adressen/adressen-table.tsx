"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { anzeigename, KONTAKTART_LABEL } from "@/lib/adressen-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatMoney } from "@/lib/utils";

const KONTAKTART_TONE: Record<string, "neutral" | "blue" | "green" | "amber" | "violet"> = {
  KUNDE: "neutral",
  HAENDLER: "blue",
  ARTIST: "violet",
  LIEFERANT: "amber",
  HOLZHAENDLER: "amber",
  INDUSTRIE: "green",
  SONSTIGE: "neutral",
};

export interface KundeRow {
  id: string;
  kundenNr: string | null;
  kontaktart: string;
  firma: string | null;
  vorname: string | null;
  nachname: string | null;
  kurzname: string | null;
  ort: string | null;
  staatName: string | null;
  region: string | null;
  waehrung: string | null;
  vertriebsweg: string | null;
  anzahlRg: number;
  ums12: string;
}

export function AdressenTable({
  rows, sort, query,
}: {
  rows: KundeRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<KundeRow>[] = [
    {
      key: "art", header: "Art", sortable: true,
      cell: (r) => (
        <Badge tone={KONTAKTART_TONE[r.kontaktart] ?? "neutral"}>
          {KONTAKTART_LABEL[r.kontaktart as keyof typeof KONTAKTART_LABEL] ?? r.kontaktart}
        </Badge>
      ),
    },
    {
      key: "name", header: "Name", sortable: true, hideable: false, className: "font-medium",
      cell: (r) => <span className="hover:underline">{anzeigename(r)}</span>,
    },
    {
      key: "kurzname", header: "Kurzname", sortable: true,
      cell: (r) => <span className="text-muted">{r.kurzname ?? "–"}</span>,
    },
    {
      key: "ort", header: "Ort", sortable: true,
      cell: (r) => <span className="text-muted">{r.ort ?? "–"}</span>,
    },
    {
      key: "staat", header: "Staat", sortable: true,
      cell: (r) => <span className="text-muted">{r.staatName ?? "–"}</span>,
    },
    {
      key: "region", header: "Region", sortable: true,
      cell: (r) => <span className="text-muted">{r.region ?? "–"}</span>,
    },
    {
      key: "rg", header: "RG", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => r.anzahlRg || "–",
    },
    {
      key: "ums12", header: "Umsatz 12 M", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => (Number(r.ums12) > 0 ? formatMoney(r.ums12, r.waehrung === "USD" ? "USD" : "EUR") : "–"),
    },
    {
      key: "waehrung", header: "Whg", sortable: true,
      cell: (r) => r.waehrung ?? "–",
    },
    {
      key: "vertriebsweg", header: "Vertriebsweg", sortable: true,
      cell: (r) => <span className="text-muted">{r.vertriebsweg ?? "–"}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/adressen"
      query={query}
      storageKey="adressen"
      empty="Keine Treffer."
      rowHref={(r) => `/adressen/${r.id}`}
    />
  );
}
