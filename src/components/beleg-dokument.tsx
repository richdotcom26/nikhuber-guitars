import type { BelegRenderData } from "@/lib/domain/beleg-render";
import { formatDate, formatMoney } from "@/lib/utils";

const T = {
  DE: {
    von: "Von", an: "An", datum: "Datum", nr: "Nr.", auftrag: "Auftrag",
    pos: "Pos", bez: "Bezeichnung", menge: "Menge", einzel: "Einzelpreis", rabatt: "Rabatt", gesamt: "Gesamt",
    summePos: "Summe Positionen", gesamtrabatt: "Gesamtrabatt", netto: "Summe netto", mwst: "MwSt",
    brutto: "Summe brutto", anzahlung: "Anzahlung", rechnungsbetrag: "Rechnungsbetrag",
    zahlung: "Zahlungsbedingung", ustId: "USt-IdNr.", steuerNr: "Steuernummer", bank: "Bankverbindung",
    seite: "Seite", erstellt: "Erstellt am",
  },
  EN: {
    von: "From", an: "To", datum: "Date", nr: "No.", auftrag: "Order",
    pos: "Item", bez: "Description", menge: "Qty", einzel: "Unit price", rabatt: "Discount", gesamt: "Total",
    summePos: "Subtotal", gesamtrabatt: "Overall discount", netto: "Net total", mwst: "VAT",
    brutto: "Gross total", anzahlung: "Down payment", rechnungsbetrag: "Amount due",
    zahlung: "Payment terms", ustId: "VAT ID", steuerNr: "Tax number", bank: "Bank details",
    seite: "Page", erstellt: "Created",
  },
};

export function BelegDokument({ data }: { data: BelegRenderData }) {
  const t = T[data.sprache];
  const cur = data.waehrung;
  const money = (v: string | number | null | undefined) => formatMoney(v, cur);
  const firmaZeile = [data.firma.strasse, [data.firma.plz, data.firma.ort].filter(Boolean).join(" "), data.firma.land]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 16mm; }
        @media print { .no-print { display: none !important; } body { background: #fff; } }
        .beleg { max-width: 186mm; margin: 0 auto; color: #111; font-size: 11px; line-height: 1.45; }
        .beleg h1 { font-size: 20px; margin: 0 0 2px; }
        .beleg table { width: 100%; border-collapse: collapse; }
        .beleg .pos th, .beleg .pos td { padding: 5px 6px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
        .beleg .pos th { border-bottom: 2px solid #333; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
        .beleg .r { text-align: right; }
        .beleg .sum td { padding: 3px 6px; }
        .beleg .muted { color: #666; }
      `}</style>

      <div className="beleg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{data.firma.firma}</div>
            <div className="muted">{firmaZeile}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1>{data.titel}</h1>
            <div>{t.nr} {data.nummer}</div>
            <div className="muted">{t.datum}: {formatDate(data.datum)}</div>
            {data.auftragNummer ? <div className="muted">{t.auftrag}: {data.auftragNummer}</div> : null}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div className="muted" style={{ fontSize: 9, marginBottom: 2 }}>
            {data.firma.firma}{firmaZeile ? ` · ${firmaZeile}` : ""}
          </div>
          <pre style={{ margin: 0, font: "inherit", whiteSpace: "pre-wrap" }}>
            {data.kunde.briefkopf
              || [data.kunde.name, data.kunde.strasse, data.kunde.plzOrt, data.kunde.land].filter(Boolean).join("\n")}
          </pre>
          {data.kunde.ustId ? <div className="muted">{t.ustId}: {data.kunde.ustId}</div> : null}
        </div>

        {data.kopftext ? (
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{data.kopftext}</p>
        ) : null}

        <table className="pos">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>{t.pos}</th>
              <th>{t.bez}</th>
              <th className="r" style={{ width: "10%" }}>{t.menge}</th>
              <th className="r" style={{ width: "16%" }}>{t.einzel}</th>
              <th className="r" style={{ width: "10%" }}>{t.rabatt}</th>
              <th className="r" style={{ width: "16%" }}>{t.gesamt}</th>
            </tr>
          </thead>
          <tbody>
            {data.positionen.map((p, i) => (
              <tr key={i}>
                <td>{p.pos ?? ""}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  {p.beschreibung ? <div className="muted">{p.beschreibung}</div> : null}
                </td>
                <td className="r">{Number(p.anzahl)}</td>
                <td className="r">{money(p.einzelpreis)}</td>
                <td className="r">{Number(p.rabattProzent) ? `${Number(p.rabattProzent)} %` : "–"}</td>
                <td className="r">{money(p.gesamt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="sum" style={{ marginTop: 12, marginLeft: "auto", width: "50%" }}>
          <tbody>
            <tr><td>{t.summePos}</td><td className="r">{money(data.summen.positionen)}</td></tr>
            {data.summen.gesamtrabattAktiv && Number(data.summen.gesamtrabattWert) ? (
              <tr>
                <td>{t.gesamtrabatt} ({Number(data.summen.gesamtrabattProzent)} %)</td>
                <td className="r">− {money(data.summen.gesamtrabattWert)}</td>
              </tr>
            ) : null}
            <tr><td>{t.netto}</td><td className="r">{money(data.summen.netto)}</td></tr>
            <tr>
              <td>{t.mwst} ({data.steuerpflichtig ? `${Number(data.summen.mwstSatz)} %` : "0 %"})</td>
              <td className="r">{money(data.summen.mwst)}</td>
            </tr>
            <tr style={{ fontWeight: 700, borderTop: "2px solid #333" }}>
              <td>{t.brutto}</td><td className="r">{money(data.summen.brutto)}</td>
            </tr>
            {data.anzahlung ? (
              <>
                <tr>
                  <td>{t.anzahlung}{data.anzahlung.datum ? ` (${formatDate(data.anzahlung.datum)})` : ""}</td>
                  <td className="r">− {money(data.anzahlung.brutto)}</td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>{t.rechnungsbetrag}</td><td className="r">{money(data.anzahlung.rechnungsbetrag)}</td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <div style={{ marginTop: 24, fontSize: 10 }} className="muted">
          {data.steuerHinweis ? <p style={{ margin: "0 0 4px" }}>{data.steuerHinweis}</p> : null}
          {data.zahlungsbedingung ? <p style={{ margin: "0 0 4px" }}>{t.zahlung}: {data.zahlungsbedingung}</p> : null}
          <p style={{ margin: "8px 0 0" }}>
            {data.firma.firma}
            {data.firma.steuerNr ? ` · ${t.steuerNr}: ${data.firma.steuerNr}` : ""}
          </p>
          {data.firma.bank ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{t.bank}: {data.firma.bank}</p> : null}
        </div>
      </div>
    </>
  );
}
