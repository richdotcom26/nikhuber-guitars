import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { BM_KATEGORIE } from "@/lib/betriebsmittel-shared";
import { BM_SORT, listBetriebsmittel } from "@/lib/domain/betriebsmittel";
import { parseSort } from "@/lib/table-sort";
import { formatMoney } from "@/lib/utils";
import { BetriebsmittelTable } from "./betriebsmittel-table";

export default async function BetriebsmittelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategorie?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const kategorie = sp.kategorie ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(BM_SORT), { key: "bezeichnung", dir: "asc" });

  const { rows, total, wertSumme, pageCount } = await listBetriebsmittel({ q, kategorie, page, sort });

  const query = { q, kategorie, sort: sort.key, dir: sort.dir };
  const linkWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ ...query, ...patch })) if (val) p.set(k, val);
    const s = p.toString();
    return s ? `/betriebsmittel?${s}` : "/betriebsmittel";
  };

  return (
    <div>
      <PageHeader
        title="Betriebsmittel"
        description={`${total} Positionen · Bestandswert ${formatMoney(wertSumme)}`}
        actions={<Link href="/betriebsmittel/neu" className={buttonClasses()}>Neu</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Bezeichnung / Artikelnr / Hersteller" className="h-8 w-72" />
        <Select name="kategorie" defaultValue={kategorie} className="h-8 w-52">
          <option value="">Alle Kategorien</option>
          {BM_KATEGORIE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Button size="sm" variant="outline" type="submit">Filtern</Button>
        {(q || kategorie) ? (
          <Link href="/betriebsmittel" className="text-xs text-neutral-500 hover:underline">zurücksetzen</Link>
        ) : null}
      </form>

      <BetriebsmittelTable rows={rows} sort={sort} query={query} />

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
        Werkstatt-Verbrauchsmaterial (Schleifmittel, Lack, Kleber, Hardware …) — getrennt vom
        Artikelstamm. Menge in der Liste anklicken für eine schnelle Inventurkorrektur.
      </p>
    </div>
  );
}
