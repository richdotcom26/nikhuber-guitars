import { erzeugeDatevExport } from "@/lib/domain/datev";
import { isDomainError } from "@/lib/domain/errors";

/** DATEV-Buchungsstapel eines Monats herunterladen: /api/datev?jahr=2026&monat=9 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  try {
    const exp = await erzeugeDatevExport(Number(u.searchParams.get("jahr")), Number(u.searchParams.get("monat")));
    return new Response(new Uint8Array(exp.bytes), {
      headers: {
        "Content-Type": "text/csv; charset=windows-1252",
        "Content-Disposition": `attachment; filename="${exp.dateiname}"`,
      },
    });
  } catch (e) {
    return new Response(isDomainError(e) ? e.message : "Export fehlgeschlagen.", { status: 400 });
  }
}
