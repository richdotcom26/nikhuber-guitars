import { NextResponse } from "next/server";
import { type BelegArt, renderBelegData } from "@/lib/domain/beleg-render";
import { isDomainError } from "@/lib/domain/errors";
import { renderBelegPdf } from "@/lib/pdf/render";

export const runtime = "nodejs";

const ARTEN: BelegArt[] = ["angebot", "auftrag", "rechnung"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ art: string; id: string }> },
) {
  const { art, id } = await params;
  if (!ARTEN.includes(art as BelegArt)) {
    return NextResponse.json({ error: "unbekannte Belegart" }, { status: 404 });
  }

  try {
    const data = await renderBelegData(art as BelegArt, id);
    const pdf = await renderBelegPdf(data);
    const name = `${data.titel}_${data.nummer}`.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (isDomainError(e)) {
      if (e.code === "UNAUTHENTICATED") {
        return NextResponse.redirect(new URL("/login", _req.url));
      }
      if (e.code === "NOT_FOUND") {
        return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });
      }
    }
    console.error("[druck/pdf]", e);
    return NextResponse.json({ error: "PDF-Erzeugung fehlgeschlagen" }, { status: 500 });
  }
}
