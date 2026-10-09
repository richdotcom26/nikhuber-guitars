import { formatMoney } from "@/lib/utils";
import type { UsdEurKurs } from "@/lib/domain/kurs";

/** Kompakte Summenfelder neben der Suche (netto, gebuchte Belege der aktuellen Auswahl). */
export function RechnungSummen({
  summen, kurs,
}: {
  summen: { eur: number; usd: number; gesamtEur: number };
  kurs: UsdEurKurs;
}) {
  const kursText = `1 USD = ${kurs.faktor.toLocaleString("de-DE", { maximumFractionDigits: 4 })} EUR`
    + (kurs.quelle === "EZB" ? ` (EZB${kurs.datum ? `, ${kurs.datum.split("-").reverse().join(".")}` : ""})` : " (Einstellungen)");
  const feld = (label: string, wert: string, stark = false, title?: string) => (
    <div
      title={title}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs shadow-sm"
    >
      <span className="text-muted">{label}</span>
      <span className={"tabular-nums " + (stark ? "font-semibold text-navy" : "font-medium text-ink")}>{wert}</span>
    </div>
  );
  return (
    <>
      {feld("EUR netto", formatMoney(summen.eur, "EUR"))}
      {feld("USD netto", formatMoney(summen.usd, "USD"))}
      {feld("Gesamt EUR", formatMoney(summen.gesamtEur, "EUR"), true, kursText)}
    </>
  );
}
