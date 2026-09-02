import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARTIKELGRUPPE_VALUES, gruppeLabel } from "@/lib/artikel-shared";
import { ARTIKEL_SORT, listArtikel } from "@/lib/domain/artikel";
import { parseSort } from "@/lib/table-sort";
import { ArtikelTable } from "./artikel-table";

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gruppe?: string; typ?: string; inaktiv?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const gruppe = sp.gruppe ?? "";
  const typ = sp.typ ?? "";
  const mitInaktiven = sp.inaktiv === "1";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(ARTIKEL_SORT), { key: "gruppe", dir: "asc" });

  const { rows, total, pageCount } = await listArtikel({
    q, gruppe, typ, mitInaktiven, modelle: "ohne", page, sort,
  });

  const query = {
    q, gruppe, typ, inaktiv: mitInaktiven ? "1" : undefined, sort: sort.key, dir: sort.dir,
  };
  const withParams = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ ...query, ...patch })) if (val) p.set(k, val);
    const s = p.toString();
    return s ? `/artikel?${s}` : "/artikel";
  };

  return (
    <div>
      <PageHeader
        title="Artikel"
        description={`${total} Artikel (ohne Modelle)`}
        actions={<Link href="/artikel/neu" className={buttonClasses()}>Neuer Artikel</Link>}
      />

      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        {gruppe ? <input type="hidden" name="gruppe" value={gruppe} /> : null}
        {typ ? <input type="hidden" name="typ" value={typ} /> : null}
        {mitInaktiven ? <input type="hidden" name="inaktiv" value="1" /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Name / Nr / Hersteller" className="h-8 w-64" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <form method="get" className="flex items-center gap-2">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {mitInaktiven ? <input type="hidden" name="inaktiv" value="1" /> : null}
          <select name="gruppe" defaultValue={gruppe} className="h-8 rounded-lg border border-line bg-white px-2">
            <option value="">Alle Gruppen</option>
            {ARTIKELGRUPPE_VALUES.filter((g) => g !== "MODEL").map((g) => (
              <option key={g} value={g}>{gruppeLabel(g)}</option>
            ))}
          </select>
          <select name="typ" defaultValue={typ} className="h-8 rounded-lg border border-line bg-white px-2">
            <option value="">Alle Typen</option>
            <option value="HOLZ">Holz / Fertigung</option>
            <option value="HANDELSWARE">Handelsware</option>
          </select>
          <Button size="sm" variant="outline" type="submit">Filter</Button>
        </form>
        <Link
          href={withParams({ inaktiv: mitInaktiven ? undefined : "1" })}
          className={buttonClasses("ghost", "sm")}
        >
          {mitInaktiven ? "Inaktive ausblenden" : "Inaktive einblenden"}
        </Link>
        {(gruppe || typ || q) ? (
          <Link href="/artikel" className={buttonClasses("ghost", "sm")}>× Filter</Link>
        ) : null}
      </div>

      <ArtikelTable rows={rows} sort={sort} query={query} />

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={withParams({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={withParams({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
