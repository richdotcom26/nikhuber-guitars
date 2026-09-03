import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  AUFTRAG_STATUS, AUFTRAGSART,
} from "@/lib/auftrag-shared";
import { AUFTRAG_SORT, auftragModellgruppen, listAuftraege } from "@/lib/domain/auftrag";
import { parseSort } from "@/lib/table-sort";
import { AuftraegeTable } from "./auftraege-table";
import { CreateAuftragButtons } from "./create-auftrag-buttons";

export default async function AuftraegePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; status?: string; art?: string; modellgruppe?: string;
    page?: string; sort?: string; dir?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const art = sp.art ?? "";
  const modellgruppe = sp.modellgruppe ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(AUFTRAG_SORT), { key: "datum", dir: "desc" });
  const [{ rows, total, pageCount }, modellgruppen] = await Promise.all([
    listAuftraege({ q, status, art, modellgruppe, page, sort }),
    auftragModellgruppen(),
  ]);

  const query = { q, status, art, modellgruppe, sort: sort.key, dir: sort.dir };
  const withP = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/auftraege?${s}` : "/auftraege";
  };

  return (
    <div>
      <PageHeader title="Aufträge" description={`${total} Aufträge`} actions={<CreateAuftragButtons />} />

      <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {art ? <input type="hidden" name="art" value={art} /> : null}
        {sort.key ? <input type="hidden" name="sort" value={sort.key} /> : null}
        {sort.dir ? <input type="hidden" name="dir" value={sort.dir} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-64" />
        <Select name="modellgruppe" defaultValue={modellgruppe} className="h-8 w-52">
          <option value="">Alle Modellgruppen</option>
          {modellgruppen.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Button size="sm" variant="outline" type="submit">Filtern</Button>
        {(q || modellgruppe) ? (
          <Link href={withP({ q: undefined, modellgruppe: undefined })} className={buttonClasses("ghost", "sm")}>
            × Filter
          </Link>
        ) : null}
      </form>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <ChipLink href={withP({ status: undefined })} active={!status}>Alle Status</ChipLink>
        {AUFTRAG_STATUS.map((s) => (
          <ChipLink key={s.value} href={withP({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={withP({ art: undefined })} active={!art}>Alle Arten</ChipLink>
        {AUFTRAGSART.map((s) => (
          <ChipLink key={s.value} href={withP({ art: s.value })} active={art === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <AuftraegeTable rows={rows} sort={sort} query={query} />

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
