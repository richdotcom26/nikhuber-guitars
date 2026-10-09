import { auftragVerlauf } from "@/lib/domain/auftrag-verlauf";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Verlauf } from "../rechnungen/verlauf";

/** Zeitstempel (wie Ninox-Block „Zeitstempel") + chronologischer Verlauf eines Auftrags. */
export async function AuftragVerlauf({ id }: { id: string }) {
  const v = await auftragVerlauf(id);
  if (!v) return null;
  const e = v.eckdaten;
  const zeilen: Array<[string, string]> = [
    ["Erfasst am", e.erfasstAm ? `${formatDate(e.erfasstAm)}${e.erfasstVon ? ` · ${e.erfasstVon}` : ""}` : "–"],
    ["Erstellt am", `${formatDateTime(e.erstelltAm)}${e.erstelltVon ? ` · ${e.erstelltVon}` : ""}`],
    ["Geändert am", `${formatDateTime(e.geaendertAm)}${e.geaendertVon ? ` · ${e.geaendertVon}` : ""}`],
    ["Bauplan-Monat", e.bauplandatum ? e.bauplandatum.slice(0, 7).replace("-", "/") : "–"],
    ["Modellvorlage vergeben", e.modellvorlageVergeben ? formatDateTime(e.modellvorlageVergeben) : "–"],
    ["SerNr vergeben", formatDate(e.serNrVergeben)],
    ["Werkstattbeginn", formatDate(e.werkstattbeginn)],
    ["Endmontage", formatDate(e.endmontagedatum)],
    ["Tage Werkstattbeginn → Endmontage", e.tageWerkstatt == null ? "–" : String(e.tageWerkstatt)],
    ...(e.tageSeitWerkstattbeginn != null ? [["Tage seit Werkstattbeginn", String(e.tageSeitWerkstattbeginn)] as [string, string]] : []),
    ["Versanddatum", formatDate(e.versanddatum)],
    ["Rechnungsdatum", formatDate(e.rechnungsdatum)],
    ["Zahlungsdatum", formatDate(e.zahlungsdatum)],
    ["Work %", e.fortschrittProzent == null ? "–" : `${e.fortschrittProzent} %`],
    ["Umsatzerwartung (EUR)", formatMoney(e.umsatzerwartung)],
    ["Stand HE (EUR)", formatMoney(e.standHeWert)],
  ];
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {zeilen.map(([k, w]) => (
            <tr key={k} className="border-b border-line last:border-0">
              <td className="py-1 pr-3 text-muted">{k}</td>
              <td className="py-1 text-right tabular-nums text-ink">{w}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line pt-3">
        <Verlauf ereignisse={v.ereignisse} />
      </div>
    </div>
  );
}
