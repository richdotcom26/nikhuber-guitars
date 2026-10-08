import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auftrag, rechnung } from "@/lib/db/schema";
import { requireUser } from "@/lib/domain/context";
import { isDomainError } from "@/lib/domain/errors";
import { getFirmaSetting } from "@/lib/domain/stammdaten";
import { renderQuittungPdf } from "@/lib/pdf/quittung-pdf";
import { RG_BELEGART_LABEL, type RgBelegart } from "@/lib/rechnung-shared";

export const runtime = "nodejs";

const EN_TITEL: Record<string, string> = {
  RECHNUNG: "Invoice", ANZAHLUNGSRECHNUNG: "Down Payment Invoice",
  STORNORECHNUNG: "Cancellation Invoice", RECHNUNGSKORREKTUR: "Invoice Correction",
};

/** Zahlungsbestätigung (Quittung) als PDF — setzt erfassten Zahlungseingang voraus. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireUser();
    const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
    if (!r) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
    if (!r.nummer || !r.zahlbetrag || !r.zahlungsdatum) {
      return NextResponse.json({ error: "Kein Zahlungseingang erfasst (Zahlbetrag + Zahlungsdatum)" }, { status: 409 });
    }
    const fs = await getFirmaSetting();
    const [a] = r.auftragId ? await db.select({ n: auftrag.nummer }).from(auftrag).where(eq(auftrag.id, r.auftragId)) : [];
    const sprache = (r.kdSprache ?? "DE") as "DE" | "EN";
    const kunde = r.kdBriefkopf
      || [r.kdFirma, [r.kdVorname, r.kdNachname].filter(Boolean).join(" "), r.kdStrasse, [r.kdPlz, r.kdOrt].filter(Boolean).join(" ")]
        .filter(Boolean).join("\n");
    const pdf = await renderQuittungPdf({
      sprache,
      waehrung: (r.kdWaehrung ?? "EUR") as "EUR" | "USD",
      firma: {
        firma: fs.firma,
        zeile: [fs.strasse, [fs.plz, fs.ort].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
        ort: fs.ort,
      },
      kunde,
      belegTitel: sprache === "EN" ? EN_TITEL[r.belegart] ?? "Invoice" : RG_BELEGART_LABEL[r.belegart as RgBelegart],
      belegNummer: r.nummer,
      belegDatum: r.rechnungsdatum,
      auftragNummer: a?.n ?? null,
      betrag: r.zahlbetrag,
      zahlungsdatum: r.zahlungsdatum,
      bank: r.zahlungAnBank,
      heute: new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()),
    });
    const name = `Zahlungsbestaetigung_${r.nummer}`.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (isDomainError(e) && e.code === "UNAUTHENTICATED") return NextResponse.redirect(new URL("/login", req.url));
    console.error("[quittung]", e);
    return NextResponse.json({ error: "PDF-Erzeugung fehlgeschlagen" }, { status: 500 });
  }
}
