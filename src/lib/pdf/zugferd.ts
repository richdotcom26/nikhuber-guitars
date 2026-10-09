import "server-only";
import { zugferd } from "node-zugferd";
import { EN16931 } from "node-zugferd/profile";
import type { BelegRenderData } from "@/lib/domain/beleg-render";
import { pdfaNachbessern } from "./pdfa";

/**
 * ZUGFeRD/Factur-X (Profil EN 16931 = „COMFORT") aus einem Rechnungs-Beleg — erfüllt die Anforderungen
 * an eine E-Rechnung nach § 14 UStG (BASIC/MINIMUM reichen dafür nicht sicher aus).
 *
 * `strict: false` → keine XSD-Validierung (die bräuchte eine JRE via
 * `xsd-schema-validator`; auf Vercel nicht verfügbar). Vor produktivem Einsatz
 * sollte das erzeugte XML einmal mit einem echten Validator (Mustang / FeRD)
 * gegengeprüft werden.
 */

const invoicer = zugferd({ profile: EN16931, strict: false });

/**
 * Workaround node-zugferd 0.1.x: in Nachlässen/Zuschlägen (CategoryTradeTax) steht TypeCode hinter
 * CategoryCode — laut XSD muss er davor stehen (Mustang: Schema-Fehler). Wir sortieren beim Formatieren um.
 */
function ordneCategoryTradeTax(xml: string): string {
  return xml.replace(/<ram:CategoryTradeTax>([\s\S]*?)<\/ram:CategoryTradeTax>/g, (_m, inner: string) => {
    const tc = inner.match(/\s*<ram:TypeCode>[^<]*<\/ram:TypeCode>/);
    if (!tc) return _m;
    const ohne = inner.replace(tc[0], "");
    return `<ram:CategoryTradeTax>${tc[0]}${ohne}</ram:CategoryTradeTax>`;
  });
}
{
  const xmlTools = (invoicer as unknown as { context?: { xml?: { format: (o: unknown) => string } } }).context?.xml;
  if (!xmlTools) console.warn("[zugferd] node-zugferd-Interna geändert – Reihenfolge-Korrektur nicht aktiv");
  else {
    const format = xmlTools.format.bind(xmlTools);
    xmlTools.format = (o: unknown) => ordneCategoryTradeTax(format(o));
  }
}

const n2 = (v: string | number | null | undefined) => {
  const x = Number(v ?? 0);
  return (Number.isFinite(x) ? x : 0).toFixed(2);
};

/** UNCL5305-Steuerkategorie + Satz aus unserem Steuerergebnis. */
function steuerKategorie(data: BelegRenderData): {
  categoryCode: "S" | "K" | "G";
  rate: string;
  exemptionReason: string | null;
} {
  if (data.steuerpflichtig) {
    return { categoryCode: "S", rate: n2(data.summen.mwstSatz), exemptionReason: null };
  }
  if (data.region === "EU") {
    return { categoryCode: "K", rate: "0.00", exemptionReason: data.steuerHinweis };
  }
  return { categoryCode: "G", rate: "0.00", exemptionReason: data.steuerHinweis };
}

function typeCode(belegart: string | null): string {
  if (belegart === "ANZAHLUNGSRECHNUNG") return "386";
  if (belegart === "RECHNUNGSKORREKTUR" || belegart === "STORNORECHNUNG") return "381";
  return "380";
}

/** BelegRenderData -> node-zugferd EN-16931-Eingabestruktur. */
export function belegZuZugferd(data: BelegRenderData) {
  const cur = data.waehrung;
  const { categoryCode, rate, exemptionReason } = steuerKategorie(data);

  const netto = n2(data.summen.netto);
  const mwst = n2(data.summen.mwst);
  const brutto = n2(data.summen.brutto);
  // Bereits gezahlt (BT-113): abgezogene Anzahlungsrechnungen + ggf. manuelle Alt-Anzahlung
  const vorausbezahlt = data.abzuege.reduce((s, a) => s + Number(a.brutto), 0) + Number(data.anzahlung?.brutto ?? 0);
  const faellig = vorausbezahlt ? n2(Number(data.summen.brutto ?? 0) - vorausbezahlt) : brutto;
  const issue = data.datum ? new Date(`${data.datum}T00:00:00Z`) : new Date();

  // Belegebene: Gesamtrabatt = Nachlass (BG-20, Code 95), Versand = Zuschlag (BG-21, Code FC).
  // EN 16931: Steuerbasis = Summe Positionen − Nachlässe + Zuschläge.
  const steuer = { typeCode: "VAT", categoryCode, vatRate: rate };
  const rabatt = data.summen.gesamtrabattAktiv ? Number(data.summen.gesamtrabattWert ?? 0) : 0;
  const versand = Number(data.summen.versand ?? 0);
  const allowances = rabatt ? [{
    actualAmount: n2(rabatt),
    calculationPercent: String(Number(data.summen.gesamtrabattProzent)),
    reasonCode: "95",
    reason: data.sprache === "EN" ? "Overall discount" : "Gesamtrabatt",
    categoryTradeTax: steuer,
  }] : [];
  const charges = versand ? [{
    actualAmount: n2(versand),
    reasonCode: "FC",
    reason: data.summen.versandBezeichnung ?? (data.sprache === "EN" ? "Shipping" : "Versandkosten"),
    categoryTradeTax: steuer,
  }] : [];

  const line = data.positionen.map((p, i) => {
    const lineTotal = n2(p.gesamt ?? Number(p.einzelpreis ?? 0) * Number(p.anzahl ?? 0));
    return {
      identifier: String(p.pos ?? i + 1),
      tradeProduct: {
        name: p.name || "—",
        ...(p.beschreibung ? { description: p.beschreibung } : {}),
      },
      tradeAgreement: { netTradePrice: { chargeAmount: n2(p.einzelpreis) } },
      tradeDelivery: { billedQuantity: { amount: String(Number(p.anzahl ?? 0)), unitMeasureCode: "C62" } },
      tradeSettlement: {
        tradeTax: { typeCode: "VAT", categoryCode, rateApplicablePercent: rate },
        monetarySummation: { lineTotalAmount: lineTotal },
      },
    };
  });

  return {
    number: data.nummer,
    typeCode: typeCode(data.belegart),
    issueDate: issue,
    ...(data.kopftext ? { includedNote: [{ content: data.kopftext }] } : {}),
    transaction: {
      line,
      tradeAgreement: {
        seller: {
          name: data.firma.firma,
          postalAddress: {
            line1: data.firma.strasse ?? undefined,
            postCode: data.firma.plz ?? undefined,
            city: data.firma.ort ?? undefined,
            countryCode: data.firma.landCode,
          },
          // BR-CO-26 / BR-S-02: USt-IdNr. (BT-31) und/oder Steuernummer (BT-32)
          ...(data.firma.ustId || data.firma.steuerNr ? {
            taxRegistration: {
              ...(data.firma.ustId ? { vatIdentifier: data.firma.ustId } : {}),
              ...(data.firma.steuerNr ? { localIdentifier: data.firma.steuerNr } : {}),
            },
          } : {}),
        },
        buyer: {
          name: data.kunde.name,
          postalAddress: {
            line1: data.kunde.strasse ?? undefined,
            postCode: data.kunde.plz ?? undefined,
            city: data.kunde.ort ?? undefined,
            countryCode: data.kunde.landCode ?? "DE",
          },
          ...(data.kunde.ustId ? { taxRegistration: { vatIdentifier: data.kunde.ustId } } : {}),
        },
        ...(data.auftragNummer ? { buyerOrderReference: { issuerAssignedID: data.auftragNummer } } : {}),
      },
      tradeDelivery: {
        // BG-13 Lieferanschrift (BR-IC-12: bei innergemeinschaftlicher Lieferung Pflicht) = Kundenanschrift
        shipTo: {
          name: data.kunde.name,
          postalAddress: {
            line1: data.kunde.strasse ?? undefined,
            postCode: data.kunde.plz ?? undefined,
            city: data.kunde.ort ?? undefined,
            countryCode: data.kunde.landCode ?? "DE",
          },
        },
        // BT-72 Liefer-/Leistungsdatum (in DE Pflichtangabe; Fallback Rechnungsdatum)
        information: { deliveryDate: data.lieferdatum ? new Date(`${data.lieferdatum}T00:00:00Z`) : issue },
      },
      tradeSettlement: {
        currencyCode: cur,
        ...(data.firma.iban
          ? { paymentMeans: [{ typeCode: "58", payeeAccount: { iban: data.firma.iban, ...(data.firma.bic ? { bic: data.firma.bic } : {}) } }] }
          : {}),
        // BR-CO-25: bei offenem Betrag Zahlungsbedingung (BT-20) oder Fälligkeit (BT-9) Pflicht
        paymentTerms: {
          description: data.zahlungsbedingung
            ?? (data.sprache === "EN" ? "Payable immediately without deduction." : "Zahlbar sofort ohne Abzug."),
        },
        ...(allowances.length ? { allowances } : {}),
        ...(charges.length ? { charges } : {}),
        vatBreakdown: [{
          calculatedAmount: mwst,
          typeCode: "VAT",
          categoryCode,
          basisAmount: netto,
          rateApplicablePercent: rate,
          ...(exemptionReason ? { exemptionReasonText: exemptionReason } : {}),
        }],
        monetarySummation: {
          lineTotalAmount: n2(data.summen.positionen ?? netto),
          ...(charges.length ? { chargeTotalAmount: n2(versand) } : {}),
          ...(allowances.length ? { allowanceTotalAmount: n2(rabatt) } : {}),
          taxBasisTotalAmount: netto,
          taxTotal: { amount: mwst, currencyCode: cur },
          grandTotalAmount: brutto,
          duePayableAmount: faellig,
          ...(vorausbezahlt ? { paidAmount: n2(vorausbezahlt) } : {}),
        },
      },
    },
  };
}

/** PDF-Bytes + Rechnungsdaten -> PDF/A-3 mit eingebettetem factur-x.xml. */
export async function embedZugferd(pdf: Uint8Array | Buffer, data: BelegRenderData): Promise<Uint8Array> {
  const doc = invoicer.create(belegZuZugferd(data) as never);
  const meta = {
    title: `${data.titel} ${data.nummer}`,
    author: data.firma.firma,
    subject: `E-Rechnung ${data.nummer}`,
  };
  const mitXml = await doc.embedInPdf(pdf instanceof Buffer ? new Uint8Array(pdf) : pdf, { metadata: meta });
  // PDF/A-3b: korrekte XMP-Metadaten, Info-Abgleich, ICC /N (node-zugferd 0.1.x liefert hier Fehler)
  const p = EN16931 as unknown as { documentFileName: string; conformanceLevel: string; version: string };
  return pdfaNachbessern(mitXml, {
    ...meta,
    facturX: { documentFileName: p.documentFileName, conformanceLevel: p.conformanceLevel, version: p.version },
  });
}

export async function zugferdXml(data: BelegRenderData): Promise<string> {
  return invoicer.create(belegZuZugferd(data) as never).toXML();
}
