import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ANGEBOT_STATUS } from "@/lib/angebot-shared";
import { ANGEBOT_SORT, listAngebote } from "@/lib/domain/angebot";
import { parseSort } from "@/lib/table-sort";
import { AngeboteTable } from "./angebote-table";
import { CreateAngebotButton } from "./create-angebot-button";

export default async function AngebotePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(ANGEBOT_SORT), { key: "datum", dir: "desc" });
  const { rows, total, pageCount } = await listAngebote({ q, status, page, sort });

  const query = { q, status, sort: sort.key, dir: sort.dir };
  const withP = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/angebote?${s}` : "/angebote";
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
        <ChipLink href={withP({ status: undefined })} active={!status}>Alle</ChipLink>
        {ANGEBOT_STATUS.map((s) => (
          <ChipLink key={s.value} href={withP({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <AngeboteTable rows={rows} sort={sort} query={query} />

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
        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
        (active ? "border-brand bg-brand text-white" : "border-line text-muted hover:bg-brand-soft hover:text-brand")
      }
    >
      {children}
    </Link>
  );
}
