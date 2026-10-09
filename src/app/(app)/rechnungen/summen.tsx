import { formatMoney } from "@/lib/utils";
import type { UsdEurKurs } from "@/lib/domain/kurs";

/** Summenkacheln über der Rechnungsliste (netto, gebuchte Belege der aktuellen Auswahl). */
export function RechnungSummen({
  summen, kurs,
}: {
  summen: { eur: number; usd: number; gesamtEur: number };
  kurs: UsdEurKurs;
}) {
  const kachel = (label: string, wert: string, hinweis?: string, stark = false) => (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      <div className="text-xs text-muted">{label}</div>
      <div className={stark ? "text-xl font-semibold tabular-nums text-navy" : "text-lg font-semibold tabular-nums text-ink"}>{wert}</div>
      {hinweis ? <div className="mt-0.5 text-[11px] text-muted">{hinweis}</div> : null}
    </div>
  );
  const kursText = `1 USD = ${kurs.faktor.toLocaleString("de-DE", { maximumFractionDigits: 4 })} EUR`
    + (kurs.quelle === "EZB" ? ` (EZB${kurs.datum ? `, ${kurs.datum.split("-").reverse().join(".")}` : ""})` : " (Einstellungen)");
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {kachel("Rechnungen in EUR (netto)", formatMoney(summen.eur, "EUR"))}
      {kachel("Rechnungen in USD (netto)", formatMoney(summen.usd, "USD"))}
      {kachel("Gesamt in EUR (netto)", formatMoney(summen.gesamtEur, "EUR"), kursText, true)}
    </div>
  );
}
