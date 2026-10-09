import type { abKontext } from "@/lib/domain/auftrag-ab";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { UnterschriftForm } from "./unterschrift-form";

const T = {
  DE: {
    titel: "Auftragsbestätigung", kunde: "Auftraggeber", bez: "Bezeichnung", menge: "Menge", gesamt: "Gesamt",
    versand: "Versandkosten", netto: "Summe netto", mwst: "MwSt", brutto: "Summe brutto", zahlung: "Zahlungsbedingung",
    akzeptiert: "Hiermit bestelle ich verbindlich die oben aufgeführten Leistungen zu den genannten Preisen und Bedingungen.",
    senden: "Auftrag verbindlich bestätigen",
    fertig: (n: string, z: string) => `Bestätigt von ${n} am ${z}. Vielen Dank für deinen Auftrag!`,
  },
  EN: {
    titel: "Order confirmation", kunde: "Customer", bez: "Description", menge: "Qty", gesamt: "Total",
    versand: "Shipping", netto: "Net total", mwst: "VAT", brutto: "Gross total", zahlung: "Payment terms",
    akzeptiert: "I hereby place a binding order for the items listed above at the stated prices and terms.",
    senden: "Confirm order",
    fertig: (n: string, z: string) => `Confirmed by ${n} on ${z}. Thank you for your order!`,
  },
} as const;

const zahl = (v: string | null) => (v == null ? "" : Number(v).toLocaleString("de-DE", { maximumFractionDigits: 2 }));

/** Öffentliche Ansicht der Auftragsbestätigung zum elektronischen Unterschreiben. */
export function AbAnsicht({ token, ab }: { token: string; ab: NonNullable<Awaited<ReturnType<typeof abKontext>>> }) {
  const d = ab.daten;
  const t = T[d.sprache];
  const cur = d.waehrung;
  return (
    <>
      <div className="text-sm text-muted">{d.firma.firma}</div>
      <h1 className="mt-1 text-xl font-semibold text-navy">{t.titel} {d.nummer}</h1>

      <div className="mt-4 text-sm">
        <div className="text-xs uppercase text-muted">{t.kunde}</div>
        <div className="whitespace-pre-line">{d.kunde.briefkopf || d.kunde.name}</div>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-muted">
            <th className="py-1 pr-2">{t.bez}</th>
            <th className="py-1 pr-2 text-right">{t.menge}</th>
            <th className="py-1 text-right">{t.gesamt}</th>
          </tr>
        </thead>
        <tbody>
          {d.positionen.map((p, i) => (
            <tr key={i} className="border-b border-line align-top">
              <td className="py-1 pr-2">{p.name}{p.beschreibung ? <span className="block text-xs text-muted">{p.beschreibung}</span> : null}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{zahl(p.anzahl)}</td>
              <td className="py-1 text-right tabular-nums">{formatMoney(p.gesamt, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 space-y-0.5 text-right text-sm tabular-nums">
        {d.summen.versand && Number(d.summen.versand) > 0 ? <div>{t.versand}: {formatMoney(d.summen.versand, cur)}</div> : null}
        <div>{t.netto}: {formatMoney(d.summen.netto, cur)}</div>
        {d.steuerpflichtig ? <div>{t.mwst} {zahl(d.summen.mwstSatz)} %: {formatMoney(d.summen.mwst, cur)}</div> : null}
        <div className="font-semibold text-ink">{t.brutto}: {formatMoney(d.summen.brutto, cur)}</div>
      </div>
      {d.zahlungsbedingung ? <p className="mt-2 text-sm text-muted">{t.zahlung}: {d.zahlungsbedingung}</p> : null}

      {ab.abUnterschriebenAm ? (
        <p className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {t.fertig(ab.abUnterschriebenName ?? "", formatDateTime(ab.abUnterschriebenAm))}
        </p>
      ) : (
        <UnterschriftForm token={token} sprache={d.sprache} art="AB" akzeptiert={t.akzeptiert} senden={t.senden} />
      )}
    </>
  );
}
