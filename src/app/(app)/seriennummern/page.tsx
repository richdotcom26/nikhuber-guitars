import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { listSeriennummern, naechsteLfd } from "@/lib/domain/seriennummer";
import { formatDate } from "@/lib/utils";

export default async function SeriennummernPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Number(sp.page) || 1;
  const [{ rows, total, pageCount }, next] = await Promise.all([
    listSeriennummern({ q, page }),
    naechsteLfd(),
  ]);

  return (
    <div>
      <PageHeader
        title="Seriennummern"
        description={`${total} vergeben · nächste laufende Nr: ${next}`}
      />

      <form method="get" className="mb-4 flex items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Suche Seriennr / Auftrag / Kunde" className="h-8 w-72" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>lfd</TH>
              <TH>Seriennummer</TH>
              <TH>Vergabe</TH>
              <TH>Modell</TH>
              <TH>Kunde</TH>
              <TH>vergeben am</TH>
              <TH>Auftrag</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const kunde = r.kdFirma
                || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ")
                || null;
              return (
                <TR key={r.id}>
                  <TD className="tabular-nums text-neutral-500">{r.lfd}</TD>
                  <TD className="font-mono font-medium">{r.anzeige}</TD>
                  <TD>{r.manuell ? <Badge tone="amber">manuell</Badge> : <Badge tone="neutral">auto</Badge>}</TD>
                  <TD className="text-neutral-500">{r.modellName ?? "–"}</TD>
                  <TD>{kunde ? `${kunde}${r.kdOrt ? ` (${r.kdOrt})` : ""}` : "–"}</TD>
                  <TD className="text-neutral-500">{formatDate(r.vergebenAm)}</TD>
                  <TD className="font-mono text-xs">
                    {r.auftragId ? (
                      <Link href={`/auftraege/${r.auftragId}`} className="text-blue-700 hover:underline">
                        {r.auftragNummer}
                      </Link>
                    ) : "–"}
                  </TD>
                </TR>
              );
            })}
            {rows.length === 0 ? (
              <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Seriennummern.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={`/seriennummern?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={`/seriennummern?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-neutral-400">
        Die Vergabe (automatisch oder manuell) erfolgt im jeweiligen Auftrag im Abschnitt Seriennummer.
        Automatisch = nächsthöhere laufende Nummer; das Jahrpräfix kommt aus dem Bauplan-Monat
        (bis 2025 einstellig, ab 2026 zweistellig). Gelöschte Nummern werden nicht neu vergeben.
      </p>
    </div>
  );
}
