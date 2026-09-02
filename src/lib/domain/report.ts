import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireUser } from "./context";

/**
 * Reporting (E11 — Neuentwurf). Monats-/Jahres-KPIs live aus `rechnung` + `beleg_position`.
 * `rechnung.summe_*` sind im Altbestand NULL → Netto/Brutto werden aus den Positionen
 * (`beleg_position.gesamtpreis`, GENERATED) berechnet; `zahlbetrag` = tatsächlich bezahlt.
 */

export interface MonatsZeile {
  monat: number;
  label: string;
  anzahlRg: number;
  anzahlStorno: number;
  anzahlGutschrift: number;
  positionenNetto: number;   // Σ beleg_position.gesamtpreis (re_relevant) der echten Rechnungen
  bezahlt: number;           // Σ zahlbetrag
  oGutschriftNetto: number;  // Σ Positionen der Gutschriften/Storno (negativ)
  kumuliertBezahlt: number;
}

type MRow = {
  monat: number; anzahl_rg: number; anzahl_storno: number; anzahl_gutschrift: number;
  positionen_netto: string; bezahlt: string; o_gutschrift_netto: string;
};

export async function monatsUebersicht(jahr: number): Promise<{ zeilen: MonatsZeile[]; jahresSumme: MonatsZeile }> {
  await requireUser();
  const rows = (await db.execute(sql`
    with pos as (
      select p.rechnung_id, sum(p.gesamtpreis) filter (where p.re_relevant) as netto
      from beleg_position p
      where p.rechnung_id is not null
      group by p.rechnung_id
    )
    select
      extract(month from r.rechnungsdatum)::int as monat,
      count(*) filter (where r.belegart = 'RECHNUNG')::int          as anzahl_rg,
      count(*) filter (where r.belegart = 'STORNORECHNUNG')::int    as anzahl_storno,
      count(*) filter (where r.belegart = 'GUTSCHRIFT')::int        as anzahl_gutschrift,
      coalesce(sum(pos.netto) filter (where r.belegart = 'RECHNUNG'), 0)       as positionen_netto,
      coalesce(sum(r.zahlbetrag) filter (where r.belegart = 'RECHNUNG'), 0)    as bezahlt,
      coalesce(sum(pos.netto) filter (where r.belegart <> 'RECHNUNG'), 0)      as o_gutschrift_netto
    from rechnung r
    left join pos on pos.rechnung_id = r.id
    where r.rechnungsdatum is not null
      and extract(year from r.rechnungsdatum) = ${jahr}
    group by 1
    order by 1
  `)) as unknown as MRow[];

  const byMonth = new Map<number, MRow>();
  for (const r of rows) byMonth.set(Number(r.monat), r);

  const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  let kum = 0;
  const zeilen: MonatsZeile[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = byMonth.get(m);
    const bezahlt = Number(r?.bezahlt ?? 0);
    kum += bezahlt;
    zeilen.push({
      monat: m,
      label: MONATE[m - 1],
      anzahlRg: Number(r?.anzahl_rg ?? 0),
      anzahlStorno: Number(r?.anzahl_storno ?? 0),
      anzahlGutschrift: Number(r?.anzahl_gutschrift ?? 0),
      positionenNetto: Number(r?.positionen_netto ?? 0),
      bezahlt,
      oGutschriftNetto: Number(r?.o_gutschrift_netto ?? 0),
      kumuliertBezahlt: Math.round(kum * 100) / 100,
    });
  }

  const jahresSumme: MonatsZeile = {
    monat: 0,
    label: `Jahr ${jahr}`,
    anzahlRg: zeilen.reduce((s, z) => s + z.anzahlRg, 0),
    anzahlStorno: zeilen.reduce((s, z) => s + z.anzahlStorno, 0),
    anzahlGutschrift: zeilen.reduce((s, z) => s + z.anzahlGutschrift, 0),
    positionenNetto: round2(zeilen.reduce((s, z) => s + z.positionenNetto, 0)),
    bezahlt: round2(zeilen.reduce((s, z) => s + z.bezahlt, 0)),
    oGutschriftNetto: round2(zeilen.reduce((s, z) => s + z.oGutschriftNetto, 0)),
    kumuliertBezahlt: zeilen.at(-1)?.kumuliertBezahlt ?? 0,
  };

  return { zeilen, jahresSumme };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Verfügbare Rechnungsjahre (für den Jahr-Wechsler). */
export async function reportJahre(): Promise<number[]> {
  await requireUser();
  const rows = (await db.execute(sql`
    select distinct extract(year from rechnungsdatum)::int as jahr
    from rechnung where rechnungsdatum is not null order by 1 desc
  `)) as unknown as { jahr: number }[];
  return rows.map((r) => Number(r.jahr));
}

export interface RgZeile {
  id: string;
  nummer: string;
  belegart: string;
  rechnungsdatum: string | null;
  kunde: string | null;
  waehrung: string | null;
  positionenNetto: number;
  zahlbetrag: number | null;
  status: string;
}

/** Rechnungen eines Monats (Drill-down + Excel-Blatt). */
type RRow = {
  id: string; nummer: string; belegart: string; rechnungsdatum: string | null;
  kunde: string | null; waehrung: string | null; positionen_netto: string | null;
  zahlbetrag: string | null; status: string;
};

export async function monatsRechnungen(jahr: number, monat: number): Promise<RgZeile[]> {
  await requireUser();
  const rows = (await db.execute(sql`
    with pos as (
      select rechnung_id, sum(gesamtpreis) filter (where re_relevant) as netto
      from beleg_position where rechnung_id is not null group by rechnung_id
    )
    select r.id, r.nummer, r.belegart, to_char(r.rechnungsdatum, 'YYYY-MM-DD') as rechnungsdatum,
           coalesce(r.kd_firma, trim(coalesce(r.kd_vorname,'') || ' ' || coalesce(r.kd_nachname,''))) as kunde,
           r.kd_waehrung as waehrung, pos.netto as positionen_netto, r.zahlbetrag, r.status
    from rechnung r
    left join pos on pos.rechnung_id = r.id
    where r.rechnungsdatum is not null
      and extract(year from r.rechnungsdatum) = ${jahr}
      and extract(month from r.rechnungsdatum) = ${monat}
    order by r.rechnungsdatum, r.nummer
  `)) as unknown as RRow[];
  return rows.map((r) => ({
    id: r.id,
    nummer: r.nummer,
    belegart: r.belegart,
    rechnungsdatum: r.rechnungsdatum,
    kunde: r.kunde?.trim() || null,
    waehrung: r.waehrung,
    positionenNetto: Number(r.positionen_netto ?? 0),
    zahlbetrag: r.zahlbetrag == null ? null : Number(r.zahlbetrag),
    status: r.status,
  }));
}

/** Excel-Export (Blätter „Monats-KPIs" + „Rechnungsausgang"). */
export async function reportXlsx(jahr: number, monat?: number): Promise<Uint8Array> {
  await requireUser();
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nik Huber Guitars";
  wb.created = new Date();

  const { zeilen, jahresSumme } = await monatsUebersicht(jahr);
  const kpi = wb.addWorksheet("Monats-KPIs");
  kpi.columns = [
    { header: "Monat", key: "label", width: 10 },
    { header: "Anz. RG", key: "anzahlRg", width: 10 },
    { header: "Storno", key: "anzahlStorno", width: 8 },
    { header: "Gutschrift", key: "anzahlGutschrift", width: 10 },
    { header: "Positionen netto", key: "positionenNetto", width: 16, style: { numFmt: "#,##0.00" } },
    { header: "Bezahlt", key: "bezahlt", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Kumuliert bezahlt", key: "kumuliertBezahlt", width: 18, style: { numFmt: "#,##0.00" } },
  ];
  for (const z of zeilen) kpi.addRow(z);
  const sumRow = kpi.addRow(jahresSumme);
  sumRow.font = { bold: true };
  kpi.getRow(1).font = { bold: true };

  const ausgang = wb.addWorksheet("Rechnungsausgang");
  ausgang.columns = [
    { header: "Monat", key: "monat", width: 8 },
    { header: "RG-Nr", key: "nummer", width: 16 },
    { header: "Belegart", key: "belegart", width: 16 },
    { header: "Datum", key: "datum", width: 12 },
    { header: "Kunde", key: "kunde", width: 30 },
    { header: "Whg", key: "waehrung", width: 6 },
    { header: "Positionen netto", key: "netto", width: 16, style: { numFmt: "#,##0.00" } },
    { header: "Zahlbetrag", key: "zahlbetrag", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Status", key: "status", width: 14 },
  ];
  ausgang.getRow(1).font = { bold: true };
  const monate = monat ? [monat] : Array.from({ length: 12 }, (_, i) => i + 1);
  for (const m of monate) {
    for (const r of await monatsRechnungen(jahr, m)) {
      ausgang.addRow({
        monat: m,
        nummer: r.nummer,
        belegart: r.belegart,
        datum: r.rechnungsdatum,
        kunde: r.kunde ?? "",
        waehrung: r.waehrung ?? "",
        netto: r.positionenNetto,
        zahlbetrag: r.zahlbetrag ?? "",
        status: r.status,
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
