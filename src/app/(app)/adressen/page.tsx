import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KONTAKTARTEN, KUNDE_SORT, listKunden } from "@/lib/domain/adressen";
import { parseSort } from "@/lib/table-sort";
import { AdressenTable } from "./adressen-table";

export default async function AdressenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; art?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const art = sp.art ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(KUNDE_SORT), { key: "name", dir: "asc" });

  const { rows, total, pageCount } = await listKunden({ q, kontaktart: art, page, sort });

  const query = { q, art, sort: sort.key, dir: sort.dir };
  const withP = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/adressen?${s}` : "/adressen";
  };

  return (
    <div>
      <PageHeader
        title="Adressen"
        description={`${total} Kontakte`}
        actions={<Link href="/adressen/neu" className={buttonClasses()}>Neuer Kontakt</Link>}
      />

      <form method="get" className="mb-3 flex items-center gap-2">
        {art ? <input type="hidden" name="art" value={art} /> : null}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Suche Firma / Name / Nr / Ort"
          className="h-8 w-64"
        />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
        {q ? (
          <Link href={withP({ q: undefined })} className={buttonClasses("ghost", "sm")}>× Filter</Link>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={withP({ art: undefined })} active={!art}>Alle</ChipLink>
        {KONTAKTARTEN.map((k) => (
          <ChipLink key={k.value} href={withP({ art: k.value })} active={art === k.value}>
            {k.label}
          </ChipLink>
        ))}
      </div>

      <AdressenTable rows={rows} sort={sort} query={query} />

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={withP({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link>
            ) : null}
            {page < pageCount ? (
              <Link href={withP({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
        (active
          ? "border-brand bg-brand text-white"
          : "border-line text-muted hover:bg-brand-soft hover:text-brand")
      }
    >
      {children}
    </Link>
  );
}
