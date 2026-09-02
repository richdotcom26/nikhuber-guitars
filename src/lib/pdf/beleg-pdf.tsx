import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import type { BelegRenderData } from "@/lib/domain/beleg-render";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * Beleg als echtes PDF (server-seitig via @react-pdf/renderer gerendert).
 * Layout an `components/beleg-dokument.tsx` angelehnt. Font: eingebautes Helvetica.
 * Für strikte PDF/A-Konformität beim ZUGFeRD-Schritt ggf. eine TTF einbetten.
 */

const T = {
  DE: {
    datum: "Datum", nr: "Nr.", auftrag: "Auftrag",
    pos: "Pos", bez: "Bezeichnung", menge: "Menge", einzel: "Einzelpreis", rabatt: "Rabatt", gesamt: "Gesamt",
    summePos: "Summe Positionen", gesamtrabatt: "Gesamtrabatt", netto: "Summe netto", mwst: "MwSt",
    brutto: "Summe brutto", anzahlung: "Anzahlung", rechnungsbetrag: "Rechnungsbetrag",
    zahlung: "Zahlungsbedingung", ustId: "USt-IdNr.", steuerNr: "Steuernummer", bank: "Bankverbindung",
    seite: "Seite von",
  },
  EN: {
    datum: "Date", nr: "No.", auftrag: "Order",
    pos: "Item", bez: "Description", menge: "Qty", einzel: "Unit price", rabatt: "Discount", gesamt: "Total",
    summePos: "Subtotal", gesamtrabatt: "Overall discount", netto: "Net total", mwst: "VAT",
    brutto: "Gross total", anzahlung: "Down payment", rechnungsbetrag: "Amount due",
    zahlung: "Payment terms", ustId: "VAT ID", steuerNr: "Tax number", bank: "Bank details",
    seite: "Page of",
  },
};

const s = StyleSheet.create({
  page: { fontSize: 9, color: "#111", padding: "18mm 16mm", lineHeight: 1.45 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  firma: { fontWeight: 700, fontSize: 11 },
  muted: { color: "#666" },
  titel: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  block: { marginBottom: 16 },
  kopftext: { marginBottom: 12 },
  th: {
    flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#333",
    paddingBottom: 3, fontSize: 8, textTransform: "uppercase",
  },
  td: {
    flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd",
    paddingVertical: 4, alignItems: "flex-start",
  },
  cPos: { width: "7%" },
  cBez: { width: "45%" },
  cMenge: { width: "10%", textAlign: "right" },
  cEinzel: { width: "16%", textAlign: "right" },
  cRabatt: { width: "9%", textAlign: "right" },
  cGesamt: { width: "13%", textAlign: "right" },
  sumWrap: { marginTop: 10, marginLeft: "auto", width: "55%" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  sumStrong: { fontWeight: 700, borderTopWidth: 1.5, borderTopColor: "#333", marginTop: 2, paddingTop: 3 },
  fuss: { marginTop: 22, fontSize: 8, color: "#666" },
  seite: {
    position: "absolute", bottom: "10mm", left: "16mm", right: "16mm",
    textAlign: "center", fontSize: 8, color: "#999",
  },
});

export function BelegPdf({ data }: { data: BelegRenderData }) {
  const t = T[data.sprache];
  const cur = data.waehrung;
  const money = (v: string | number | null | undefined) => formatMoney(v, cur);
  const firmaZeile = [
    data.firma.strasse,
    [data.firma.plz, data.firma.ort].filter(Boolean).join(" "),
    data.firma.land,
  ].filter(Boolean).join(" · ");

  const kundeBlock = data.kunde.briefkopf
    || [data.kunde.name, data.kunde.strasse, data.kunde.plzOrt, data.kunde.land].filter(Boolean).join("\n");

  return (
    <Document title={`${data.titel} ${data.nummer}`} author={data.firma.firma}>
      <Page size="A4" style={s.page}>
        <View style={[s.rowBetween, { marginBottom: 22 }]}>
          <View>
            <Text style={s.firma}>{data.firma.firma}</Text>
            <Text style={s.muted}>{firmaZeile}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.titel}>{data.titel}</Text>
            <Text>{t.nr} {data.nummer}</Text>
            <Text style={s.muted}>{t.datum}: {formatDate(data.datum)}</Text>
            {data.auftragNummer ? <Text style={s.muted}>{t.auftrag}: {data.auftragNummer}</Text> : null}
          </View>
        </View>

        <View style={s.block}>
          <Text style={[s.muted, { fontSize: 7, marginBottom: 2 }]}>
            {data.firma.firma}{firmaZeile ? ` · ${firmaZeile}` : ""}
          </Text>
          <Text>{kundeBlock}</Text>
          {data.kunde.ustId ? <Text style={s.muted}>{t.ustId}: {data.kunde.ustId}</Text> : null}
        </View>

        {data.kopftext ? <Text style={s.kopftext}>{data.kopftext}</Text> : null}

        <View style={s.th}>
          <Text style={s.cPos}>{t.pos}</Text>
          <Text style={s.cBez}>{t.bez}</Text>
          <Text style={s.cMenge}>{t.menge}</Text>
          <Text style={s.cEinzel}>{t.einzel}</Text>
          <Text style={s.cRabatt}>{t.rabatt}</Text>
          <Text style={s.cGesamt}>{t.gesamt}</Text>
        </View>
        {data.positionen.map((p, i) => (
          <View style={s.td} key={i} wrap={false}>
            <Text style={s.cPos}>{p.pos ?? ""}</Text>
            <View style={s.cBez}>
              <Text style={{ fontWeight: 700 }}>{p.name}</Text>
              {p.beschreibung ? <Text style={s.muted}>{p.beschreibung}</Text> : null}
            </View>
            <Text style={s.cMenge}>{Number(p.anzahl)}</Text>
            <Text style={s.cEinzel}>{money(p.einzelpreis)}</Text>
            <Text style={s.cRabatt}>{Number(p.rabattProzent) ? `${Number(p.rabattProzent)} %` : "–"}</Text>
            <Text style={s.cGesamt}>{money(p.gesamt)}</Text>
          </View>
        ))}

        <View style={s.sumWrap}>
          <View style={s.sumRow}><Text>{t.summePos}</Text><Text>{money(data.summen.positionen)}</Text></View>
          {data.summen.gesamtrabattAktiv && Number(data.summen.gesamtrabattWert) ? (
            <View style={s.sumRow}>
              <Text>{t.gesamtrabatt} ({Number(data.summen.gesamtrabattProzent)} %)</Text>
              <Text>− {money(data.summen.gesamtrabattWert)}</Text>
            </View>
          ) : null}
          <View style={s.sumRow}><Text>{t.netto}</Text><Text>{money(data.summen.netto)}</Text></View>
          <View style={s.sumRow}>
            <Text>{t.mwst} ({data.steuerpflichtig ? `${Number(data.summen.mwstSatz)} %` : "0 %"})</Text>
            <Text>{money(data.summen.mwst)}</Text>
          </View>
          <View style={[s.sumRow, s.sumStrong]}>
            <Text>{t.brutto}</Text><Text>{money(data.summen.brutto)}</Text>
          </View>
          {data.anzahlung ? (
            <>
              <View style={s.sumRow}>
                <Text>{t.anzahlung}{data.anzahlung.datum ? ` (${formatDate(data.anzahlung.datum)})` : ""}</Text>
                <Text>− {money(data.anzahlung.brutto)}</Text>
              </View>
              <View style={[s.sumRow, { fontWeight: 700 }]}>
                <Text>{t.rechnungsbetrag}</Text><Text>{money(data.anzahlung.rechnungsbetrag)}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={s.fuss}>
          {data.steuerHinweis ? <Text>{data.steuerHinweis}</Text> : null}
          {data.zahlungsbedingung ? <Text>{t.zahlung}: {data.zahlungsbedingung}</Text> : null}
          <Text style={{ marginTop: 6 }}>
            {data.firma.firma}
            {data.firma.steuerNr ? ` · ${t.steuerNr}: ${data.firma.steuerNr}` : ""}
          </Text>
          {data.firma.bank ? <Text>{t.bank}: {data.firma.bank}</Text> : null}
        </View>

        <Text
          style={s.seite}
          render={({ pageNumber, totalPages }) => `${t.seite} ${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
