import type { BelegRenderData } from "@/lib/domain/beleg-render";
import { formatDate, formatMoney } from "@/lib/utils";

const T = {
  DE: {
    von: "Von", an: "An", datum: "Datum", lieferdatum: "Lieferdatum", nr: "Nr.", auftrag: "Auftrag", bezug: "Bezug: Rechnung",
    pos: "Pos", bez: "Bezeichnung", menge: "Menge", einzel: "Einzelpreis", rabatt: "Rabatt", gesamt: "Gesamt",
    summePos: "Summe Positionen", gesamtrabatt: "Gesamtrabatt", versand: "Versandkosten", abzug: "abzgl. Anzahlung", vom: "vom", nettoKurz: "netto", nochZuZahlen: "Noch zu zahlen", netto: "Summe netto", mwst: "MwSt",
    brutto: "Summe brutto", anzahlung: "Anzahlung", rechnungsbetrag: "Rechnungsbetrag",
    zahlung: "Zahlungsbedingung", ustId: "USt-IdNr.", steuerNr: "Steuernummer", bank: "Bankverbindung",
    seite: "Seite", erstellt: "Erstellt am", kundenNr: "Kunden-Nr.", bearbeiter: "Bearbeiter", telefon: "Telefon", web: "Internet",
  },
  EN: {
    von: "From", an: "To", datum: "Date", lieferdatum: "Delivery date", nr: "No.", auftrag: "Order", bezug: "Ref.: Invoice",
    pos: "Item", bez: "Description", menge: "Qty", einzel: "Unit price", rabatt: "Discount", gesamt: "Total",
    summePos: "Subtotal", gesamtrabatt: "Overall discount", versand: "Shipping", abzug: "less down payment", vom: "of", nettoKurz: "net", nochZuZahlen: "Amount due", netto: "Net total", mwst: "VAT",
    brutto: "Gross total", anzahlung: "Down payment", rechnungsbetrag: "Amount due",
    zahlung: "Payment terms", ustId: "VAT ID", steuerNr: "Tax number", bank: "Bank details",
    seite: "Page", erstellt: "Created", kundenNr: "Customer no.", bearbeiter: "Contact", telefon: "Phone", web: "Web",
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
        {/* Layout wie das PDF (altes Formular): Logo mittig, Adresse links, Infoblock rechts, Belegart + Nr fett */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-grau.jpg" alt="Nik Huber Guitars" style={{ display: "block", width: "48mm", margin: "0 auto 7mm" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div style={{ width: "55%" }}>
            <div className="muted" style={{ fontSize: 8, marginBottom: 5 }}>
              {data.firma.firma}{firmaZeile ? ` · ${firmaZeile}` : ""}
            </div>
            <pre style={{ margin: 0, font: "inherit", whiteSpace: "pre-wrap" }}>
              {data.kunde.briefkopf
                || [data.kunde.name, data.kunde.strasse, data.kunde.plzOrt, data.kunde.land].filter(Boolean).join("\n")}
            </pre>
          </div>
          <table style={{ width: "38%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                data.kundenNr ? [t.kundenNr, data.kundenNr] : null,
                [t.datum, formatDate(data.datum)],
                data.lieferdatum && (data.art === "rechnung" || data.ohnePreise) ? [t.lieferdatum, formatDate(data.lieferdatum)] : null,
                data.auftragNummer ? [t.auftrag, data.auftragNummer] : null,
                data.referenzNummer ? [t.bezug, data.referenzNummer] : null,
                data.kunde.ustId ? [t.ustId, data.kunde.ustId] : null,
                data.bearbeiter ? [t.bearbeiter, data.bearbeiter] : null,
                data.firma.email ? ["E-Mail", data.firma.email] : null,
              ].filter((z): z is string[] => !!z).map(([k, v]) => (
                <tr key={k}>
                  <td className="muted" style={{ padding: "0 8px 0 0", whiteSpace: "nowrap", verticalAlign: "top" }}>{k}:</td>
                  <td style={{ padding: 0 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h1 style={{ fontSize: 17, margin: "0 0 12px" }}>{data.titel} {data.nummer}</h1>

        {data.kopftext ? (
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{data.kopftext}</p>
        ) : null}

        <table className="pos">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>{t.pos}</th>
              <th>{t.bez}</th>
              <th className="r" style={{ width: "10%" }}>{t.menge}</th>
              {!data.ohnePreise ? <th className="r" style={{ width: "16%" }}>{t.einzel}</th> : null}
              {!data.ohnePreise ? <th className="r" style={{ width: "10%" }}>{t.rabatt}</th> : null}
              {!data.ohnePreise ? <th className="r" style={{ width: "16%" }}>{t.gesamt}</th> : null}
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
                {!data.ohnePreise ? <td className="r">{money(p.einzelpreis)}</td> : null}
                {!data.ohnePreise ? <td className="r">{Number(p.rabattProzent) ? `${Number(p.rabattProzent)} %` : "–"}</td> : null}
                {!data.ohnePreise ? <td className="r">{money(p.gesamt)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>

        {!data.ohnePreise ? (
        <table className="sum" style={{ marginTop: 12, marginLeft: "auto", width: "50%" }}>
          <tbody>
            <tr><td>{t.summePos}</td><td className="r">{money(data.summen.positionen)}</td></tr>
            {data.summen.gesamtrabattAktiv && Number(data.summen.gesamtrabattWert) ? (
              <tr>
                <td>{t.gesamtrabatt} ({Number(data.summen.gesamtrabattProzent)} %)</td>
                <td className="r">− {money(data.summen.gesamtrabattWert)}</td>
              </tr>
            ) : null}
            {data.summen.versand ? (
              <tr>
                <td>{t.versand}{data.summen.versandBezeichnung ? ` (${data.summen.versandBezeichnung})` : ""}</td>
                <td className="r">{money(data.summen.versand)}</td>
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
            {data.abzuege.map((a, i) => (
              <tr key={i}>
                <td>
                  {t.abzug} {a.nummer}{a.datum ? ` ${t.vom} ${formatDate(a.datum)}` : ""}
                  <div className="muted" style={{ fontSize: 9 }}>({t.nettoKurz} {money(a.netto)} + {t.mwst} {money(a.mwst)})</div>
                </td>
                <td className="r">− {money(a.brutto)}</td>
              </tr>
            ))}
            {data.abzuege.length ? (
              <tr style={{ fontWeight: 700, borderTop: "2px solid #333" }}>
                <td>{t.nochZuZahlen}</td><td className="r">{money(data.zahlbetrag)}</td>
              </tr>
            ) : null}
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
        ) : null}

        <div style={{ marginTop: 24, fontSize: 10 }} className="muted">
          {data.steuerHinweis ? <p style={{ margin: "0 0 4px" }}>{data.steuerHinweis}</p> : null}
          {data.zahlungsbedingung ? <p style={{ margin: "0 0 4px" }}>{t.zahlung}: {data.zahlungsbedingung}</p> : null}
        </div>

        {/* Fußzeile wie im PDF */}
        <div className="muted" style={{ marginTop: 40, paddingTop: 6, borderTop: "1px solid #ccc", fontSize: 9, textAlign: "center" }}>
          <div>
            {[data.firma.firma, data.firma.ustId ? `${t.ustId}: ${data.firma.ustId}` : null,
              data.firma.steuerNr ? `${t.steuerNr}: ${data.firma.steuerNr}` : null, firmaZeile].filter(Boolean).join(" – ")}
          </div>
          <div>
            {[data.firma.bank ? `${t.bank}: ${data.firma.bank}` : null, data.firma.iban ? `IBAN: ${data.firma.iban}` : null,
              data.firma.bic ? `BIC: ${data.firma.bic}` : null].filter(Boolean).join(" – ")}
          </div>
          <div>
            {[data.firma.telefon ? `${t.telefon}: ${data.firma.telefon}` : null, data.firma.fax ? `Fax: ${data.firma.fax}` : null,
              data.firma.email ? `E-Mail: ${data.firma.email}` : null, data.firma.webseite ? `${t.web}: ${data.firma.webseite}` : null]
              .filter(Boolean).join(" – ")}
          </div>
        </div>
      </div>
    </>
  );
}
