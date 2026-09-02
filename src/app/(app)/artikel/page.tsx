import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ARTIKELGRUPPE_VALUES, artikelName, gruppeLabel } from "@/lib/artikel-shared";
import { listArtikel } from "@/lib/domain/artikel";
import { formatMoney } from "@/lib/utils";

export default async function ArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gruppe?: string; typ?: string; inaktiv?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const gruppe = sp.gruppe ?? "";
  const typ = sp.typ ?? "";
  const mitInaktiven = sp.inaktiv === "1";
  const page = Number(sp.page) || 1;

  const { rows, total, pageCount } = await listArtikel({
    q, gruppe, typ, mitInaktiven, modelle: "ohne", page,
  });

  const withParams = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { q, gruppe, typ, inaktiv: mitInaktiven ? "1" : "" };
    for (const [k, val] of Object.entries({ ...base, ...patch })) if (val) p.set(k, val);
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
          <select name="gruppe" defaultValue={gruppe} className="h-8 rounded border border-neutral-300 px-2">
            <option value="">Alle Gruppen</option>
            {ARTIKELGRUPPE_VALUES.filter((g) => g !== "MODEL").map((g) => (
              <option key={g} value={g}>{gruppeLabel(g)}</option>
            ))}
          </select>
          <select name="typ" defaultValue={typ} className="h-8 rounded border border-neutral-300 px-2">
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

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Gruppe</TH>
              <TH>Name</TH>
              <TH>Nr</TH>
              <TH>Typ</TH>
              <TH className="text-right">VK EUR</TH>
              <TH className="text-right">VK US</TH>
              <TH>CITES</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id} className={r.datensatzInaktiv ? "opacity-50" : ""}>
                <TD><Badge>{gruppeLabel(r.artikelgruppe)}</Badge></TD>
                <TD className="font-medium">
                  <Link href={`/artikel/${r.id}`} className="hover:underline">{artikelName(r)}</Link>
                </TD>
                <TD className="font-mono text-xs text-neutral-500">{r.artikelNr ?? "–"}</TD>
                <TD className="text-neutral-500">
                  {r.artikeltyp === "HOLZ" ? "Holz" : r.artikeltyp === "HANDELSWARE" ? "Handel" : "–"}
                </TD>
                <TD className="text-right tabular-nums">{formatMoney(r.vkEur)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(r.vkUs, "USD")}</TD>
                <TD>{r.geschuetztesHolzCites ? "⚠︎" : ""}</TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

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
