import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { VEREINBARUNG, type VerleihSprache, zubehoerListe } from "@/lib/verleih-shared";

/** Übergabevereinbarung (Leihgabe) einer Verleih-/Testgitarre — optional mit elektronischer Unterschrift. */
export interface VerleihPdfData {
  sprache: VerleihSprache;
  firma: string;
  firmaZeilen: string[];
  leihnehmer: string;        // Briefkopf (mehrzeilig)
  modell: string;
  seriennummer: string;
  zubehoer: string;
  wert: string;              // formatiert, z. B. „4.500,00 €"
  zweck: string;
  vom: string;               // formatiert
  bis: string;               // formatiert
  ortDatum: string;          // „Rodgau, 09.10.2026"
  unterschrift?: { png: Buffer; name: string; zeit: string; ip: string } | null;
}

const LOGO = path.join(process.cwd(), "src", "lib", "pdf", "nks", "stempel.png");

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#111", padding: "18mm 20mm 18mm 20mm", lineHeight: 1.4 },
  kopf: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  titel: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  parteien: { flexDirection: "row", gap: 20, marginBottom: 14 },
  partei: { flex: 1 },
  label: { fontSize: 8, color: "#666", textTransform: "uppercase", marginBottom: 2 },
  box: { borderWidth: 1, borderColor: "#ccc", padding: 8, marginBottom: 14 },
  zeile: { flexDirection: "row", paddingVertical: 1.5 },
  k: { width: 110, color: "#555" },
  v: { flex: 1, fontFamily: "Helvetica-Bold" },
  h: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  punkt: { flexDirection: "row", marginBottom: 4 },
  nr: { width: 16 },
  unterschriften: { flexDirection: "row", gap: 30, marginTop: 28 },
  sig: { flex: 1 },
  linie: { borderTopWidth: 1, borderColor: "#333", paddingTop: 3, fontSize: 8, color: "#555" },
  hinweis: { fontSize: 7.5, color: "#555", marginTop: 4 },
});

function VerleihPdf({ d }: { d: VerleihPdfData }) {
  const t = VEREINBARUNG[d.sprache];
  const ersetze = (x: string) => x.replace("{wert}", d.wert || "–").replace("{bis}", d.bis || "–");
  const zeile = (k: string, v: string) => (
    <View style={s.zeile}><Text style={s.k}>{k}</Text><Text style={s.v}>{v || "–"}</Text></View>
  );
  return (
    <Document title={`${t.titel} ${d.seriennummer}`} author={d.firma}>
      <Page size="A4" style={s.page}>
        <View style={s.kopf}>
          <View>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{d.firma}</Text>
            {d.firmaZeilen.map((z, i) => <Text key={i} style={{ color: "#555" }}>{z}</Text>)}
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf-Image hat kein alt */}
          <Image src={{ data: readFileSync(LOGO), format: "png" }} style={{ width: 120 }} />
        </View>

        <Text style={s.titel}>{t.titel}</Text>

        <View style={s.parteien}>
          <View style={s.partei}>
            <Text style={s.label}>{t.verleiher}</Text>
            <Text>{d.firma}</Text>
            {d.firmaZeilen.map((z, i) => <Text key={i}>{z}</Text>)}
          </View>
          <View style={s.partei}>
            <Text style={s.label}>{t.leihnehmer}</Text>
            <Text>{d.leihnehmer}</Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.h}>{t.gegenstand}</Text>
          {zeile(t.modell, d.modell)}
          {zeile(t.seriennummer, d.seriennummer)}
          <View style={s.zeile}>
            <Text style={s.k}>{t.zubehoer}</Text>
            <View style={{ flex: 1 }}>
              {zubehoerListe(d.zubehoer).length
                ? zubehoerListe(d.zubehoer).map((z, i) => <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>• {z}</Text>)
                : <Text style={s.v}>–</Text>}
            </View>
          </View>
          {zeile(t.wert, d.wert)}
          {d.zweck ? zeile(t.zweck, d.zweck) : null}
          {zeile(t.zeitraum, `${t.vom} ${d.vom || "–"}  ${t.bis} ${d.bis || "–"}`)}
        </View>

        <Text style={s.h}>{t.bedingungenTitel}</Text>
        {t.bedingungen.map((b, i) => (
          <View key={i} style={s.punkt}>
            <Text style={s.nr}>{i + 1}.</Text>
            <Text style={{ flex: 1 }}>{ersetze(b)}</Text>
          </View>
        ))}

        <View style={s.unterschriften} wrap={false}>
          <View style={s.sig}>
            <Text style={{ height: 50, paddingTop: 30 }}>{d.ortDatum}</Text>
            <Text style={s.linie}>{t.ortDatum} · {t.fuerVerleiher}</Text>
          </View>
          <View style={s.sig}>
            <View style={{ height: 50, justifyContent: "flex-end" }}>
              {d.unterschrift ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf-Image hat kein alt
                <Image src={{ data: d.unterschrift.png, format: "png" }} style={{ height: 46, objectFit: "contain", objectPosition: "left" }} />
              ) : null}
            </View>
            <Text style={s.linie}>{t.unterschriftLeihnehmer}{d.unterschrift ? ` · ${d.unterschrift.name}` : ""}</Text>
            {d.unterschrift ? (
              <Text style={s.hinweis}>{t.elektronisch(d.unterschrift.name, d.unterschrift.zeit, d.unterschrift.ip)}</Text>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderVerleihPdf(d: VerleihPdfData): Promise<Buffer> {
  return renderToBuffer(<VerleihPdf d={d} />);
}
