import { NextResponse } from "next/server";
import { type BelegArt, renderBelegData } from "@/lib/domain/beleg-render";
import { isDomainError } from "@/lib/domain/errors";
import { renderBelegPdf } from "@/lib/pdf/render";
import { embedZugferd } from "@/lib/pdf/zugferd";

export const runtime = "nodejs";

const ARTEN: BelegArt[] = ["angebot", "auftrag", "rechnung"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ art: string; id: string }> },
) {
  const { art, id } = await params;
  if (!ARTEN.includes(art as BelegArt)) {
    return NextResponse.json({ error: "unbekannte Belegart" }, { status: 404 });
  }
  const zugferd = art === "rechnung" && new URL(req.url).searchParams.get("zugferd") === "1";

  try {
    const data = await renderBelegData(art as BelegArt, id);
    const base = await renderBelegPdf(data);
    const out = zugferd ? await embedZugferd(base, data) : base;
    const body = Buffer.from(out);
    const suffix = zugferd ? "_ZUGFeRD" : "";
    const name = `${data.titel}_${data.nummer}${suffix}`.replace(/[^\w.-]+/g, "_");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (isDomainError(e)) {
      if (e.code === "UNAUTHENTICATED") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (e.code === "NOT_FOUND") {
        return NextResponse.json({ error: "Beleg nicht gefunden" }, { status: 404 });
      }
    }
    console.error("[druck/pdf]", e);
    return NextResponse.json({ error: "PDF-Erzeugung fehlgeschlagen" }, { status: 500 });
  }
}
