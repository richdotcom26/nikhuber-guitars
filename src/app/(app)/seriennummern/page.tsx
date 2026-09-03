import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listSeriennummern, naechsteLfd, SERIENNUMMER_SORT } from "@/lib/domain/seriennummer";
import { parseSort } from "@/lib/table-sort";
import { NeueSnPanel } from "./neue-sn-panel";
import { SeriennummernTable } from "./seriennummern-table";

export default async function SeriennummernPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(SERIENNUMMER_SORT), { key: "lfd", dir: "desc" });
  const [{ rows, total, pageCount }, next] = await Promise.all([
    listSeriennummern({ q, page, sort }),
    naechsteLfd(),
  ]);

  const query = { q, sort: sort.key, dir: sort.dir };
  const withP = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/seriennummern?${s}` : "/seriennummern";
  };

  return (
    <div>
      <PageHeader
        title="Seriennummern"
        actions={
          <span className="text-sm text-muted">
            {total} vergeben · nächste automatische Nr: {next}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-start gap-2">
        <form method="get" className="flex items-center gap-2">
          <Input name="q" defaultValue={q} placeholder="Suche Seriennr / Auftrag / Kunde" className="h-8 w-72" />
          <Button size="sm" variant="outline" type="submit">Suchen</Button>
        </form>
        <NeueSnPanel naechste={next} />
      </div>

      <SeriennummernTable rows={rows} sort={sort} query={query} />

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={withP({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={withP({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-neutral-400">
        Vergabe hier über die Schaltfläche neben der Suche oder direkt im Auftrag (Abschnitt Seriennummer).
        Automatisch = höchste bisher <em>automatisch</em> vergebene Nummer + 1 (manuell vergebene Nummern
        zählen nicht); ist die Nummer schon belegt, wird die nächste freie genommen. Eine gelöschte Nummer
        wird wieder vergeben, wenn sie nicht mehr als 10 unter der nächsten Nummer liegt; ältere Lücken
        bleiben frei. Das Jahrpräfix kommt aus dem Bauplan-Monat (bis 2025 einstellig, ab 2026 zweistellig).
      </p>
    </div>
  );
}
