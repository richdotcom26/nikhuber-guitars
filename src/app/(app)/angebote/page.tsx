import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ANGEBOT_STATUS, ANGEBOT_STATUS_LABEL, ANGEBOT_STATUS_TONE, type AngebotStatus,
} from "@/lib/angebot-shared";
import { listAngebote } from "@/lib/domain/angebot";
import { formatDate, formatMoney } from "@/lib/utils";
import { CreateAngebotButton } from "./create-angebot-button";

export default async function AngebotePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;
  const { rows, total, pageCount } = await listAngebote({ q, status, page });

  const chip = (s: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (s) p.set("status", s);
    const str = p.toString();
    return str ? `/angebote?${str}` : "/angebote";
  };

  return (
    <div>
      <PageHeader title="Angebote" description={`${total} Angebote`} actions={<CreateAngebotButton />} />

      <form method="get" className="mb-3 flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-64" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip("")} active={!status}>Alle</ChipLink>
        {ANGEBOT_STATUS.map((s) => (
          <ChipLink key={s.value} href={chip(s.value)} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Nr</TH>
              <TH>Datum</TH>
              <TH>Kunde</TH>
              <TH>Modell</TH>
              <TH>Status</TH>
              <TH>Whg</TH>
              <TH className="text-right">Summe netto</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">
                  <Link href={`/angebote/${r.id}`} className="font-medium hover:underline">{r.nummer}</Link>
                </TD>
                <TD className="text-neutral-500">{formatDate(r.angebotsdatum)}</TD>
                <TD>{r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || "–"}</TD>
                <TD className="text-neutral-500">{r.modellName ?? "–"}</TD>
                <TD>
                  <Badge tone={ANGEBOT_STATUS_TONE[r.status as AngebotStatus] ?? "neutral"}>
                    {ANGEBOT_STATUS_LABEL[r.status as AngebotStatus] ?? r.status}
                  </Badge>
                </TD>
                <TD>{r.kdWaehrung ?? "–"}</TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(r.summeNetto, r.kdWaehrung === "USD" ? "USD" : "EUR")}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Angebote.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={`/angebote?page=${page - 1}`} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={`/angebote?page=${page + 1}`} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-2.5 py-1 text-xs " +
        (active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100")
      }
    >
      {children}
    </Link>
  );
}
