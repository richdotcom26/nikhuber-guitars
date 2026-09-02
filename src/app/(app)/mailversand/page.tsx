import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  MAIL_ART, MAIL_ART_LABEL, MAIL_STATUS, MAIL_STATUS_LABEL, MAIL_STATUS_TONE,
  type MailArt, type MailStatus,
} from "@/lib/mailversand-shared";
import { listMailversand } from "@/lib/domain/mailversand";
import { formatDate } from "@/lib/utils";

function bezug(r: {
  angebotId: string | null; angebotNummer: string | null;
  auftragId: string | null; auftragNummer: string | null;
  rechnungId: string | null; rechnungNummer: string | null;
}) {
  if (r.rechnungNummer) return { href: `/rechnungen/${r.rechnungId}`, label: r.rechnungNummer };
  if (r.auftragNummer) return { href: `/auftraege/${r.auftragId}`, label: r.auftragNummer };
  if (r.angebotNummer) return { href: `/angebote/${r.angebotId}`, label: r.angebotNummer };
  return null;
}

export default async function MailversandPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; art?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const art = sp.art ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;

  const { rows, total, pageCount } = await listMailversand({ q, art, status, page });

  const linkWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, art, status, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/mailversand?${s}` : "/mailversand";
  };

  return (
    <div>
      <PageHeader
        title="Mailversand"
        description={`${total} Einträge — Korrespondenz & Belegversand`}
        actions={<Link href="/mailversand/neu" className={buttonClasses()}>Neuer Eintrag</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Betreff / Empfänger" className="h-8 w-64" />
        <Select name="art" defaultValue={art} className="h-8 w-48">
          <option value="">Alle Arten</option>
          {MAIL_ART.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select name="status" defaultValue={status} className="h-8 w-40">
          <option value="">Alle Status</option>
          {MAIL_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Button size="sm" variant="outline" type="submit">Filtern</Button>
        {(q || art || status) ? (
          <Link href="/mailversand" className="text-xs text-neutral-500 hover:underline">zurücksetzen</Link>
        ) : null}
      </form>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH className="w-24">Datum</TH>
              <TH>Empfänger</TH>
              <TH className="w-40">Art</TH>
              <TH className="w-28">Bezug</TH>
              <TH>Betreff</TH>
              <TH className="w-28">Status</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const b = bezug(r);
              return (
                <TR key={r.id}>
                  <TD className="text-neutral-500">{formatDate(r.createdAt)}</TD>
                  <TD className="text-neutral-600">
                    {r.kundeId ? (
                      <Link href={`/adressen/${r.kundeId}`} className="hover:underline">{r.kundeName ?? r.an ?? "–"}</Link>
                    ) : (r.an ?? "–")}
                  </TD>
                  <TD><Badge tone="neutral">{MAIL_ART_LABEL[r.art as MailArt]}</Badge></TD>
                  <TD className="font-mono text-xs">
                    {b ? <Link href={b.href} className="text-blue-700 hover:underline">{b.label}</Link> : "–"}
                  </TD>
                  <TD>
                    <Link href={`/mailversand/${r.id}`} className="hover:underline">
                      {r.betreff ?? <span className="text-neutral-400">(ohne Betreff)</span>}
                    </Link>
                  </TD>
                  <TD>
                    <Badge tone={MAIL_STATUS_TONE[r.status as MailStatus]}>{MAIL_STATUS_LABEL[r.status as MailStatus]}</Badge>
                  </TD>
                </TR>
              );
            })}
            {rows.length === 0 ? (
              <TR><TD colSpan={6} className="py-6 text-center text-neutral-400">Keine Einträge.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={linkWith({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={linkWith({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-neutral-400">
        Archiv der versendeten Belege und Korrespondenz aus Ninox. Automatischer Versand
        (Provider-Anbindung) folgt; neue Einträge sind zunächst manuelle Notizen.
      </p>
    </div>
  );
}
