import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { appUser, auftrag, auftragEreignis, rechnung, seriennummer } from "@/lib/db/schema";
import { AUFTRAG_STATUS_LABEL, type AuftragStatus } from "@/lib/auftrag-shared";
import { RG_BELEGART_LABEL, type RgBelegart } from "@/lib/rechnung-shared";
import { requireUser } from "./context";
import type { VerlaufEreignis } from "./rechnung-verlauf";

export type AuftragEreignisArt = "STATUS" | "BAUPLAN" | "AB_GESENDET" | "AB_UNTERSCHRIEBEN";

/** Ereignis ins Auftrags-Protokoll schreiben (nur anfügen). Ohne Rollenprüfung — Aufrufer prüft. */
export async function logAuftrag(
  auftragId: string,
  art: AuftragEreignisArt,
  d: { von?: string | null; nach?: string | null; text?: string | null },
  userId: string | null,
) {
  await db.insert(auftragEreignis).values({
    auftragId, art, von: d.von ?? null, nach: d.nach ?? null, text: d.text ?? null, userId,
  });
}

const statusLabel = (s: string | null) => (s ? AUFTRAG_STATUS_LABEL[s as AuftragStatus] ?? s : "–");

/** Tage zwischen zwei YYYY-MM-DD. */
export function tageZwischen(von: string | null, bis: string | null): number | null {
  if (!von || !bis) return null;
  return Math.round((Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${von}T12:00:00Z`)) / 86_400_000);
}

/**
 * Verlauf eines Auftrags: protokollierte Ereignisse (Statuswechsel, Bauplandatum, Auftragsbestätigung)
 * plus aus den Daten abgeleitete Meilensteine (angelegt, Werkstattbeginn, Endmontage, Versand,
 * Rechnungen, Zahlungen) — chronologisch, neueste zuletzt.
 */
export async function auftragVerlauf(id: string) {
  await requireUser();
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, id));
  if (!a) return null;
  const [log, rechnungen] = await Promise.all([
    db.select().from(auftragEreignis).where(eq(auftragEreignis.auftragId, id)).orderBy(asc(auftragEreignis.zeit)),
    db.select({
      id: rechnung.id, nummer: rechnung.nummer, belegart: rechnung.belegart, status: rechnung.status,
      rechnungsdatum: rechnung.rechnungsdatum, zahlungsdatum: rechnung.zahlungsdatum, gebuchtAm: rechnung.gebuchtAm,
    }).from(rechnung).where(eq(rechnung.auftragId, id)),
  ]);
  const userIds = [...new Set([a.createdBy, a.updatedBy, ...log.map((l) => l.userId)].filter((x): x is string => !!x))];
  const users = userIds.length
    ? await db.select({ id: appUser.id, name: appUser.name }).from(appUser).where(inArray(appUser.id, userIds))
    : [];
  const wer = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? null;

  const ev: VerlaufEreignis[] = [];
  // angelegt (Ninox-Altbestand: Zeitpunkt aus Ninox, Name aus „erfasst von")
  ev.push({
    zeit: a.createdAt.toISOString(), nurDatum: false, text: a.createdBy ? "Auftrag angelegt" : "Auftrag angelegt (Ninox)",
    wer: wer(a.createdBy) ?? a.erfasstVon, eigen: true, ton: "neutral",
  });
  const [sn] = a.seriennummerId
    ? await db.select({ anzeige: seriennummer.anzeige, vergebenAm: seriennummer.vergebenAm }).from(seriennummer).where(eq(seriennummer.id, a.seriennummerId))
    : [];
  if (sn?.vergebenAm) ev.push({ zeit: sn.vergebenAm, nurDatum: true, text: `Seriennummer vergeben: ${sn.anzeige}`, eigen: true, ton: "neutral" });
  if (a.modellvorlageVergebenAt) ev.push({ zeit: a.modellvorlageVergebenAt.toISOString(), nurDatum: false, text: "Modellvorlage übernommen", eigen: true, ton: "neutral" });

  for (const l of log) {
    const zeit = l.zeit.toISOString();
    if (l.art === "STATUS") {
      ev.push({ zeit, nurDatum: false, text: `Status: ${statusLabel(l.von)} → ${statusLabel(l.nach)}${l.text ? ` (${l.text})` : ""}`, wer: wer(l.userId), eigen: true, ton: l.nach === "STORNIERT" ? "red" : l.nach === "BESTAETIGT" ? "green" : "blue" });
    } else if (l.art === "BAUPLAN") {
      ev.push({ zeit, nurDatum: false, text: l.nach ? `Bauplandatum gesetzt: ${l.nach.slice(0, 7).replace("-", "/")}` : "Bauplandatum entfernt", wer: wer(l.userId), eigen: true, ton: "neutral" });
    } else if (l.art === "AB_GESENDET") {
      ev.push({ zeit, nurDatum: false, text: `Auftragsbestätigung zur Unterschrift gesendet${l.text ? ` an ${l.text}` : ""}`, wer: wer(l.userId), eigen: true, ton: "amber" });
    } else if (l.art === "AB_UNTERSCHRIEBEN") {
      ev.push({ zeit, nurDatum: false, text: `Auftragsbestätigung unterschrieben von ${l.text ?? "–"}`, eigen: true, ton: "green" });
    }
  }

  if (a.werkstattbeginn) ev.push({ zeit: a.werkstattbeginn, nurDatum: true, text: "Werkstattbeginn", eigen: true, ton: "blue" });
  if (a.endmontagedatum) ev.push({ zeit: a.endmontagedatum, nurDatum: true, text: "Endmontage", eigen: true, ton: "blue" });
  if (a.versanddatum) ev.push({ zeit: a.versanddatum, nurDatum: true, text: "Versendet", eigen: true, ton: "green" });
  for (const r of rechnungen) {
    if (!r.nummer) continue;
    const art = RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart;
    const datum = r.rechnungsdatum ?? (r.gebuchtAm ? r.gebuchtAm.toISOString().slice(0, 10) : null);
    if (datum) ev.push({ zeit: datum, nurDatum: true, text: `${art} gebucht`, link: { href: `/rechnungen/${r.id}`, label: r.nummer }, eigen: false, ton: "neutral" });
    if (r.zahlungsdatum) ev.push({ zeit: r.zahlungsdatum, nurDatum: true, text: `Zahlung eingegangen (${art})`, link: { href: `/rechnungen/${r.id}`, label: r.nummer }, eigen: false, ton: "green" });
  }
  ev.sort((x, y) => x.zeit.localeCompare(y.zeit));

  // Eckdaten
  const gebucht = rechnungen.filter((r) => r.nummer && r.belegart !== "STORNORECHNUNG");
  const erstesDatum = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort()[0] ?? null;
  const letztesDatum = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort().at(-1) ?? null;
  return {
    ereignisse: ev,
    eckdaten: {
      erfasstAm: a.erfasstAm,
      erfasstVon: a.erfasstVon,
      serNrVergeben: sn?.vergebenAm ?? null,
      modellvorlageVergeben: a.modellvorlageVergebenAt,
      tageSeitWerkstattbeginn: a.werkstattbeginn && !a.endmontagedatum
        ? tageZwischen(a.werkstattbeginn, new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date()))
        : null,
      bauplandatum: a.bauplandatum,
      werkstattbeginn: a.werkstattbeginn,
      endmontagedatum: a.endmontagedatum,
      tageWerkstatt: tageZwischen(a.werkstattbeginn, a.endmontagedatum),
      versanddatum: a.versanddatum,
      rechnungsdatum: erstesDatum([...gebucht.map((r) => r.rechnungsdatum), a.rechnungsdatum]),
      zahlungsdatum: letztesDatum([...gebucht.map((r) => r.zahlungsdatum), a.zahlungsdatum]),
      erstelltAm: a.createdAt,
      erstelltVon: wer(a.createdBy) ?? a.erfasstVon,
      auftragsdatum: a.auftragsdatum,
      geaendertAm: a.updatedAt,
      geaendertVon: wer(a.updatedBy),
      fortschrittProzent: a.fortschrittProzent,
      umsatzerwartung: a.umsatzerwartung,
      standHeWert: a.standHeWert,
    },
  };
}
