import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  RG_BELEGART_LABEL, RG_STATUS, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import { listRechnungen } from "@/lib/domain/rechnung";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; belegart?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const belegart = sp.belegart ?? "";
  const page = Number(sp.page) || 1;
  const { rows, total, pageCount } = await listRechnungen({ q, status, belegart, page });

  const chip = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, belegart, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/rechnungen?${s}` : "/rechnungen";
  };

  return (
    <div>
      <PageHeader
        title="Rechnungen"
        description={`${total} Belege — Erstellung erfolgt aus dem Auftrag`}
      />

      <form method="get" className="mb-3 flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {belegart ? <input type="hidden" name="belegart" value={belegart} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-64" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip({ status: undefined })} active={!status}>Alle</ChipLink>
        {RG_STATUS.map((s) => (
          <ChipLink key={s.value} href={chip({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>RG-Nr</TH>
              <TH>Art</TH>
              <TH>Datum</TH>
              <TH>Kunde</TH>
              <TH>Status</TH>
              <TH>Zahlung</TH>
              <TH className="text-right">Brutto</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">
                  <Link href={`/rechnungen/${r.id}`} className="font-medium hover:underline">{r.nummer}</Link>
                </TD>
                <TD className="text-neutral-500">{RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}</TD>
                <TD className="text-neutral-500">{formatDate(r.rechnungsdatum)}</TD>
                <TD>{r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || "–"}</TD>
                <TD>
                  <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>
                    {RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}
                  </Badge>
                </TD>
                <TD className="text-neutral-500">
                  {r.zahlungsdatum ? formatDate(r.zahlungsdatum) : (r.zahlungsstatus ?? "–")}
                </TD>
                <TD className="text-right tabular-nums">
                  {formatMoney(r.summeBrutto, r.kdWaehrung === "USD" ? "USD" : "EUR")}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Rechnungen.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={chip({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={chip({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
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
