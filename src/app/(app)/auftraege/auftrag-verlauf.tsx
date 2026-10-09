import { auftragVerlauf } from "@/lib/domain/auftrag-verlauf";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Verlauf } from "../rechnungen/verlauf";

/** Datum/Uhrzeit (Europe/Berlin) getrennt für die Spalten. */
function teile(v: string | Date | null | undefined, mitZeit: boolean): [string, string] {
  if (!v) return ["–", ""];
  if (!mitZeit) return [formatDate(v), ""];
  const [d, t] = formatDateTime(v).split(", ");
  return [d ?? "–", t ?? ""];
}

/** Zeitstempel (wie Ninox-Block „Zeitstempel") + Kennzahlen + chronologischer Verlauf eines Auftrags. */
export async function AuftragVerlauf({ id }: { id: string }) {
  const v = await auftragVerlauf(id);
  if (!v) return null;
  const e = v.eckdaten;
  const stempel: Array<{ k: string; wert: [string, string]; wer?: string | null }> = [
    { k: "Erfasst am", wert: teile(e.erfasstAm ?? e.erstelltAm, false), wer: e.erfasstVon || e.erstelltVon },
    { k: "Geändert am", wert: teile(e.geaendertAm, true), wer: e.geaendertVon },
    { k: "Bauplan-Monat", wert: [e.bauplandatum ? e.bauplandatum.slice(0, 7).split("-").reverse().join("/") : "–", ""] },
    { k: "Modellvorlage vergeben", wert: teile(e.modellvorlageVergeben, true) },
    { k: "SerNr vergeben", wert: teile(e.serNrVergeben, false) },
    { k: "Werkstattbeginn", wert: teile(e.werkstattbeginn, false) },
    { k: "Endmontage", wert: teile(e.endmontagedatum, false) },
    { k: "Versanddatum", wert: teile(e.versanddatum, false) },
    { k: "Rechnungsdatum", wert: teile(e.rechnungsdatum, false) },
    { k: "Zahlungsdatum", wert: teile(e.zahlungsdatum, false) },
  ];
  const kennzahlen: Array<[string, string]> = [
    e.tageSeitWerkstattbeginn != null
      ? ["Tage seit Werkstattbeginn", String(e.tageSeitWerkstattbeginn)]
      : ["Tage Werkstattbeginn → Endmontage", e.tageWerkstatt == null ? "–" : String(e.tageWerkstatt)],
    ["Work %", e.fortschrittProzent == null ? "–" : `${e.fortschrittProzent} %`],
    ["Umsatzerwartung (EUR)", formatMoney(e.umsatzerwartung)],
    ["Stand HE (EUR)", formatMoney(e.standHeWert)],
  ];
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-muted">
            <th className="py-1 pr-3 font-medium" />
            <th className="py-1 pr-3 font-medium">Datum</th>
            <th className="py-1 pr-3 font-medium">Uhrzeit</th>
            <th className="py-1 font-medium">Name</th>
          </tr>
        </thead>
        <tbody>
          {stempel.map((z) => (
            <tr key={z.k} className="border-b border-line last:border-0">
              <td className="py-1 pr-3 text-muted">{z.k}</td>
              <td className="py-1 pr-3 tabular-nums text-ink">{z.wert[0]}</td>
              <td className="py-1 pr-3 tabular-nums text-ink">{z.wert[1]}</td>
              <td className="py-1 text-ink">{z.wer ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full text-sm">
        <tbody>
          {kennzahlen.map(([k, w]) => (
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
