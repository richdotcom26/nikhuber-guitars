import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RG_STATUS } from "@/lib/rechnung-shared";
import { listRechnungen, RECHNUNG_SORT } from "@/lib/domain/rechnung";
import { parseSort } from "@/lib/table-sort";
import { reportJahre } from "@/lib/domain/report";
import { RechnungenTable } from "./rechnungen-table";
import { RechnungSummen } from "./summen";

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; belegart?: string; jahr?: string; page?: string; sort?: string; dir?: string; summen?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const belegart = sp.belegart ?? "";
  const jahr = /^\d{4}$/.test(sp.jahr ?? "") ? sp.jahr! : "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(RECHNUNG_SORT), { key: "datum", dir: "desc" });
  const [{ rows, faktor, kurs, summen, total, pageCount }, jahre] = await Promise.all([
    listRechnungen({ q, status, belegart, jahr: jahr ? Number(jahr) : undefined, page, sort, mitSummen: sp.summen === "1" && !!(q || status || belegart || jahr) }),
    reportJahre(),
  ]);

  const query = { q, status, belegart, jahr, sort: sort.key, dir: sort.dir };
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
        count={`${total} Belege`}
        actions={(
          <div className="flex gap-2">
            <Link href="/rechnungen/mahnungen" className={buttonClasses("outline")}>Mahnvorschläge</Link>
            <Link href="/rechnungen/neu" className={buttonClasses()}>Neue Rechnung ohne Auftrag</Link>
          </div>
        )}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form method="get" className="flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {belegart ? <input type="hidden" name="belegart" value={belegart} /> : null}
        {jahr ? <input type="hidden" name="jahr" value={jahr} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-64" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
        </form>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {summen ? (
            <RechnungSummen summen={summen} kurs={kurs} />
          ) : (
            q || status || belegart || jahr ? (
              <Link prefetch={false} href={chip({ summen: "1" })} className={buttonClasses("outline", "sm")}>Summen berechnen</Link>
            ) : (
              <span className={buttonClasses("outline", "sm") + " pointer-events-none opacity-50"} title="Erst Jahr, Status oder Suche wählen">
                Summen berechnen (erst Filter wählen)
              </span>
            )
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip({ status: undefined })} active={!status}>Alle</ChipLink>
        {RG_STATUS.map((s) => (
          <ChipLink key={s.value} href={chip({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip({ jahr: undefined, page: undefined })} active={!jahr}>Alle Jahre</ChipLink>
        {jahre.map((j) => (
          <ChipLink key={j} href={chip({ jahr: String(j), page: undefined })} active={jahr === String(j)}>{j}</ChipLink>
        ))}
      </div>

      <RechnungenTable rows={rows} sort={sort} query={query} faktor={faktor} />

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
    <Link prefetch={false}
      href={href}
      className={
        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
        (active ? "border-button bg-button text-primary-fg" : "border-line text-muted hover:bg-brand-soft hover:text-brand")
      }
    >
      {children}
    </Link>
  );
}
