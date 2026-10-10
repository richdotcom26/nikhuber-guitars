"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { kundeKurz } from "@/lib/adressen-shared";
import {
  RG_BELEGART_LABEL, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatBetrag, formatDate } from "@/lib/utils";

export interface RechnungRow {
  id: string;
  nummer: string | null;
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
  laufNr: number | null;
  modellKurz: string | null;
  serNr: string | null;
  betrag: string | null;
  netto: string | null;
  zahlbetrag: string | null;
  zahlbar: string | null;
  sparte: string;
  produktionsort: string | null;
  familie: string[] | null;
  mahnstufe: number | null;
}

const ORT: Record<string, string> = { RODGAU: "Rodgau", HAMBURG: "Hamburg" };

export function RechnungenTable({
  rows, sort, query, faktor,
}: {
  rows: RechnungRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
  /** USD → EUR (EZB-Tageskurs, sonst Einstellungen → Firma) für „Erlös EUR". */
  faktor: number;
}) {
  const usd = (r: RechnungRow) => r.kdWaehrung === "USD";
  const columns: Column<RechnungRow>[] = [
    {
      key: "nummer", header: "RG-Nr", sortable: true, hideable: false, className: "whitespace-nowrap font-mono text-[13px]",
      cell: (r) => (
        <>
          {r.nummer
            ? <span className="font-semibold hover:underline">{r.nummer}</span>
            : <span className="font-sans italic text-muted hover:underline">Entwurf</span>}
          {r.familie ? (
            <span className="ml-1 rounded bg-brand-soft px-1 font-sans text-[10px] text-brand" title={r.familie.join("\n")}>
              +{r.familie.length - 1}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: "datum", header: "RG-Dat", sortable: true, firstDir: "desc", className: "whitespace-nowrap",
      cell: (r) => <span className="tabular-nums">{formatDate(r.rechnungsdatum)}</span>,
    },
    {
      key: "status", header: "Art / Status", sortable: true,
      cell: (r) => (
        <div className="space-y-0.5">
          <div className="whitespace-nowrap text-xs text-muted">{RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}</div>
          <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>
            {RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}
          </Badge>
          {r.mahnstufe ? (
            <Badge tone={r.mahnstufe === 3 ? "red" : "amber"} className="ml-1">Mahnstufe {r.mahnstufe}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "kunde", header: "Kunde", sortable: true,
      cell: (r) => kundeKurz(r),
    },
    { key: "modell", header: "Artikelname kurz", sortable: true, cell: (r) => r.modellKurz ?? "" },
    { key: "ser", header: "Ser#", sortable: true, className: "tabular-nums", cell: (r) => r.serNr ?? "" },
    {
      key: "netto", header: "Netto", sortable: true, firstDir: "desc", align: "right", className: "whitespace-nowrap tabular-nums",
      cell: (r) => (r.netto == null ? "" : `${formatBetrag(r.netto)} ${usd(r) ? "$" : "€"}`),
    },
    {
      key: "erloes", header: "Erlös EUR (netto)", sortable: true, firstDir: "desc", align: "right", className: "whitespace-nowrap tabular-nums",
      cell: (r) => (r.netto == null ? "" : formatBetrag(String(Math.round(Number(r.netto) * (usd(r) ? faktor : 1) * 100) / 100))),
    },
    {
      key: "waehrung", header: "Währung", sortable: true,
      cell: (r) => (r.kdWaehrung ? (
        <span className="inline-flex items-center gap-1.5">
          <span className={usd(r) ? "text-lg font-semibold text-red-600" : "text-lg font-semibold text-blue-700"}>{usd(r) ? "$" : "€"}</span>
          {r.kdWaehrung}
        </span>
      ) : ""),
    },
    { key: "sparte", header: "Umsatzsparte", sortable: true, cell: (r) => r.sparte },
    { key: "ort", header: "Produktionsort", sortable: true, cell: (r) => (r.produktionsort ? ORT[r.produktionsort] ?? r.produktionsort : "") },
    {
      key: "lauf", header: "RG-Count", sortable: true, firstDir: "desc", align: "right", className: "tabular-nums",
      cell: (r) => r.laufNr ?? "",
    },
    {
      key: "zahlung", header: "Zahlungsdatum", sortable: true, firstDir: "desc", defaultHidden: true,
      cell: (r) => <span className="tabular-nums">{r.zahlungsdatum ? formatDate(r.zahlungsdatum) : ""}</span>,
    },
    {
      key: "differenz", header: "Differenz Zahlung", sortable: true, align: "right", className: "tabular-nums", defaultHidden: true,
      cell: (r) => {
        if (r.zahlbetrag == null || r.zahlbar == null) return "";
        const d = Math.round((Number(r.zahlbetrag) - Number(r.zahlbar)) * 100) / 100;
        if (d === 0) return <span className="text-muted">0,00</span>;
        return <span className={d < 0 ? "text-red-700" : "text-green-700"}>{formatBetrag(String(d))}</span>;
      },
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
      storageKey="rechnungen-v2"
      empty="Keine Rechnungen."
      rowHref={(r) => `/rechnungen/${r.id}`}
      rowTitle={(r) => (r.familie ? `Vorgangsfamilie:\n${r.familie.join("\n")}` : undefined)}
    />
  );
}
