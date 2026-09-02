import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  BM_KATEGORIE, BM_KATEGORIE_LABEL, EINHEIT_LABEL, type BmKategorie, type Einheit,
} from "@/lib/betriebsmittel-shared";
import { listBetriebsmittel } from "@/lib/domain/betriebsmittel";
import { formatMoney } from "@/lib/utils";
import { MengeInline } from "./menge-inline";

export default async function BetriebsmittelPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategorie?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const kategorie = sp.kategorie ?? "";
  const page = Number(sp.page) || 1;

  const { rows, total, wertSumme, pageCount } = await listBetriebsmittel({ q, kategorie, page });

  const linkWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ q, kategorie, ...patch })) if (val) p.set(k, val);
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

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Bezeichnung</TH>
              <TH>Kategorie</TH>
              <TH>Hersteller</TH>
              <TH className="text-right">Menge</TH>
              <TH className="text-right">EK</TH>
              <TH className="text-right">Wert</TH>
              <TH className="w-20 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">
                  <Link href={`/betriebsmittel/${r.id}`} className="hover:underline">{r.bezeichnung}</Link>
                  {r.artikelnummer ? <span className="ml-1 text-xs text-neutral-400">{r.artikelnummer}</span> : null}
                </TD>
                <TD>
                  {r.produktkategorie
                    ? <Badge tone="neutral">{BM_KATEGORIE_LABEL[r.produktkategorie as BmKategorie]}</Badge>
                    : <span className="text-neutral-400">–</span>}
                </TD>
                <TD className="text-neutral-500">{r.hersteller ?? "–"}</TD>
                <TD className="text-right">
                  <MengeInline id={r.id} menge={r.menge} einheit={r.einheit ? EINHEIT_LABEL[r.einheit as Einheit] : ""} />
                </TD>
                <TD className="text-right tabular-nums text-neutral-500">{formatMoney(r.einkaufspreis)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(r.wert)}</TD>
                <TD className="text-right">
                  <Link href={`/betriebsmittel/${r.id}`} className="text-xs text-blue-700 hover:underline">bearbeiten</Link>
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Betriebsmittel.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

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
