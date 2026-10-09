import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkRow } from "@/components/ui/link-row";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { listVerleih, verleihGitarren } from "@/lib/domain/verleih";
import { formatDate, formatDateTime } from "@/lib/utils";
import { VERLEIH_STATUS_LABEL, VERLEIH_STATUS_TON } from "@/lib/verleih-shared";

export default async function VerleihPage({
  searchParams,
}: {
  searchParams: Promise<{ alle?: string }>;
}) {
  const { alle } = await searchParams;
  const mitZurueck = alle === "1";
  const [gitarren, rows] = await Promise.all([verleihGitarren(), listVerleih({ mitZurueck })]);
  const ueberfaellig = rows.filter((r) => r.status === "UEBERFAELLIG").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Verleih-/Testgitarren"
        count={`${gitarren.length} Gitarren · ${rows.filter((r) => r.status !== "ZURUECK").length} unterwegs${ueberfaellig ? ` · ${ueberfaellig} überfällig` : ""}`}
        actions={<Link href="/verleih/neu" className={buttonClasses()}>Neuer Verleih</Link>}
      />

      <Card>
        <CardHeader><CardTitle>Gitarren</CardTitle></CardHeader>
        <CardContent>
          {gitarren.length === 0 ? (
            <p className="text-sm text-muted">
              Keine Verleih-Gitarre. Im Auftrag der Gitarre unter „Kopf“ bei <b>Besonderes</b> „Verleih-/Testgitarre“ wählen.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {gitarren.map((g) => (
                <div key={g.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink">{g.modell ?? "–"}</div>
                      <div className="text-xs text-muted">
                        #{g.seriennummer ?? "–"} ·{" "}
                        <Link href={`/auftraege/${g.id}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">{g.nummer}</Link>
                      </div>
                    </div>
                    {!g.seriennummer ? (
                      <Link href={`/auftraege/${g.id}`} title="Ohne Seriennummer kann keine Übergabevereinbarung erzeugt werden.">
                        <Badge tone="amber">Seriennummer fehlt</Badge>
                      </Link>
                    ) : null}
                    {g.offen ? (
                      <Badge tone={VERLEIH_STATUS_TON[g.offen.status]}>{VERLEIH_STATUS_LABEL[g.offen.status]}</Badge>
                    ) : <Badge tone="green">verfügbar</Badge>}
                  </div>
                  {g.offen ? (
                    <Link href={`/verleih/${g.offen.id}`} className="mt-2 block text-sm font-semibold text-blue-700 hover:underline">
                      bei {g.offen.kundeName}{g.offen.verfuegbarBis ? ` bis ${formatDate(g.offen.verfuegbarBis)}` : ""}
                    </Link>
                  ) : (
                    <Link href={`/verleih/neu?gitarre=${g.id}`} className="mt-2 block text-sm font-semibold text-blue-700 hover:underline">
                      → verleihen
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <form method="get" className="mb-3 flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="alle" value="1" defaultChecked={mitZurueck} />
            zurückgegebene anzeigen
          </label>
          <Button size="sm" variant="outline" type="submit">Filtern</Button>
        </form>
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Gitarre</TH>
                <TH>Kontakt</TH>
                <TH>Versendet</TH>
                <TH>Zur Verfügung bis</TH>
                <TH>Zurück</TH>
                <TH>Status</TH>
                <TH>Vereinbarung</TH>
                <TH>Erinnerung</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <LinkRow key={r.id} href={`/verleih/${r.id}`}>
                  <TD>
                    {r.modell ?? "–"}
                    <span className="block text-xs text-muted">#{r.seriennummer ?? "–"}</span>
                  </TD>
                  <TD>{r.kundeName}</TD>
                  <TD className="tabular-nums">{formatDate(r.versendetAm)}</TD>
                  <TD className={r.status === "UEBERFAELLIG" ? "tabular-nums font-semibold text-red-700" : "tabular-nums"}>
                    {formatDate(r.verfuegbarBis)}
                  </TD>
                  <TD className="tabular-nums">{formatDate(r.zurueckAm)}</TD>
                  <TD><Badge tone={VERLEIH_STATUS_TON[r.status]}>{VERLEIH_STATUS_LABEL[r.status]}</Badge></TD>
                  <TD>
                    {r.unterschriebenAm ? <Badge tone="green">unterschrieben</Badge>
                      : r.unterschriftAngefordertAm ? <Badge tone="amber">gesendet</Badge>
                      : <span className="text-xs text-muted">–</span>}
                  </TD>
                  <TD className="text-xs text-muted">
                    {r.letzteErinnerungAm ? `${formatDateTime(r.letzteErinnerungAm)} (${r.erinnerungen}×)` : "–"}
                  </TD>
                </LinkRow>
              ))}
              {rows.length === 0 ? (
                <TR><TD colSpan={8} className="py-6 text-center text-neutral-400">Keine Verleih-Vorgänge.</TD></TR>
              ) : null}
            </TBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
