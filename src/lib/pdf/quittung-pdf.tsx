import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDate, formatMoney } from "@/lib/utils";

/**
 * Zahlungsbestätigung (Quittung) zu einer Rechnung/Anzahlungsrechnung. Reine Bestätigung des
 * Zahlungseingangs — ersetzt keine Rechnung (die USt steht in der Rechnung selbst).
 */
export interface QuittungData {
  sprache: "DE" | "EN";
  waehrung: "EUR" | "USD";
  firma: { firma: string; zeile: string; ort: string | null };
  kunde: string;
  belegTitel: string;
  belegNummer: string;
  belegDatum: string | null;
  auftragNummer: string | null;
  betrag: string;
  zahlungsdatum: string;
  bank: string | null;
  heute: string;
}

const T = {
  DE: {
    titel: "Zahlungsbestätigung",
    text: (d: QuittungData, b: string) =>
      `Hiermit bestätigen wir den Eingang von ${b} am ${formatDate(d.zahlungsdatum)}.`,
    fuer: "für", auftrag: "Auftrag", vom: "vom", bank: "Zahlungseingang auf", betrag: "Betrag",
    hinweis: "Diese Bestätigung ersetzt keine Rechnung. Die Umsatzsteuer ist in der oben genannten Rechnung ausgewiesen.",
    gruss: "Vielen Dank!",
  },
  EN: {
    titel: "Payment Confirmation",
    text: (d: QuittungData, b: string) =>
      `We hereby confirm receipt of ${b} on ${formatDate(d.zahlungsdatum)}.`,
    fuer: "for", auftrag: "Order", vom: "of", bank: "Received on account", betrag: "Amount",
    hinweis: "This confirmation does not replace an invoice. VAT is shown on the invoice referred to above.",
    gruss: "Thank you very much!",
  },
};

const s = StyleSheet.create({
  page: { fontSize: 10, color: "#111", padding: "22mm 20mm", lineHeight: 1.5 },
  firma: { fontWeight: 700, fontSize: 12 },
  muted: { color: "#666" },
  titel: { fontSize: 20, fontWeight: 700, marginTop: 28, marginBottom: 14 },
  box: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginVertical: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  betrag: { fontSize: 14, fontWeight: 700 },
});

function QuittungPdf({ d }: { d: QuittungData }) {
  const t = T[d.sprache];
  const b = formatMoney(d.betrag, d.waehrung);
  return (
    <Document title={`${t.titel} ${d.belegNummer}`} author={d.firma.firma}>
      <Page size="A4" style={s.page}>
        <Text style={s.firma}>{d.firma.firma}</Text>
        <Text style={s.muted}>{d.firma.zeile}</Text>

        <Text style={{ marginTop: 26 }}>{d.kunde}</Text>

        <Text style={s.titel}>{t.titel}</Text>
        <Text>{t.text(d, b)}</Text>

        <View style={s.box}>
          <View style={s.row}>
            <Text>{t.fuer} {d.belegTitel} {d.belegNummer}{d.belegDatum ? ` ${t.vom} ${formatDate(d.belegDatum)}` : ""}</Text>
          </View>
          {d.auftragNummer ? <View style={s.row}><Text>{t.auftrag}: {d.auftragNummer}</Text></View> : null}
          {d.bank ? <View style={s.row}><Text>{t.bank}: {d.bank}</Text></View> : null}
          <View style={[s.row, { marginTop: 6 }]}>
            <Text style={s.betrag}>{t.betrag}</Text>
            <Text style={s.betrag}>{b}</Text>
          </View>
        </View>

        <Text>{t.gruss}</Text>
        <Text style={{ marginTop: 18 }}>{d.firma.ort ? `${d.firma.ort}, ` : ""}{formatDate(d.heute)}</Text>
        <Text>{d.firma.firma}</Text>

        <Text style={[s.muted, { marginTop: 30, fontSize: 8 }]}>{t.hinweis}</Text>
      </Page>
    </Document>
  );
}

export function renderQuittungPdf(d: QuittungData): Promise<Buffer> {
  return renderToBuffer(<QuittungPdf d={d} />);
}
