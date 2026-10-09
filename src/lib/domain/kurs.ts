import "server-only";
import { getFirmaSetting } from "./stammdaten";

export interface UsdEurKurs {
  /** 1 USD = faktor EUR */
  faktor: number;
  quelle: "EZB" | "Einstellungen";
  datum: string | null;
}

/**
 * Aktueller Umrechnungskurs USD → EUR: Referenzkurs der Europäischen Zentralbank (tagesaktuell,
 * 6 h gecacht). Fällt der Abruf aus, gilt der Faktor aus Einstellungen → Firma.
 */
export async function usdEurKurs(): Promise<UsdEurKurs> {
  try {
    const res = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
      next: { revalidate: 6 * 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const xml = await res.text();
      const rate = Number(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/.exec(xml)?.[1]);
      const datum = /time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1] ?? null;
      if (rate > 0) return { faktor: 1 / rate, quelle: "EZB", datum };
    }
  } catch {
    // Netz/Timeout → Fallback
  }
  return { faktor: Number((await getFirmaSetting()).usdEurFaktor) || 0.92, quelle: "Einstellungen", datum: null };
}
