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
import { AutoSelect } from "./auto-select";
import { DatevExport } from "./datev-export";
import { getFirmaSetting } from "@/lib/domain/stammdaten";
import { heuteBerlin } from "@/lib/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default async function RechnungenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; belegart?: string; jahr?: string; monat?: string; page?: string; sort?: string; dir?: string; summen?: string }>;
}) {
  const sp = await searchParams;
  // Ohne Parameter: zuletzt benutzte Filter wiederherstellen (Cookie). Erst „Filter zurücksetzen“ (?reset=1) holt die Vorgabe.
  if (Object.keys(sp).length === 0) {
    const gemerkt = (await cookies()).get("rg-filter")?.value;
    if (gemerkt) redirect(`/rechnungen?${gemerkt}`);
  }
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const belegart = sp.belegart ?? "";
  // Vorgabe (Schutz für schnelles Laden, wenn nichts gemerkt ist): Vormonat (im Januar: Dezember des Vorjahres). „alle“ = kein Filter.
  const [hj, hm] = heuteBerlin().split("-").map(Number);
  const vorJahr = hm === 1 ? hj - 1 : hj;
  const vorMonat = hm === 1 ? 12 : hm - 1;
  const jahrParam = sp.jahr ?? String(vorJahr);
  const monatParam = sp.monat ?? (sp.jahr ? "alle" : String(vorMonat));
  const jahr = /^\d{4}$/.test(jahrParam) ? jahrParam : "";
  const monatNr = Number(monatParam);
  const monat = jahr && monatNr >= 1 && monatNr <= 12 ? String(monatNr) : "";
  const page = Number(sp.page) || 1;
  const sort = parseSort(sp, Object.keys(RECHNUNG_SORT), { key: "datum", dir: "desc" });
  const [{ rows, faktor, kurs, summen, total, pageCount }, jahre, fs] = await Promise.all([
    listRechnungen({ q, status, belegart, jahr: jahr ? Number(jahr) : undefined, monat: monat ? Number(monat) : undefined, page, sort, mitSummen: sp.summen === "1" && !!jahr }),
    reportJahre(),
    getFirmaSetting(),
  ]);

  const query = { q, status, belegart, jahr: jahr || "alle", monat: monat || "alle", sort: sort.key, dir: sort.dir };
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
            <DatevExport jahre={jahre} vorJahr={vorJahr} vorMonat={vorMonat} empfaenger={fs.datevEmpfaenger} />
            <Link href="/rechnungen/mahnungen" className={buttonClasses("outline")}>Mahnvorschläge</Link>
            <Link href="/rechnungen/neu" className={buttonClasses()}>Neue Rechnung ohne Auftrag</Link>
          </div>
        )}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form method="get" className="flex flex-wrap items-center gap-2">
          {belegart ? <input type="hidden" name="belegart" value={belegart} /> : null}
          <Input name="q" defaultValue={q} placeholder="Suche Nr / Kunde" className="h-8 w-56" />
          <AutoSelect name="status" defaultValue={status} className="h-8 w-32 py-0 text-xs" aria-label="Status">
            <option value="">Alle Status</option>
            {RG_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </AutoSelect>
          <AutoSelect name="jahr" defaultValue={jahr || "alle"} className="h-8 w-28 py-0 text-xs" aria-label="Jahr">
            <option value="alle">Alle Jahre</option>
            {jahre.map((j) => <option key={j} value={String(j)}>{j}</option>)}
          </AutoSelect>
          <AutoSelect name="monat" defaultValue={monat || "alle"} disabled={!jahr} className="h-8 w-32 py-0 text-xs" aria-label="Monat">
            <option value="alle">Ganzes Jahr</option>
            {MONATE.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </AutoSelect>
          <Button size="sm" variant="outline" type="submit">Suchen</Button>
          <Link prefetch={false} href="/rechnungen?reset=1" className="text-xs text-muted hover:text-brand hover:underline">Filter zurücksetzen</Link>
        </form>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {summen ? (
            <RechnungSummen summen={summen} kurs={kurs} />
          ) : (
            jahr ? (
              <Link prefetch={false} href={chip({ summen: "1" })} className={buttonClasses("outline", "sm")}>Summen berechnen</Link>
            ) : (
              <span className={buttonClasses("outline", "sm") + " pointer-events-none opacity-50"} title="Erst ein Jahr (ggf. Monat) wählen">
                Summen berechnen (erst Jahr wählen)
              </span>
            )
          )}
        </div>
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
