import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { HOLZ_STATUS } from "@/lib/holz-shared";
import {
  HOLZ_SORT, listHolz, listHolzarten, listHolzartGrob, listHolzStrukturen, listHolzUnterarten, listLagerorte,
} from "@/lib/domain/holz";
import { parseSort } from "@/lib/table-sort";
import { HolzTable } from "./holz-table";
import {
  HolzartenPanel, LagerortePanel, StrukturenPanel, UnterartenPanel,
} from "./masters";

const TABS: readonly TabItem[] = [
  { key: "holz", label: "Holz" },
  { key: "holzarten", label: "Holzarten" },
  { key: "unterarten", label: "Unterarten" },
  { key: "strukturen", label: "Strukturen" },
  { key: "lagerorte", label: "Lagerorte" },
];

export default async function HolzbestandPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const active = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "holz";
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(HOLZ_SORT), { key: "inventarId", dir: "asc" });

  return (
    <div>
      <PageHeader
        title="Holzbestand"
        description="Physische Blanks, Holzarten und Lagerorte."
        actions={
          active === "holz"
            ? <Link href="/holzbestand/neu" className={buttonClasses()}>Holzartikel anlegen</Link>
            : undefined
        }
      />
      <Tabs items={TABS} active={active} basePath="/holzbestand" className="mb-5" />

      {active === "holz" ? <HolzListe q={q} status={status} page={page} sort={sort} /> : null}
      {active === "holzarten" ? <HolzartenPanel rows={(await listHolzarten()).map((r) => ({ ...r }))} /> : null}
      {active === "unterarten" ? (
        <UnterartenPanel
          rows={(await listHolzUnterarten()).map((r) => ({ ...r }))}
          grobOptionen={await listHolzartGrob()}
        />
      ) : null}
      {active === "strukturen" ? <StrukturenPanel rows={(await listHolzStrukturen()).map((r) => ({ ...r }))} /> : null}
      {active === "lagerorte" ? <LagerortePanel rows={(await listLagerorte()).map((r) => ({ ...r }))} /> : null}
    </div>
  );
}

async function HolzListe({
  q, status, page, sort,
}: {
  q: string; status: string; page: number; sort: ReturnType<typeof parseSort>;
}) {
  const { rows, total, pageCount } = await listHolz({ q, status, page, sort });
  const query = { tab: "holz", q, status, sort: sort.key, dir: sort.dir };
  const chip = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
    return `/holzbestand?${p.toString()}`;
  };
  return (
    <div>
      <form method="get" className="mb-3 flex items-center gap-2">
        <input type="hidden" name="tab" value="holz" />
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Inventar-ID / Unterart / Struktur" className="h-8 w-72" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip({ status: undefined })} active={!status}>Alle</ChipLink>
        {HOLZ_STATUS.map((s) => (
          <ChipLink key={s.value} href={chip({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <HolzTable rows={rows} sort={sort} query={query} />

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount} · {total} Blanks</span>
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

