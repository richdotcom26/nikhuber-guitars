import "server-only";
import { inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rechnung, rechnungAnzahlung } from "@/lib/db/schema";
import { RG_BELEGART_LABEL, RG_STATUS_LABEL, type RgBelegart, type RgStatus } from "@/lib/rechnung-shared";
import { formatDate, formatMoney } from "@/lib/utils";

export interface FamilienGlied {
  id: string;
  nummer: string | null;
  belegart: string;
  status: string;
  rechnungsdatum: string | null;
  text: string; // „RG-2026-3722 · Rechnung · 01.09.2026 · Gebucht“
}

/**
 * Vorgangsfamilie je Rechnung: alle Belege, die über denselben Auftrag, Storno/Korrektur-Referenz
 * oder Anzahlungsabzug miteinander verbunden sind. Ergebnis nur für Familien mit mehr als einem Beleg.
 */
export async function rechnungsFamilien(ids: string[]): Promise<Map<string, FamilienGlied[]>> {
  const ergebnis = new Map<string, FamilienGlied[]>();
  if (ids.length === 0) return ergebnis;

  type R = { id: string; nummer: string | null; belegart: string; status: string; rechnungsdatum: string | null; auftragId: string | null; referenzRechnungId: string | null; betrag: string | null; waehrung: string | null };
  const belege = new Map<string, R>();
  const kanten: [string, string][] = [];
  let offen = new Set(ids);

  // Hülle in wenigen Runden erweitern (Ketten sind kurz: Anzahlung → Rechnung → Storno → Korrektur)
  for (let runde = 0; runde < 4 && offen.size; runde++) {
    const s = [...offen];
    const auftraege = [...new Set([...belege.values()].filter((b) => offen.has(b.id) && b.auftragId).map((b) => b.auftragId!))];
    const conds = [inArray(rechnung.id, s), inArray(rechnung.referenzRechnungId, s)];
    if (auftraege.length) conds.push(inArray(rechnung.auftragId, auftraege));
    const rows = await db.select({
      id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, status: rechnung.status,
      rechnungsdatum: rechnung.rechnungsdatum, auftragId: rechnung.auftragId, referenzRechnungId: rechnung.referenzRechnungId,
      waehrung: rechnung.kdWaehrung,
      // Brutto; Ninox-Altbestand ohne Summe: aus den Positionen
      betrag: sql<string | null>`coalesce(${rechnung.summeBrutto}, round((select sum(p.gesamtpreis) from beleg_position p where p.rechnung_id = ${rechnung.id} and p.re_relevant) * case when ${rechnung.kdSteuerpflichtig} then 1 + coalesce(${rechnung.mwstSatz}, 19) / 100 else 1 end, 2))`,
    }).from(rechnung).where(or(...conds));
    const az = await db.select({ a: rechnungAnzahlung.rechnungId, b: rechnungAnzahlung.anzahlungRechnungId })
      .from(rechnungAnzahlung)
      .where(or(inArray(rechnungAnzahlung.rechnungId, s), inArray(rechnungAnzahlung.anzahlungRechnungId, s)));

    const neu = new Set<string>();
    for (const r of rows) {
      if (!belege.has(r.id)) { belege.set(r.id, r); neu.add(r.id); }
      if (r.referenzRechnungId) { kanten.push([r.id, r.referenzRechnungId]); if (!belege.has(r.referenzRechnungId)) neu.add(r.referenzRechnungId); }
    }
    for (const k of az) {
      kanten.push([k.a, k.b]);
      for (const x of [k.a, k.b]) if (!belege.has(x)) neu.add(x);
    }
    // in der ersten Runde kennen wir die Aufträge der Ausgangsbelege erst jetzt → nochmal mit ihnen
    if (runde === 0) for (const id of ids) if (belege.get(id)?.auftragId) neu.add(id);
    offen = neu;
  }

  // Union-Find: gleicher Auftrag + Kanten
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const proAuftrag = new Map<string, string>();
  for (const b of belege.values()) {
    if (!b.auftragId) continue;
    const erster = proAuftrag.get(b.auftragId);
    if (erster) union(b.id, erster); else proAuftrag.set(b.auftragId, b.id);
  }
  for (const [a, b] of kanten) if (belege.has(a) && belege.has(b)) union(a, b);

  const gruppen = new Map<string, FamilienGlied[]>();
  for (const b of belege.values()) {
    const g = gruppen.get(find(b.id)) ?? [];
    g.push({
      id: b.id, nummer: b.nummer, belegart: b.belegart, status: b.status, rechnungsdatum: b.rechnungsdatum,
      text: [
        b.nummer ?? "Entwurf",
        RG_BELEGART_LABEL[b.belegart as RgBelegart] ?? b.belegart,
        b.rechnungsdatum ? formatDate(b.rechnungsdatum) : null,
        b.betrag != null ? formatMoney(b.betrag, b.waehrung === "USD" ? "USD" : "EUR") : null,
        RG_STATUS_LABEL[b.status as RgStatus] ?? b.status,
      ].filter(Boolean).join(" · "),
    });
    gruppen.set(find(b.id), g);
  }
  for (const g of gruppen.values()) g.sort((x, y) => (x.rechnungsdatum ?? "9").localeCompare(y.rechnungsdatum ?? "9"));
  for (const id of ids) {
    const g = gruppen.get(find(id));
    if (g && g.length > 1) ergebnis.set(id, g);
  }
  return ergebnis;
}
