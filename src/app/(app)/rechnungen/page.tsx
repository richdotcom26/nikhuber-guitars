import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RG_STATUS } from "@/lib/rechnung-shared";
import { listRechnungen, RECHNUNG_SORT } from "@/lib/domain/rechnung";
import { parseSort } from "@/lib/table-sort";
import { RechnungenTable } from "./rechnungen-table";

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; belegart?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const belegart = sp.belegart ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(RECHNUNG_SORT), { key: "datum", dir: "desc" });
  const { rows, total, pageCount } = await listRechnungen({ q, status, belegart, page, sort });

  const query = { q, status, belegart, sort: sort.key, dir: sort.dir };
  const chip = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
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

      <RechnungenTable rows={rows} sort={sort} query={query} />

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
        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
        (active ? "border-brand bg-brand text-white" : "border-line text-muted hover:bg-brand-soft hover:text-brand")
      }
    >
      {children}
    </Link>
  );
}
