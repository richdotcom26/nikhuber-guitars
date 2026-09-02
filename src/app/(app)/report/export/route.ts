import { NextRequest, NextResponse } from "next/server";
import { isDomainError } from "@/lib/domain/errors";
import { reportXlsx } from "@/lib/domain/report";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const jahr = Number(req.nextUrl.searchParams.get("jahr")) || new Date().getFullYear();
  const monatRaw = req.nextUrl.searchParams.get("monat");
  const monat = monatRaw ? Number(monatRaw) : undefined;

  try {
    const bytes = await reportXlsx(jahr, monat);
    const name = `report-${jahr}${monat ? `-${String(monat).padStart(2, "0")}` : ""}.xlsx`;
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (isDomainError(e) && e.code === "UNAUTHENTICATED") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    console.error("[report/export]", e);
    return new NextResponse("Export fehlgeschlagen.", { status: 500 });
  }
}
