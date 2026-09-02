import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  monatsRechnungen, monatsUebersicht, reportJahre,
} from "@/lib/domain/report";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; monat?: string }>;
}) {
  const sp = await searchParams;
  const jahre = await reportJahre();
  const jahr = Number(sp.jahr) || jahre[0] || new Date().getFullYear();
  const monat = sp.monat ? Number(sp.monat) : null;

  const { zeilen, jahresSumme } = await monatsUebersicht(jahr);
  const maxBezahlt = Math.max(...zeilen.map((z) => z.bezahlt), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report Monat"
        description="Umsatz-Kennzahlen je Monat, live aus den Rechnungen."
        actions={
          <a href={`/report/export?jahr=${jahr}${monat ? `&monat=${monat}` : ""}`} className={buttonClasses()}>
            Excel-Export
          </a>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {jahre.map((j) => (
          <Link
            key={j}
            href={`/report?jahr=${j}`}
            className={
              "rounded-full border px-2.5 py-1 text-xs " +
              (j === jahr ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100")
            }
          >
            {j}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Umsatz {jahr} (bezahlt je Monat)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1" style={{ height: 140 }}>
            {zeilen.map((z) => (
              <Link
                key={z.monat}
                href={`/report?jahr=${jahr}&monat=${z.monat}`}
                className="group flex flex-1 flex-col items-center justify-end"
                title={`${z.label}: ${formatMoney(z.bezahlt)}`}
              >
                <div
                  className={"w-full rounded-t " + (z.monat === monat ? "bg-neutral-900" : "bg-neutral-300 group-hover:bg-neutral-500")}
                  style={{ height: `${Math.max((z.bezahlt / maxBezahlt) * 120, 2)}px` }}
                />
                <span className="mt-1 text-[10px] text-neutral-500">{z.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Monats-KPIs {jahr}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Monat</TH>
                <TH className="text-right">Anz. RG</TH>
                <TH className="text-right">Storno</TH>
                <TH className="text-right">Gutschr.</TH>
                <TH className="text-right">Positionen netto</TH>
                <TH className="text-right">Bezahlt</TH>
                <TH className="text-right">Kumuliert</TH>
              </TR>
            </THead>
            <TBody>
              {zeilen.map((z) => (
                <TR key={z.monat} className={z.monat === monat ? "bg-neutral-50" : ""}>
                  <TD>
                    <Link href={`/report?jahr=${jahr}&monat=${z.monat}`} className="font-medium hover:underline">
                      {z.label}
                    </Link>
                  </TD>
                  <TD className="text-right tabular-nums">{z.anzahlRg || "–"}</TD>
                  <TD className="text-right tabular-nums text-neutral-500">{z.anzahlStorno || "–"}</TD>
                  <TD className="text-right tabular-nums text-neutral-500">{z.anzahlGutschrift || "–"}</TD>
                  <TD className="text-right tabular-nums">{z.positionenNetto ? formatMoney(z.positionenNetto) : "–"}</TD>
                  <TD className="text-right tabular-nums">{z.bezahlt ? formatMoney(z.bezahlt) : "–"}</TD>
                  <TD className="text-right tabular-nums text-neutral-500">{formatMoney(z.kumuliertBezahlt)}</TD>
                </TR>
              ))}
              <TR className="border-t-2 border-neutral-300 font-semibold">
                <TD>{jahresSumme.label}</TD>
                <TD className="text-right tabular-nums">{jahresSumme.anzahlRg}</TD>
                <TD className="text-right tabular-nums">{jahresSumme.anzahlStorno}</TD>
                <TD className="text-right tabular-nums">{jahresSumme.anzahlGutschrift}</TD>
                <TD className="text-right tabular-nums">{formatMoney(jahresSumme.positionenNetto)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(jahresSumme.bezahlt)}</TD>
                <TD className="text-right tabular-nums">{formatMoney(jahresSumme.kumuliertBezahlt)}</TD>
              </TR>
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {monat ? <MonatDetail jahr={jahr} monat={monat} /> : null}
    </div>
  );
}

async function MonatDetail({ jahr, monat }: { jahr: number; monat: number }) {
  const rows = await monatsRechnungen(jahr, monat);
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechnungen {MONATE[monat - 1]} {jahr} ({rows.length})</CardTitle>
        <Link href={`/report?jahr=${jahr}`} className={buttonClasses("ghost", "sm")}>× Monat</Link>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>RG-Nr</TH><TH>Belegart</TH><TH>Datum</TH><TH>Kunde</TH>
              <TH>Whg</TH><TH className="text-right">Positionen netto</TH>
              <TH className="text-right">Zahlbetrag</TH><TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">
                  <Link href={`/rechnungen/${r.id}`} className="hover:underline">{r.nummer}</Link>
                </TD>
                <TD className="text-neutral-500">{r.belegart}</TD>
                <TD className="text-neutral-500">{formatDate(r.rechnungsdatum)}</TD>
                <TD>{r.kunde ?? "–"}</TD>
                <TD>{r.waehrung ?? "–"}</TD>
                <TD className="text-right tabular-nums">{formatMoney(r.positionenNetto, r.waehrung === "USD" ? "USD" : "EUR")}</TD>
                <TD className="text-right tabular-nums">{r.zahlbetrag != null ? formatMoney(r.zahlbetrag) : "–"}</TD>
                <TD className="text-neutral-500">{r.status}</TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={8} className="py-4 text-center text-neutral-400">Keine Rechnungen in diesem Monat.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
