import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";

/**
 * NKS-Formulare (Lacey Act PPQ 505 / CITES-Antrag) — Nachbau der Ninox-Word-Vorlagen
 * (`_quellen/…/NKS/*.docx`): Formular-Scan als Seitenhintergrund, Werte absolut positioniert (pt).
 * Bilder liegen unter src/lib/pdf/nks/ (in next.config per outputFileTracingIncludes mitgeliefert).
 */
const NKS_DIR = path.join(process.cwd(), "src", "lib", "pdf", "nks");
const bild = (datei: string) => ({
  data: readFileSync(path.join(NKS_DIR, datei)),
  format: (datei.endsWith(".png") ? "png" : "jpg") as "png" | "jpg",
});

/** Ein Textfeld auf dem Formular (pt, Ursprung oben links). */
export interface Feld { top: number; left: number; width?: number; text: string; bold?: boolean }
/** Ein Bild auf dem Formular (pt). */
export interface Bild { top: number; left: number; width: number; height: number; datei: string }
export interface Seite { breite: number; hoehe: number; hintergrund: string; felder: Feld[]; bilder: Bild[] }

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#000" },
  abs: { position: "absolute", lineHeight: 1.15 },
});

function FormularPdf({ titel, seiten }: { titel: string; seiten: Seite[] }) {
  return (
    <Document title={titel} author="Nik Huber Guitars">
      {seiten.map((p, i) => (
        <Page key={i} size={[p.breite, p.hoehe]} style={s.page}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf-Image hat kein alt */}
          <Image src={bild(p.hintergrund)} style={{ position: "absolute", top: 0, left: 0, width: p.breite, height: p.hoehe }} fixed />
          {p.bilder.map((b, j) => (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf-Image hat kein alt
            <Image key={`b${j}`} src={bild(b.datei)} style={{ position: "absolute", top: b.top, left: b.left, width: b.width, height: b.height }} />
          ))}
          {p.felder.map((f, j) => (
            <Text
              key={j}
              style={[s.abs, {
                top: f.top, left: f.left, width: f.width,
                fontFamily: f.bold ? "Helvetica-Bold" : "Helvetica",
              }]}
            >
              {f.text}
            </Text>
          ))}
        </Page>
      ))}
    </Document>
  );
}

/* ------------------------------------------------------------------ Lacey */

export interface LaceyData {
  ankunft: string;      // MM/DD/YYYY (heute + 3)
  datum: string;        // MM/DD/YYYY
  bearbeiter: string;
  seriennummer: string;
  briefkopf: string;
  preis: string;        // "€ 1,234.56"
  zeilen: Array<{ hts: string; teil: string; botanisch: string; herkunft: string; volumen: string; einheit: string }>;
}

// Tabelle in Section 2: linke Kante je Spalte (pt, wie im Ninox-Ausdruck), erste Zeile, Zeilenhöhe.
// Spalten: 0 HTS · 1 Entered Value · 2 Article · 3 Scientific Name · 4 Country · 5 Quantity · 6 Unit
const L_COLS = [43.5, 161.4, 221.3, 351.75, 521.85, 585.6, 653.2];
const L_TOP = 388;
const L_ROW = 13.7;

export function laceySeiten(d: LaceyData): Seite[] {
  const zelle = (row: number, col: number, text: string): Feld => ({ top: L_TOP + row * L_ROW, left: L_COLS[col], text });
  const felder: Feld[] = [
    { top: 155, left: 53, width: 160, text: d.ankunft },
    { top: 231, left: 47, width: 300, text: d.briefkopf },
    { top: 231, left: 409, width: 340, text: d.briefkopf },
    { top: 305, left: 53, width: 700, text: `Electric guitar with serial number #${d.seriennummer}` },
    ...d.zeilen.flatMap((z, i) => [
      zelle(i, 0, z.hts), zelle(i, 2, z.teil), zelle(i, 3, z.botanisch),
      zelle(i, 4, z.herkunft), zelle(i, 5, z.volumen), zelle(i, 6, z.einheit),
    ]),
    zelle(d.zeilen.length, 1, d.preis),
    { top: 553, left: 41, width: 145, text: d.bearbeiter },
    { top: 553, left: 674, width: 90, text: d.datum },
  ];
  return [
    { breite: 792, hoehe: 612, hintergrund: "lacey-seite1.png", felder, bilder: [] },
    { breite: 792, hoehe: 612, hintergrund: "lacey-seite2.png", felder: [], bilder: [] },
  ];
}

export async function renderLaceyPdf(d: LaceyData): Promise<Buffer> {
  return renderToBuffer(<FormularPdf titel={`Lacey Act ${d.seriennummer}`} seiten={laceySeiten(d)} />);
}

/* ------------------------------------------------------------------ CITES */

export interface CitesData {
  datum: string;   // DD.MM.YYYY
  masse: string;   // Nettomasse kg, 1 Nachkommastelle
  teile: string[]; // Artikelgruppen der CITES-Holzpositionen
}

export function citesSeiten(d: CitesData): Seite[] {
  return [{
    breite: 595.28, hoehe: 841.89, hintergrund: "cites-formular.jpg",
    felder: [
      { top: 64.8, left: 49.6, width: 200, text: "Nik Huber Guitars\nBenzstraße 3a\n63110 Rodgau" },
      {
        top: 273, left: 39.25, width: 220, bold: true,
        text: ["WPR Holzprodukte", "", "Zwei Altbestände", "Erwerb 1968 und vor dem 20.07.1992",
          ...d.teile.map((t) => `${t} für elektr. Gitarre`)].join("\n"),
      },
      { top: 275, left: 281.75, text: d.masse },
      { top: 275.5, left: 439, text: "1" },
      { top: 336.7, left: 288.85, text: "Brasilien" },
      { top: 393, left: 54.25, text: "Dalbergia Nigra" },
      { top: 419, left: 54.25, text: "Riopalisander" },
      { top: 802, left: 104.35, text: d.datum },
    ],
    bilder: [
      { top: 699.15, left: 113.45, width: 154.35, height: 99.05, datei: "stempel.png" },
      { top: 767.35, left: 357.05, width: 77.75, height: 57.9, datei: "unterschrift.png" },
    ],
  }];
}

export async function renderCitesPdf(d: CitesData): Promise<Buffer> {
  return renderToBuffer(<FormularPdf titel="CITES" seiten={citesSeiten(d)} />);
}
