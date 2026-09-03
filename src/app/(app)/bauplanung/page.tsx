import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  aktuellerMonat, monatLabel, monatsBoard, monatVerschieben, ungeplanteAuftraege,
  type Ampel,
} from "@/lib/domain/bauplanung";
import { kundeKurz } from "@/lib/adressen-shared";
import { fortschrittFarbe } from "@/lib/auftrag-shared";
import { formatMoney } from "@/lib/utils";
import { AssignMonat, BandEditor, MoveMonat } from "./bauplan-controls";

const AMPEL: Record<Ampel, { tone: "neutral" | "green" | "amber" | "red"; label: string }> = {
  leer: { tone: "neutral", label: "leer" },
  unter: { tone: "amber", label: "unter Soll" },
  im_band: { tone: "green", label: "im Band" },
  ueber: { tone: "red", label: "über Kapazität" },
  kein_band: { tone: "neutral", label: "kein Band" },
};

export default async function BauplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const monat = /^\d{4}-\d{2}$/.test(sp.monat ?? "") ? sp.monat! : aktuellerMonat();
  const q = sp.q?.trim() ?? "";

  const [board, ungeplant] = await Promise.all([
    monatsBoard(monat),
    ungeplanteAuftraege(q, 40),
  ]);

  const prev = monatVerschieben(monat, -1);
  const next = monatVerschieben(monat, 1);
  const navLink = (m: string) => `/bauplanung?monat=${m}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bauplanung"
        description={`${board.total.anzahl} Aufträge · Planwert ${formatMoney(board.total.summe)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={navLink(prev)} className={buttonClasses("outline", "sm")}>◀</Link>
            <span className="min-w-40 text-center text-sm font-medium">{monatLabel(monat)}</span>
            <Link href={navLink(next)} className={buttonClasses("outline", "sm")}>▶</Link>
            {monat !== aktuellerMonat() ? (
              <Link href={navLink(aktuellerMonat())} className="text-xs text-blue-700 hover:underline">heute</Link>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Kapazität je Modellgruppe</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Modellgruppe</TH>
                <TH className="w-20 text-right">Anzahl</TH>
                <TH className="w-32">Soll / Monat</TH>
                <TH className="w-36">Status</TH>
                <TH className="w-32 text-right">Σ Planwert</TH>
              </TR>
            </THead>
            <TBody>
              {board.gruppen.map((g) => {
                const a = AMPEL[g.ampel];
                return (
                  <TR key={g.name}>
                    <TD className="font-medium">{g.name}</TD>
                    <TD className="text-right tabular-nums">{g.anzahl}</TD>
                    <TD className="text-neutral-500">
                      {g.id
                        ? <BandEditor id={g.id} min={g.min} max={g.max} />
                        : "–"}
                    </TD>
                    <TD><Badge tone={a.tone}>{a.label}</Badge></TD>
                    <TD className="text-right tabular-nums">{formatMoney(g.summe)}</TD>
                  </TR>
                );
              })}
              {board.gruppen.length === 0 ? (
                <TR><TD colSpan={5} className="py-4 text-center text-neutral-400">Kein Auftrag in diesem Monat.</TD></TR>
              ) : (
                <TR className="border-t-2 border-neutral-200 font-medium">
                  <TD>Summe</TD>
                  <TD className="text-right tabular-nums">{board.total.anzahl}</TD>
                  <TD colSpan={2} />
                  <TD className="text-right tabular-nums">{formatMoney(board.total.summe)}</TD>
                </TR>
              )}
            </TBody>
          </Table>
          <p className="mt-2 text-xs text-neutral-400">
            Soll-Band anklicken zum Bearbeiten. Planwert = Ist-Netto bzw. Modell-Grundpreis
            (Vertriebsweg), auf EUR normiert.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aufträge im {monatLabel(monat)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH className="w-28">Nr</TH>
                <TH>Kunde</TH>
                <TH>Modell</TH>
                <TH className="w-28">Gruppe</TH>
                <TH className="w-16 text-right">Work</TH>
                <TH className="w-28 text-right">Planwert</TH>
                <TH className="w-28 text-right">Aktion</TH>
              </TR>
            </THead>
            <TBody>
              {board.auftraege.map((a) => (
                <TR key={a.id}>
                  <TD className="font-mono text-xs">
                    <Link href={`/auftraege/${a.id}`} className="text-blue-700 hover:underline">{a.nummer}</Link>
                  </TD>
                  <TD>{a.kunde ?? "–"}</TD>
                  <TD className="text-neutral-500">{a.modellName ?? "–"}</TD>
                  <TD className="text-neutral-500">{a.gruppeName === "(ohne Modellgruppe)" ? "–" : a.gruppeName}</TD>
                  <TD className="text-right">
                    <span className="rounded px-1 py-0.5 text-xs tabular-nums" style={{ background: fortschrittFarbe(a.fortschrittProzent) }}>
                      {a.fortschrittProzent == null ? "–" : `${a.fortschrittProzent}%`}
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{formatMoney(a.planwert)}</TD>
                  <TD className="text-right"><MoveMonat id={a.id} monat={monat} /></TD>
                </TR>
              ))}
              {board.auftraege.length === 0 ? (
                <TR><TD colSpan={7} className="py-4 text-center text-neutral-400">Keine Aufträge.</TD></TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ungeplante Produktionsaufträge ({ungeplant.length})</CardTitle></CardHeader>
        <CardContent>
          <form method="get" className="mb-3 flex items-center gap-2">
            <input type="hidden" name="monat" value={monat} />
            <Input name="q" defaultValue={q} placeholder="Nr / Kunde suchen" className="h-8 w-64" />
            <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
          </form>
          <Table>
            <THead>
              <TR>
                <TH className="w-28">Nr</TH>
                <TH>Kunde</TH>
                <TH>Modell</TH>
                <TH className="w-28">Gruppe</TH>
                <TH className="w-32 text-right">Aktion</TH>
              </TR>
            </THead>
            <TBody>
              {ungeplant.map((a) => (
                <TR key={a.id}>
                  <TD className="font-mono text-xs">
                    <Link href={`/auftraege/${a.id}`} className="text-blue-700 hover:underline">{a.nummer}</Link>
                  </TD>
                  <TD>{kundeKurz(a)}</TD>
                  <TD className="text-neutral-500">{a.modellName ?? "–"}</TD>
                  <TD className="text-neutral-500">{a.gruppeName ?? "–"}</TD>
                  <TD className="text-right"><AssignMonat id={a.id} monat={monat} /></TD>
                </TR>
              ))}
              {ungeplant.length === 0 ? (
                <TR><TD colSpan={5} className="py-4 text-center text-neutral-400">Alle Produktionsaufträge sind eingeplant.</TD></TR>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
