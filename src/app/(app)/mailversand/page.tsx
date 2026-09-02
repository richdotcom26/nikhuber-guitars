import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { MAIL_ART, MAIL_STATUS } from "@/lib/mailversand-shared";
import { listMailversand, mailKonfigStatus, MAIL_SORT } from "@/lib/domain/mailversand";
import { parseSort } from "@/lib/table-sort";
import { MailversandTable } from "./mailversand-table";

export default async function MailversandPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; art?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const art = sp.art ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(MAIL_SORT), { key: "datum", dir: "desc" });

  const [{ rows, total, pageCount }, smtp] = await Promise.all([
    listMailversand({ q, art, status, page, sort }),
    mailKonfigStatus(),
  ]);

  const query = { q, art, status, sort: sort.key, dir: sort.dir };
  const linkWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
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

      <MailversandTable rows={rows} sort={sort} query={query} />

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
        Archiv der Korrespondenz aus Ninox. Versand über SMTP:{" "}
        {smtp.konfiguriert
          ? (smtp.ok
            ? <span className="text-green-600">verbunden ({smtp.info})</span>
            : <span className="text-red-600">Fehler – {smtp.info}</span>)
          : <span className="text-neutral-500">nicht konfiguriert</span>}
        . Einen Eintrag öffnen und dort senden.
      </p>
    </div>
  );
}
