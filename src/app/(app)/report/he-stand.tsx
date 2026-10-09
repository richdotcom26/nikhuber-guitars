import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AUFTRAG_STATUS_LABEL, type AuftragStatus } from "@/lib/auftrag-shared";
import { heStandLive, heStichtagPositionen, listHeStichtage } from "@/lib/domain/he-stichtag";
import { formatDate, formatMoney } from "@/lib/utils";

const monatLabel = (m: string) => m.replace("-", "/");

/** Stand HE: Live-Wert + unveränderbare Monatsend-Stichtage (Cron am letzten Tag des Monats). */
export async function HeStand({ basis, detail }: { basis: string; detail: string | null }) {
  const [live, stichtage] = await Promise.all([heStandLive(), listHeStichtage()]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stand HE (halbfertige Erzeugnisse)</CardTitle>
        <span className="text-sm text-muted">
          heute: {live.zeilen.length} Gitarren · <b className="text-ink">{formatMoney(live.he)}</b>
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted">
          HE-Wert = Umsatzerwartung (EUR) × Work % für alle Gitarren „In Werkstatt“ und „Bei Nicl“. Am letzten Tag
          jedes Monats wird der Stand automatisch festgeschrieben und ist danach nicht mehr veränderbar.
        </p>
        <Table>
          <THead>
            <TR>
              <TH>Monat</TH><TH>Stichtag</TH><TH className="text-right">Gitarren</TH>
              <TH className="text-right">Umsatzerwartung</TH><TH className="text-right">HE-Wert</TH><TH />
            </TR>
          </THead>
          <TBody>
            {stichtage.map((s) => (
              <TR key={s.monat}>
                <TD className="font-semibold">{monatLabel(s.monat)}</TD>
                <TD>{formatDate(s.stichtag)}</TD>
                <TD className="text-right tabular-nums">{s.anzahl}</TD>
                <TD className="text-right tabular-nums">{formatMoney(s.umsatzerwartungEur)}</TD>
                <TD className="text-right font-semibold tabular-nums">{formatMoney(s.heWertEur)}</TD>
                <TD className="text-right">
                  <Link href={`${basis}&he=${s.monat}`} className="text-sm font-semibold text-blue-700 hover:underline">Details</Link>
                </TD>
              </TR>
            ))}
            {stichtage.length === 0 ? (
              <TR><TD colSpan={6} className="py-4 text-center text-neutral-400">Noch kein Stichtag festgeschrieben — der erste folgt am Monatsende.</TD></TR>
            ) : null}
          </TBody>
        </Table>
        {detail ? <HeDetail monat={detail} basis={basis} /> : null}
      </CardContent>
    </Card>
  );
}

async function HeDetail({ monat, basis }: { monat: string; basis: string }) {
  const rows = await heStichtagPositionen(monat);
  return (
    <div className="space-y-2 border-t border-line pt-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">Stichtag {monatLabel(monat)} ({rows.length})</span>
        <Link href={basis} className={buttonClasses("ghost", "sm")}>× schließen</Link>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Auftrag</TH><TH>SerNr</TH><TH>Modell</TH><TH>Kunde</TH><TH>Status</TH>
            <TH className="text-right">Work %</TH><TH className="text-right">Umsatzerwartung</TH><TH className="text-right">HE-Wert</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="font-mono text-[13px]">
                {r.auftragId
                  ? <Link href={`/auftraege/${r.auftragId}`} className="font-semibold text-blue-700 hover:underline">{r.auftragNummer}</Link>
                  : r.auftragNummer}
              </TD>
              <TD>{r.seriennummer ?? "–"}</TD>
              <TD>{r.modell ?? "–"}</TD>
              <TD>{r.kunde ?? "–"}</TD>
              <TD className="text-muted">{AUFTRAG_STATUS_LABEL[r.status as AuftragStatus] ?? r.status}</TD>
              <TD className="text-right tabular-nums">{r.workProzent ?? 0} %</TD>
              <TD className="text-right tabular-nums">{formatMoney(r.umsatzerwartungEur)}</TD>
              <TD className="text-right tabular-nums">{formatMoney(r.heWertEur)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
