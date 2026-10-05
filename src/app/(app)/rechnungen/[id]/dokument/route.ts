import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rechnung } from "@/lib/db/schema";
import { anhangUrl } from "@/lib/domain/anhang";
import { isDomainError } from "@/lib/domain/errors";

/** Archiviertes (festgeschriebenes) Rechnungs-PDF öffnen — leitet auf eine frisch signierte URL weiter. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [r] = await db.select({ asset: rechnung.erechnungAssetId }).from(rechnung).where(eq(rechnung.id, id));
    if (!r?.asset) return NextResponse.json({ error: "Kein archiviertes PDF" }, { status: 404 });
    const url = await anhangUrl(r.asset, false);
    return NextResponse.redirect(url);
  } catch (e) {
    if (isDomainError(e) && e.code === "UNAUTHENTICATED") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    console.error("[rechnung/dokument]", e);
    return NextResponse.json({ error: "PDF nicht verfügbar" }, { status: 500 });
  }
}
