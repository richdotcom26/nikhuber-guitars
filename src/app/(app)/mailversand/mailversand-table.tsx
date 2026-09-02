"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  MAIL_ART_LABEL, MAIL_STATUS_LABEL, MAIL_STATUS_TONE, type MailArt, type MailStatus,
} from "@/lib/mailversand-shared";
import type { SortSpec } from "@/lib/table-sort";
import { formatDate } from "@/lib/utils";

export interface MailRow {
  id: string;
  art: string;
  status: string;
  an: string | null;
  betreff: string | null;
  createdAt: string | Date;
  kundeId: string | null;
  kundeName: string | null;
  angebotId: string | null;
  angebotNummer: string | null;
  auftragId: string | null;
  auftragNummer: string | null;
  rechnungId: string | null;
  rechnungNummer: string | null;
}

function bezug(r: MailRow) {
  if (r.rechnungNummer) return { href: `/rechnungen/${r.rechnungId}`, label: r.rechnungNummer };
  if (r.auftragNummer) return { href: `/auftraege/${r.auftragId}`, label: r.auftragNummer };
  if (r.angebotNummer) return { href: `/angebote/${r.angebotId}`, label: r.angebotNummer };
  return null;
}

export function MailversandTable({
  rows, sort, query,
}: {
  rows: MailRow[];
  sort: SortSpec;
  query: Record<string, string | undefined>;
}) {
  const columns: Column<MailRow>[] = [
    {
      key: "datum", header: "Datum", sortable: true, firstDir: "desc", hideable: false, className: "w-24 text-muted",
      cell: (r) => formatDate(r.createdAt),
    },
    {
      key: "empfaenger", header: "Empfänger", sortable: true,
      cell: (r) => (r.kundeId
        ? <Link href={`/adressen/${r.kundeId}`} className="hover:underline">{r.kundeName ?? r.an ?? "–"}</Link>
        : (r.an ?? "–")),
    },
    {
      key: "art", header: "Art", sortable: true, className: "w-40",
      cell: (r) => <Badge tone="neutral">{MAIL_ART_LABEL[r.art as MailArt]}</Badge>,
    },
    {
      key: "bezug", header: "Bezug", sortable: false, className: "w-28 font-mono text-xs",
      cell: (r) => {
        const b = bezug(r);
        return b ? <Link href={b.href} className="text-brand hover:underline">{b.label}</Link> : "–";
      },
    },
    {
      key: "betreff", header: "Betreff", sortable: true,
      cell: (r) => (
        <Link href={`/mailversand/${r.id}`} className="hover:underline">
          {r.betreff ?? <span className="text-neutral-400">(ohne Betreff)</span>}
        </Link>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, className: "w-28",
      cell: (r) => (
        <Badge tone={MAIL_STATUS_TONE[r.status as MailStatus]}>{MAIL_STATUS_LABEL[r.status as MailStatus]}</Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      sort={sort}
      basePath="/mailversand"
      query={query}
      storageKey="mailversand"
      empty="Keine Einträge."
    />
  );
}
