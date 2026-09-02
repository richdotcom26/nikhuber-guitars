"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  BM_KATEGORIE_LABEL, EINHEIT_LABEL, type BmKategorie, type Einheit,
} from "@/lib/betriebsmittel-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatMoney } from "@/lib/utils";
import { MengeInline } from "./menge-inline";

export interface BmRow {
  id: string;
  bezeichnung: string;
  artikelnummer: string | null;
  produktkategorie: string | null;
  hersteller: string | null;
  menge: string;
  einheit: string | null;
  einkaufspreis: string | null;
  wert: string | null;
}

export function BetriebsmittelTable({
  rows, sort, query,
}: {
  rows: BmRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<BmRow>[] = [
    {
      key: "bezeichnung", header: "Bezeichnung", sortable: true, hideable: false, className: "font-medium",
      cell: (r) => (
        <span className="hover:underline">
          {r.bezeichnung}
          {r.artikelnummer ? <span className="ml-1 text-xs text-neutral-400">{r.artikelnummer}</span> : null}
        </span>
      ),
    },
    {
      key: "kategorie", header: "Kategorie", sortable: true,
      cell: (r) => (r.produktkategorie
        ? <Badge tone="neutral">{BM_KATEGORIE_LABEL[r.produktkategorie as BmKategorie]}</Badge>
        : <span className="text-neutral-400">–</span>),
    },
    {
      key: "hersteller", header: "Hersteller", sortable: true,
      cell: (r) => <span className="text-muted">{r.hersteller ?? "–"}</span>,
    },
    {
      key: "menge", header: "Menge", sortable: true, firstDir: "desc", align: "right",
      cell: (r) => (
        <MengeInline id={r.id} menge={r.menge} einheit={r.einheit ? EINHEIT_LABEL[r.einheit as Einheit] : ""} />
      ),
    },
    {
      key: "ek", header: "EK", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums text-muted",
      cell: (r) => formatMoney(r.einkaufspreis),
    },
    {
      key: "wert", header: "Wert", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => formatMoney(r.wert),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/betriebsmittel"
      query={query}
      storageKey="betriebsmittel"
      empty="Keine Betriebsmittel."
      rowHref={(r) => `/betriebsmittel/${r.id}`}
    />
  );
}
