import "server-only";
import { and, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { appUser, auftrag, mahnung, mailversand, rechnung, rechnungAnzahlung } from "@/lib/db/schema";
import { RG_BELEGART_LABEL, type RgBelegart } from "@/lib/rechnung-shared";
import { requireUser } from "./context";
import { formatMoney } from "@/lib/utils";

/**
 * Verlauf einer Rechnung (Startseite der Rechnung): alle Ereignisse zur Rechnung selbst und zu
 * verbundenen Belegen (Auftrag, Storno/Korrektur, Anzahlungsrechnungen, Abzüge, E-Mails, Zahlung),
 * chronologisch. Wird aus vorhandenen Zeitstempeln abgeleitet — kein eigenes Protokoll nötig.
 * Altbestand aus Ninox (created_by leer): Zeitpunkt = Rechnungs-/Auftragsdatum statt Importzeit.
 */
export interface VerlaufEreignis {
  zeit: string;            // ISO-Zeitpunkt oder YYYY-MM-DD
  nurDatum: boolean;
  text: string;
  link?: { href: string; label: string };
  wer?: string | null;
  eigen: boolean;          // betrifft diese Rechnung selbst
  ton: "neutral" | "green" | "red" | "blue" | "amber";
}

type R = typeof rechnung.$inferSelect;
const art = (b: string) => RG_BELEGART_LABEL[b as RgBelegart] ?? b;
const nr = (r: Pick<R, "nummer">) => r.nummer ?? "(Entwurf)";

export async function rechnungVerlauf(id: string): Promise<VerlaufEreignis[]> {
  await requireUser();
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) return [];

  // Verbundene Belege: Original/Folgebelege, alle Belege desselben Auftrags, Abzugs-Verknüpfungen
  const bezug = [eq(rechnung.referenzRechnungId, id)];
  if (r.referenzRechnungId) bezug.push(eq(rechnung.id, r.referenzRechnungId));
  if (r.auftragId) bezug.push(eq(rechnung.auftragId, r.auftragId));
  const andere = await db.select().from(rechnung).where(and(or(...bezug), ne(rechnung.id, id)));
  const alle = [r, ...andere];

  const userIds = [...new Set(alle.flatMap((x) => [x.createdBy, x.gebuchtVon]).filter((x): x is string => !!x))];
  const namen = new Map(
    userIds.length
      ? (await db.select({ id: appUser.id, name: appUser.name }).from(appUser).where(inArray(appUser.id, userIds)))
        .map((u) => [u.id, u.name])
      : [],
  );
  const wer = (uid: string | null) => (uid ? namen.get(uid) ?? null : null);

  const ev: VerlaufEreignis[] = [];
  const link = (x: R) => ({ href: `/rechnungen/${x.id}`, label: `${art(x.belegart)} ${nr(x)}` });

  // Auftrag
  if (r.auftragId) {
    const [a] = await db
      .select({ id: auftrag.id, nummer: auftrag.nummer, createdAt: auftrag.createdAt, createdBy: auftrag.createdBy, datum: auftrag.auftragsdatum })
      .from(auftrag).where(eq(auftrag.id, r.auftragId));
    if (a) {
      const alt = !a.createdBy;
      ev.push({
        zeit: alt && a.datum ? a.datum : a.createdAt.toISOString(),
        nurDatum: alt && !!a.datum,
        text: "Auftrag angelegt",
        link: { href: `/auftraege/${a.id}`, label: a.nummer },
        eigen: false,
        ton: "blue",
      });
    }
  }

  for (const x of alle) {
    const eigen = x.id === id;
    const alt = !x.createdBy && !x.gebuchtAm; // Ninox-Altbestand
    if (alt) {
      ev.push({
        zeit: x.rechnungsdatum ?? x.createdAt.toISOString(),
        nurDatum: !!x.rechnungsdatum,
        text: eigen ? `${art(x.belegart)} gestellt (aus Ninox übernommen)` : `${art(x.belegart)} gestellt (Ninox)`,
        link: eigen ? undefined : link(x),
        eigen,
        ton: x.belegart === "STORNORECHNUNG" ? "red" : "neutral",
      });
    } else {
      const herkunft = x.belegart === "STORNORECHNUNG" || x.belegart === "RECHNUNGSKORREKTUR"
        ? " (Bezug auf Original)"
        : x.auftragId ? "" : " (ohne Auftrag)";
      ev.push({
        zeit: x.createdAt.toISOString(),
        nurDatum: false,
        text: eigen ? `Entwurf angelegt${herkunft}` : `${art(x.belegart)}: Entwurf angelegt`,
        link: eigen ? undefined : link(x),
        wer: wer(x.createdBy),
        eigen,
        ton: "neutral",
      });
      if (x.gebuchtAm) {
        ev.push({
          zeit: x.gebuchtAm.toISOString(),
          nurDatum: false,
          text: eigen ? `Gebucht als ${x.nummer} (E-Rechnung archiviert)` : `${art(x.belegart)} gebucht`,
          link: eigen ? undefined : link(x),
          wer: wer(x.gebuchtVon),
          eigen,
          ton: x.belegart === "STORNORECHNUNG" ? "red" : "blue",
        });
      }
    }
    // Storno-Wirkung aufs Original
    if (x.belegart === "STORNORECHNUNG" && x.referenzRechnungId && (x.gebuchtAm || x.rechnungsdatum)) {
      const orig = alle.find((o) => o.id === x.referenzRechnungId);
      if (orig) {
        ev.push({
          zeit: x.gebuchtAm ? x.gebuchtAm.toISOString() : x.rechnungsdatum!,
          nurDatum: !x.gebuchtAm,
          text: orig.id === id ? "Storniert durch" : `${art(orig.belegart)} ${nr(orig)} storniert durch`,
          link: link(x),
          eigen: orig.id === id,
          ton: "red",
        });
      }
    }
    // Zahlung
    if (x.zahlungsdatum && x.zahlbetrag) {
      ev.push({
        zeit: x.zahlungsdatum,
        nurDatum: true,
        text: eigen
          ? `Zahlung eingegangen: ${Number(x.zahlbetrag).toLocaleString("de-DE", { minimumFractionDigits: 2 })} ${x.kdWaehrung === "USD" ? "$" : "€"}${x.zahlungAnBank ? ` (${x.zahlungAnBank})` : ""}`
          : `Zahlung zu ${art(x.belegart)} ${nr(x)} eingegangen`,
        link: eigen ? undefined : link(x),
        eigen,
        ton: "green",
      });
    }
  }

  // Anzahlungsabzüge (in dieser Rechnung abgezogen / diese Anzahlung woanders abgezogen)
  const abz = await db
    .select({
      rechnungId: rechnungAnzahlung.rechnungId, azId: rechnungAnzahlung.anzahlungRechnungId,
      createdAt: rechnungAnzahlung.createdAt, brutto: rechnungAnzahlung.brutto,
    })
    .from(rechnungAnzahlung)
    .where(or(eq(rechnungAnzahlung.rechnungId, id), eq(rechnungAnzahlung.anzahlungRechnungId, id)));
  const fehlend = abz.flatMap((a) => [a.rechnungId, a.azId]).filter((x) => !alle.some((y) => y.id === x));
  const extra = fehlend.length ? await db.select().from(rechnung).where(inArray(rechnung.id, fehlend)) : [];
  const finde = (x: string) => [...alle, ...extra].find((y) => y.id === x);
  for (const a of abz) {
    const ziel = finde(a.rechnungId);
    const az = finde(a.azId);
    if (!ziel || !az) continue;
    const betrag = Number(a.brutto).toLocaleString("de-DE", { minimumFractionDigits: 2 });
    ev.push(a.rechnungId === id
      ? { zeit: a.createdAt.toISOString(), nurDatum: false, text: `Anzahlung (${betrag}) als Abzug übernommen:`, link: link(az), eigen: true, ton: "amber" }
      : { zeit: a.createdAt.toISOString(), nurDatum: false, text: `Abgezogen (${betrag}) in`, link: link(ziel), eigen: true, ton: "amber" });
  }

  // E-Mails zu dieser Rechnung
  const mails = await db
    .select({ id: mailversand.id, an: mailversand.an, gesendetAm: mailversand.gesendetAm, status: mailversand.status, createdAt: mailversand.createdAt })
    .from(mailversand)
    .where(and(eq(mailversand.rechnungId, id), or(isNotNull(mailversand.gesendetAm), eq(mailversand.status, "FEHLER"))));
  // Mahnvorgänge (Stufe, Gebühr, Empfänger)
  const mahnungen = await db
    .select({ stufe: mahnung.stufe, gebuehr: mahnung.gebuehr, waehrung: mahnung.waehrung, createdAt: mahnung.createdAt, mailId: mahnung.mailversandId })
    .from(mahnung)
    .where(eq(mahnung.rechnungId, id));
  const mahnMails = new Set(mahnungen.map((m) => m.mailId).filter(Boolean));
  for (const m of mahnungen) {
    const an = mails.find((x) => x.id === m.mailId)?.an;
    const geb = Number(m.gebuehr) ? ` · Gebühr ${formatMoney(m.gebuehr, m.waehrung === "USD" ? "USD" : "EUR")}` : "";
    ev.push({
      zeit: m.createdAt.toISOString(),
      nurDatum: false,
      text: `${m.stufe === 3 ? "Letzte Mahnung" : `${m.stufe}. Zahlungserinnerung`} (Mahnstufe ${m.stufe}) gesendet${an ? ` an ${an}` : ""}${geb}`,
      link: m.mailId ? { href: `/mailversand/${m.mailId}`, label: "Protokoll" } : undefined,
      eigen: true,
      ton: m.stufe === 3 ? "red" : "amber",
    });
  }

  for (const m of mails) {
    if (mahnMails.has(m.id)) continue;
    ev.push({
      zeit: (m.gesendetAm ?? m.createdAt).toISOString(),
      nurDatum: false,
      text: m.gesendetAm ? `Per E-Mail versendet an ${m.an ?? "–"}` : `E-Mail-Versand fehlgeschlagen (${m.an ?? "–"})`,
      link: { href: `/mailversand/${m.id}`, label: "Protokoll" },
      eigen: true,
      ton: m.gesendetAm ? "green" : "red",
    });
  }

  return ev.sort((a, b) => (a.zeit < b.zeit ? -1 : a.zeit > b.zeit ? 1 : 0));
}
