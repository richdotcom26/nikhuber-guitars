import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  AUFTRAG_STATUS, AUFTRAG_STATUS_LABEL, AUFTRAG_STATUS_TONE, AUFTRAGSART,
  AUFTRAGSART_LABEL, type AuftragStatus, fortschrittFarbe,
} from "@/lib/auftrag-shared";
import { listAuftraege } from "@/lib/domain/auftrag";
import { formatDate, formatMoney } from "@/lib/utils";
import { CreateAuftragButtons } from "./create-auftrag-buttons";

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; art?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const art = sp.art ?? "";
  const page = Number(sp.page) || 1;
  const { rows, total, pageCount } = await listAuftraege({ q, status, art, page });

  const withP = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, art, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/auftraege?${s}` : "/auftraege";
  };

  return (
    <div>
      <PageHeader title="Aufträge" description={`${total} Aufträge`} actions={<CreateAuftragButtons />} />

      <form method="get" className="mb-3 flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {art ? <input type="hidden" name="art" value={art} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-64" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <ChipLink href={withP({ status: undefined })} active={!status}>Alle Status</ChipLink>
        {AUFTRAG_STATUS.map((s) => (
          <ChipLink key={s.value} href={withP({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={withP({ art: undefined })} active={!art}>Alle Arten</ChipLink>
        {AUFTRAGSART.map((s) => (
          <ChipLink key={s.value} href={withP({ art: s.value })} active={art === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Nr</TH>
              <TH>Art</TH>
              <TH>Datum</TH>
              <TH>Bauplan</TH>
              <TH>Kunde</TH>
              <TH>Modell</TH>
              <TH>Status</TH>
              <TH className="w-16 text-right">Work %</TH>
              <TH className="text-right">Umsatzerw.</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">
                  <Link href={`/auftraege/${r.id}`} className="font-medium hover:underline">{r.nummer}</Link>
                </TD>
                <TD className="text-neutral-500">{AUFTRAGSART_LABEL[r.auftragsart] ?? r.auftragsart}</TD>
                <TD className="text-neutral-500">{formatDate(r.auftragsdatum)}</TD>
                <TD className="text-neutral-500">{r.bauplandatum ? r.bauplandatum.slice(0, 7) : "–"}</TD>
                <TD>{r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || "–"}</TD>
                <TD className="text-neutral-500">{r.modellName ?? "–"}</TD>
                <TD>
                  <Badge tone={AUFTRAG_STATUS_TONE[r.status as AuftragStatus] ?? "neutral"}>
                    {AUFTRAG_STATUS_LABEL[r.status as AuftragStatus] ?? r.status}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <span
                    className="inline-block min-w-9 rounded px-1 py-0.5 text-center text-xs tabular-nums"
                    style={{ background: fortschrittFarbe(r.fortschrittProzent) }}
                  >
                    {r.fortschrittProzent == null ? "–" : `${r.fortschrittProzent}%`}
                  </span>
                </TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(r.umsatzerwartung, r.kdWaehrung === "USD" ? "USD" : "EUR")}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={9} className="py-6 text-center text-neutral-400">Keine Aufträge.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={withP({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={withP({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
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
