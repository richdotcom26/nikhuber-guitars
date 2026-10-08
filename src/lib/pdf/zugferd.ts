import "server-only";
import { zugferd } from "node-zugferd";
import { BASIC } from "node-zugferd/profile";
import type { BelegRenderData } from "@/lib/domain/beleg-render";

/**
 * ZUGFeRD/Factur-X (Profil BASIC, EN-16931-konform) aus einem Rechnungs-Beleg.
 *
 * `strict: false` → keine XSD-Validierung (die bräuchte eine JRE via
 * `xsd-schema-validator`; auf Vercel nicht verfügbar). Vor produktivem Einsatz
 * sollte das erzeugte XML einmal mit einem echten Validator (Mustang / FeRD)
 * gegengeprüft werden.
 */

const invoicer = zugferd({ profile: BASIC, strict: false });

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

/** BelegRenderData -> node-zugferd BASIC-Eingabestruktur. */
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
          ...(data.firma.ustId ? { taxRegistration: { vatIdentifier: data.firma.ustId } } : {}),
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
      tradeDelivery: {},
      tradeSettlement: {
        currencyCode: cur,
        ...(data.firma.iban
          ? { paymentMeans: [{ typeCode: "58", payeeAccount: { iban: data.firma.iban, ...(data.firma.bic ? { bic: data.firma.bic } : {}) } }] }
          : {}),
        ...(data.zahlungsbedingung ? { paymentTerms: { description: data.zahlungsbedingung } } : {}),
        ...(allowances.length ? { allowances } : {}),
        ...(charges.length ? { charges } : {}),
        vatBreakdown: [{
          calculatedAmount: mwst,
          typeCode: "VAT",
          categoryCode,
          basisAmount: netto,
          rateApplicablePercent: rate,
          ...(exemptionReason ? { exemptionReason } : {}),
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
  return doc.embedInPdf(pdf instanceof Buffer ? new Uint8Array(pdf) : pdf, {
    metadata: {
      title: `${data.titel} ${data.nummer}`,
      author: data.firma.firma,
      subject: `E-Rechnung ${data.nummer}`,
    },
  });
}

export async function zugferdXml(data: BelegRenderData): Promise<string> {
  return invoicer.create(belegZuZugferd(data) as never).toXML();
}
