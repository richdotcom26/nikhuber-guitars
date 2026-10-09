import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { firmaSetting, mailversand, rechnung, staat } from "@/lib/db/schema";
import { getTransport, mailKonfig } from "@/lib/mail/transport";
import { istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { ladeAnhangDatei } from "./anhang";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { usdEurKurs } from "./kurs";
import { getFirmaSetting } from "./stammdaten";

/**
 * DATEV-Export Rechnungsausgang: Buchungsstapel im DATEV-Format (EXTF, Version 700, Kategorie 21),
 * eine Buchung je gebuchtem Beleg des Monats (Rechnung, Anzahlungs-, Storno-, Korrekturrechnung).
 * Soll: Debitor, Haben: Erlöskonto je Steuerfall (Inland / EU / Drittland) bzw. Anzahlungskonto.
 * Kontenrahmen-Werte kommen aus Einstellungen → Buchhaltung (mit dem Steuerbüro abstimmen).
 */

const SPALTEN = [
  "Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz", "Kurs", "Basis-Umsatz", "WKZ Basis-Umsatz",
  "Konto", "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum", "Belegfeld 1", "Belegfeld 2", "Skonto",
  "Buchungstext", "Postensperre", "Diverse Adressnummer", "Geschäftspartnerbank", "Sachverhalt", "Zinssperre", "Beleglink",
  "Beleginfo - Art 1", "Beleginfo - Inhalt 1", "Beleginfo - Art 2", "Beleginfo - Inhalt 2",
  "Beleginfo - Art 3", "Beleginfo - Inhalt 3", "Beleginfo - Art 4", "Beleginfo - Inhalt 4",
  "Beleginfo - Art 5", "Beleginfo - Inhalt 5", "Beleginfo - Art 6", "Beleginfo - Inhalt 6",
  "Beleginfo - Art 7", "Beleginfo - Inhalt 7", "Beleginfo - Art 8", "Beleginfo - Inhalt 8",
  "KOST1 - Kostenstelle", "KOST2 - Kostenstelle", "Kost-Menge", "EU-Land u. UStID (Bestimmung)", "EU-Steuersatz (Bestimmung)",
];

const q = (s: string | null | undefined, max = 60) => `"${(s ?? "").replace(/"/g, "\"\"").slice(0, max)}"`;
const betrag = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
const pad = (n: number, l = 2) => String(n).padStart(l, "0");

/** Text → Windows-1252 (DATEV-Standard); unbekannte Zeichen → „?“. */
function cp1252(s: string): Buffer {
  const out = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c === 0x20ac ? 0x80 : c < 256 ? c : 0x3f;
  }
  return out;
}

export async function datevMonatsBelege(jahr: number, monat: number) {
  return db
    .select({
      id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, rechnungsdatum: rechnung.rechnungsdatum,
      brutto: sql<string | null>`coalesce(${rechnung.summeBrutto}, round((select coalesce(sum(p.gesamtpreis) filter (where p.re_relevant), sum(p.gesamtpreis)) from beleg_position p where p.rechnung_id = ${rechnung.id}) * case when ${rechnung.kdSteuerpflichtig} then 1 + coalesce(${rechnung.mwstSatz}, 19) / 100 else 1 end, 2))`, waehrung: rechnung.kdWaehrung, steuerpflichtig: rechnung.kdSteuerpflichtig,
      region: rechnung.kdRegion, ustId: rechnung.kdUstId, landKuerzel: staat.kuerzel,
      kdFirma: rechnung.kdFirma, kdVorname: rechnung.kdVorname, kdNachname: rechnung.kdNachname,
      pdf: rechnung.erechnungAssetId,
    })
    .from(rechnung)
    .leftJoin(staat, eq(staat.id, rechnung.kdStaatId))
    .where(and(
      isNotNull(rechnung.nummer),
      sql`${rechnung.status} <> 'ENTWURF'`,
      sql`extract(year from ${rechnung.rechnungsdatum}) = ${jahr}`,
      sql`extract(month from ${rechnung.rechnungsdatum}) = ${monat}`,
    ))
    .orderBy(asc(rechnung.rechnungsdatum), asc(rechnung.nummer));
}

/** Buchungsstapel-CSV für einen Monat erzeugen. */
export async function erzeugeDatevExport(jahr: number, monat: number) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (!(jahr > 2000 && monat >= 1 && monat <= 12)) throw new DomainError("VALIDATION", "Ungültiger Monat.");
  const s = await getFirmaSetting();
  if (!s.datevBeraterNr || !s.datevMandantNr) {
    throw new DomainError("STATE", "Beraternummer und Mandantennummer fehlen (Einstellungen → Buchhaltung).");
  }
  const belege = await datevMonatsBelege(jahr, monat);
  const kurs = await usdEurKurs();

  const jetzt = new Date();
  const erzeugt = `${jetzt.getFullYear()}${pad(jetzt.getMonth() + 1)}${pad(jetzt.getDate())}${pad(jetzt.getHours())}${pad(jetzt.getMinutes())}${pad(jetzt.getSeconds())}000`;
  const letzter = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const wjJahr = monat >= s.datevWjBeginnMonat ? jahr : jahr - 1;
  const kopf = [
    "\"EXTF\"", "700", "21", "\"Buchungsstapel\"", "13", erzeugt, "", "\"RE\"", "\"\"", "\"\"",
    s.datevBeraterNr, s.datevMandantNr, `${wjJahr}${pad(s.datevWjBeginnMonat)}01`, String(s.datevSachkontenlaenge),
    `${jahr}${pad(monat)}01`, `${jahr}${pad(monat)}${pad(letzter)}`, q(`Rechnungsausgang ${pad(monat)}/${jahr}`, 30),
    "\"\"", "1", "0", "0", "\"EUR\"", "", "\"\"", "", "", "\"\"", "", "\"\"", "\"\"", "\"\"",
  ].join(";");

  const zeilen: string[] = [];
  const warnungen: string[] = [];
  let summeEur = 0;
  for (const b of belege) {
    const roh = Number(b.brutto ?? NaN);
    if (!Number.isFinite(roh)) { warnungen.push(`${b.nummer}: ohne Betrag – nicht exportiert`); continue; }
    const usd = b.waehrung === "USD";
    const eur = Math.round((usd ? roh * kurs.faktor : roh) * 100) / 100;
    summeEur += eur;
    const gegenkonto = b.belegart === "ANZAHLUNGSRECHNUNG"
      ? s.datevKontoAnzahlung
      : b.steuerpflichtig !== false ? s.datevKontoInland
        : b.region === "EU" ? s.datevKontoEu : s.datevKontoDrittland;
    const ust = (b.ustId ?? "").replace(/\s/g, "");
    const euId = b.steuerpflichtig === false && b.region === "EU" && ust
      ? (/^[A-Z]{2}/.test(ust) ? ust : `${b.landKuerzel ?? ""}${ust}`)
      : "";
    if (b.steuerpflichtig === false && b.region === "EU" && !ust) warnungen.push(`${b.nummer}: EU-Kunde ohne USt-IdNr.`);
    const d = b.rechnungsdatum ?? "";
    const kunde = b.kdFirma || [b.kdVorname, b.kdNachname].filter(Boolean).join(" ") || "";
    const f: string[] = new Array(SPALTEN.length).fill("");
    f[0] = betrag(usd ? roh : eur);
    f[1] = q(eur < 0 ? "H" : "S");
    if (usd) {
      f[2] = q("USD");
      f[3] = (1 / kurs.faktor).toFixed(6).replace(".", ",");
      f[4] = betrag(eur);
      f[5] = q("EUR");
    }
    f[6] = s.datevDebitor;
    f[7] = gegenkonto;
    f[9] = `${d.slice(8, 10)}${d.slice(5, 7)}`;
    f[10] = q(b.nummer, 36);
    f[13] = q(kunde, 60);
    f[39] = q(euId, 15);
    zeilen.push(f.join(";"));
  }

  const csv = [kopf, SPALTEN.map((x) => q(x, 80)).join(";"), ...zeilen].join("\r\n") + "\r\n";
  return {
    dateiname: `EXTF_Rechnungsausgang_${jahr}-${pad(monat)}.csv`,
    bytes: cp1252(csv),
    anzahl: zeilen.length,
    summeEur: Math.round(summeEur * 100) / 100,
    warnungen,
    belege,
    kurs,
  };
}

/** Export erzeugen und ans Steuerbüro (+ interne Kopie) mailen, optional mit den Rechnungs-PDFs. */
export async function sendeDatevExport(jahr: number, monat: number, mitPdfs: boolean) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const exp = await erzeugeDatevExport(jahr, monat);
  const s = await getFirmaSetting();
  const an = splitEmails(s.datevEmpfaenger);
  if (an.length === 0 || !an.every(istEmail)) throw new DomainError("VALIDATION", "Empfänger ungültig (Einstellungen → Buchhaltung).");
  const cfg = mailKonfig();
  if (!cfg) throw new DomainError("STATE", "SMTP nicht konfiguriert.");

  const attachments: { filename: string; content: Buffer; contentType: string }[] = [
    { filename: exp.dateiname, content: exp.bytes, contentType: "text/csv; charset=windows-1252" },
  ];
  const ohnePdf: string[] = [];
  if (mitPdfs) {
    for (const b of exp.belege) {
      if (!b.pdf) { ohnePdf.push(b.nummer ?? "?"); continue; }
      const f = await ladeAnhangDatei(b.pdf).catch(() => null);
      if (f) attachments.push({ filename: f.dateiname, content: f.bytes, contentType: f.mime });
      else ohnePdf.push(b.nummer ?? "?");
    }
  }

  const monatTxt = `${pad(monat)}/${jahr}`;
  const text = [
    "Hallo,",
    "",
    `anbei der DATEV-Export Rechnungsausgang für ${monatTxt} (Buchungsstapel, ${exp.anzahl} Buchungen, Summe ${exp.summeEur.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR brutto).`,
    mitPdfs ? `Die Rechnungs-PDFs (ZUGFeRD) liegen bei${ohnePdf.length ? ` – ohne PDF: ${ohnePdf.join(", ")}` : ""}.` : "",
    exp.belege.some((b) => b.waehrung === "USD")
      ? `USD-Rechnungen umgerechnet mit 1 USD = ${exp.kurs.faktor.toLocaleString("de-DE", { maximumFractionDigits: 4 })} EUR (${exp.kurs.quelle}${exp.kurs.datum ? ` ${exp.kurs.datum}` : ""}).`
      : "",
    exp.warnungen.length ? `Hinweise: ${exp.warnungen.join("; ")}` : "",
    "",
    "Viele Grüße",
    "Nik Huber Guitars",
  ].filter((z, i, a) => z !== "" || a[i - 1] !== "").join("\n");
  const betreff = `DATEV-Export Rechnungsausgang ${monatTxt} – Nik Huber Guitars`;

  const [m] = await db.insert(mailversand).values({
    art: "SONSTIGES", status: "ENTWURF", an: an.join(", "), betreff, bodyHtml: textZuHtml(text),
    createdBy: user.id, updatedBy: user.id,
  }).returning({ id: mailversand.id });
  try {
    await getTransport().sendMail({ from: cfg.from, to: an.join(", "), subject: betreff, text, attachments });
    await db.update(mailversand).set({ status: "ERFOLG", gesendetAm: new Date(), updatedAt: new Date() }).where(eq(mailversand.id, m.id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(mailversand).set({ status: "FEHLER", fehlerText: msg, updatedAt: new Date() }).where(eq(mailversand.id, m.id));
    throw new DomainError("STATE", `Versand fehlgeschlagen: ${msg}`);
  }
  return { anzahl: exp.anzahl, an, warnungen: exp.warnungen, pdfs: attachments.length - 1 };
}

export async function updateDatevKonfig(input: Record<string, string>) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const s = await getFirmaSetting();
  const t = (k: string) => (input[k] ?? "").trim();
  const konto = (k: string) => {
    const v = t(k);
    if (!/^\d{4,9}$/.test(v)) throw new DomainError("VALIDATION", `Konto „${k}“ ungültig (nur Ziffern).`);
    return v;
  };
  const laenge = Number(t("sachkontenlaenge"));
  const wj = Number(t("wjBeginnMonat"));
  if (!(laenge >= 4 && laenge <= 8)) throw new DomainError("VALIDATION", "Sachkontenlänge 4–8.");
  if (!(wj >= 1 && wj <= 12)) throw new DomainError("VALIDATION", "WJ-Beginn: Monat 1–12.");
  await db.update(firmaSetting).set({
    datevBeraterNr: t("beraterNr") || null,
    datevMandantNr: t("mandantNr") || null,
    datevSachkontenlaenge: laenge,
    datevWjBeginnMonat: wj,
    datevDebitor: konto("debitor"),
    datevKontoInland: konto("kontoInland"),
    datevKontoEu: konto("kontoEu"),
    datevKontoDrittland: konto("kontoDrittland"),
    datevKontoAnzahlung: konto("kontoAnzahlung"),
    datevEmpfaenger: t("empfaenger"),
    updatedAt: new Date(), updatedBy: user.id,
  }).where(eq(firmaSetting.id, s.id));
}
