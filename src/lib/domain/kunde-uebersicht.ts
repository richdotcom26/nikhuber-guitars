import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { angebot, artikel, auftrag, rechnung, seriennummer } from "@/lib/db/schema";
import { requireUser } from "./context";
import { usdEurKurs } from "./kurs";

/**
 * Kundenübersicht (Adresse, rechte Spalte): alle Angebote/Aufträge/Rechnungen + Statistik
 * (Umsatz je Jahr, Tendenz, Aktivität, Zahlungsdauer).
 */

// Netto: gespeicherte Summe, sonst (Ninox-Altbestand) Summe der Positionen. "rechnung"."id" explizit:
// Drizzle lässt bei Einzeltabellen-Selects den Tabellennamen weg (sonst griffe die Unterabfrage auf p.id).
const RG_NETTO = sql<string | null>`coalesce(${rechnung.summeNetto}, round((select coalesce(sum(p.gesamtpreis) filter (where p.re_relevant), sum(p.gesamtpreis)) from beleg_position p where p.rechnung_id = "rechnung"."id"), 2))`;

export async function kundeUebersicht(kundeId: string) {
  await requireUser();
  const [angebote, auftraege, rechnungen, kurs] = await Promise.all([
    db.select({
      id: angebot.id, nummer: angebot.nummer, datum: angebot.angebotsdatum, status: angebot.status,
      netto: angebot.summeNetto, waehrung: angebot.kdWaehrung, modell: artikel.nameKurz,
    }).from(angebot)
      .leftJoin(artikel, eq(artikel.id, angebot.modellArtikelId))
      .where(eq(angebot.kundeId, kundeId))
      .orderBy(desc(angebot.angebotsdatum), desc(angebot.createdAt)),
    db.select({
      id: auftrag.id, nummer: auftrag.nummer, datum: auftrag.auftragsdatum, status: auftrag.status,
      art: auftrag.auftragsart, waehrung: auftrag.kdWaehrung, modell: artikel.nameKurz,
      umsatz: auftrag.umsatzerwartung, serNr: seriennummer.anzeige,
    }).from(auftrag)
      .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
      .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
      .where(eq(auftrag.kundeId, kundeId))
      .orderBy(desc(auftrag.auftragsdatum), desc(auftrag.createdAt)),
    db.select({
      id: rechnung.id, nummer: rechnung.nummer, datum: rechnung.rechnungsdatum, status: rechnung.status,
      belegart: rechnung.belegart, waehrung: rechnung.kdWaehrung, netto: RG_NETTO,
      zahlungsdatum: rechnung.zahlungsdatum,
    }).from(rechnung)
      .where(eq(rechnung.kundeId, kundeId))
      .orderBy(sql`${rechnung.rechnungsdatum} desc nulls first`, desc(rechnung.createdAt)),
    usdEurKurs(),
  ]);

  // Umsatz je Jahr (netto, EUR): gebuchte Belege ohne Anzahlungsrechnungen (stecken in der Endrechnung);
  // Storno/Korrektur mit Vorzeichen. USD mit aktuellem Kurs umgerechnet.
  const jeJahr = new Map<number, number>();
  const zahlTage: number[] = [];
  for (const r of rechnungen) {
    if (!r.nummer || !r.datum || r.status === "ENTWURF" || r.belegart === "ANZAHLUNGSRECHNUNG") continue;
    const eur = Number(r.netto ?? 0) * (r.waehrung === "USD" ? kurs.faktor : 1);
    const j = Number(r.datum.slice(0, 4));
    jeJahr.set(j, (jeJahr.get(j) ?? 0) + eur);
    if (r.zahlungsdatum && r.belegart === "RECHNUNG") {
      const t = (Date.parse(r.zahlungsdatum) - Date.parse(r.datum)) / 86_400_000;
      if (t >= 0 && t < 730) zahlTage.push(t);
    }
  }
  const aktJahr = new Date().getFullYear();
  const ersteJahr = Math.min(aktJahr - 4, ...[...jeJahr.keys()]);
  const umsatzJahre = Array.from({ length: aktJahr - ersteJahr + 1 }, (_, i) => ersteJahr + i)
    .map((jahr) => ({ jahr, eur: Math.round((jeJahr.get(jahr) ?? 0) * 100) / 100 }));
  const gesamt = umsatzJahre.reduce((s, x) => s + x.eur, 0);

  // Tendenz: letzte 2 Jahre (inkl. laufendem) vs. die 2 Jahre davor
  const summe = (von: number, bis: number) => umsatzJahre.filter((x) => x.jahr >= von && x.jahr <= bis).reduce((s, x) => s + x.eur, 0);
  const neu = summe(aktJahr - 1, aktJahr);
  const alt = summe(aktJahr - 3, aktJahr - 2);
  const tendenz: "steigend" | "fallend" | "gleich" | "neu" | "inaktiv" =
    neu === 0 && alt === 0 ? "inaktiv"
      : alt === 0 ? "neu"
        : neu > alt * 1.15 ? "steigend" : neu < alt * 0.85 ? "fallend" : "gleich";

  const daten = [
    ...angebote.map((a) => a.datum), ...auftraege.map((a) => a.datum), ...rechnungen.map((r) => r.datum),
  ].filter((d): d is string => !!d).sort();
  const letzteAktivitaet = daten.at(-1) ?? null;
  const offen = rechnungen.filter((r) => (r.status === "GEBUCHT" || r.status === "OFFEN") && !r.zahlungsdatum
    && (r.belegart === "RECHNUNG" || r.belegart === "ANZAHLUNGSRECHNUNG"));

  return {
    angebote, auftraege, rechnungen,
    statistik: {
      umsatzJahre, gesamt: Math.round(gesamt * 100) / 100, tendenz, letzteAktivitaet,
      kundeSeit: daten[0] ?? null,
      zahlungsdauer: zahlTage.length ? Math.round(zahlTage.reduce((s, t) => s + t, 0) / zahlTage.length) : null,
      zahlungenGezaehlt: zahlTage.length,
      offeneRechnungen: offen.length,
      angeboteZuAuftrag: angebote.length ? Math.round((angebote.filter((a) => a.status === "AUFTRAG").length / angebote.length) * 100) : null,
      kurs,
    },
  };
}
