import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { firmaSetting, kunde, mahnung, mailTemplate, mailversand, rechnung } from "@/lib/db/schema";
import { fuelleVorlage, istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { formatDate, formatMoney, heuteBerlin } from "@/lib/utils";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";
import { getFirmaSetting } from "./stammdaten";

/**
 * Mahnwesen: Stufe 1 + 2 = freundliche Zahlungserinnerung, Stufe 3 = letzte Mahnung.
 * Fristen (Tage seit Rechnungsdatum) und Gebühren: Einstellungen → Buchhaltung.
 * Offen = gebuchte Rechnung/Anzahlungsrechnung ohne Zahlungsdatum.
 */

const POS_NETTO = sql`(select coalesce(sum(p.gesamtpreis) filter (where p.re_relevant), sum(p.gesamtpreis)) from beleg_position p where p.rechnung_id = ${rechnung.id})`;

export const MAHN_STUFE_LABEL: Record<number, string> = {
  1: "1. Erinnerung", 2: "2. Erinnerung", 3: "Letzte Mahnung",
};

export async function mahnKonfig() {
  const s = await getFirmaSetting();
  return {
    tage: [s.mahnTage1, s.mahnTage2, s.mahnTage3],
    gebuehr: [Number(s.mahnGebuehr1), Number(s.mahnGebuehr2), Number(s.mahnGebuehr3)],
  };
}

export type Mahnvorschlag = Awaited<ReturnType<typeof listMahnvorschlaege>>[number];

/** Offene Rechnungen mit Alter, letzter Mahnstufe und nächster Stufe; ohne `alle` nur die fälligen. */
export async function listMahnvorschlaege(opts: { alle?: boolean } = {}) {
  await requireUser();
  const cfg = await mahnKonfig();
  const heute = heuteBerlin();

  const letzte = db
    .select({
      rechnungId: mahnung.rechnungId,
      stufe: sql<number>`max(${mahnung.stufe})`.as("letzte_stufe"),
      am: sql<string>`max(${mahnung.createdAt})`.as("letzte_am"),
    })
    .from(mahnung)
    .groupBy(mahnung.rechnungId)
    .as("letzte");

  const rows = await db
    .select({
      id: rechnung.id,
      nummer: rechnung.nummer,
      belegart: rechnung.belegart,
      rechnungsdatum: rechnung.rechnungsdatum,
      // offener Betrag (brutto, abzgl. Anzahlung) für die Mail; Netto für die Liste. Altbestand: aus Positionen.
      betrag: sql<string>`coalesce(${rechnung.rechnungsbetrag}, ${rechnung.summeBrutto}, round(${POS_NETTO} * case when ${rechnung.kdSteuerpflichtig} then 1 + coalesce(${rechnung.mwstSatz}, 19) / 100 else 1 end, 2))`,
      netto: sql<string>`coalesce(${rechnung.summeNetto}, round(${POS_NETTO}, 2))`,
      waehrung: rechnung.kdWaehrung,
      kdFirma: rechnung.kdFirma, kdVorname: rechnung.kdVorname, kdNachname: rechnung.kdNachname,
      email: kunde.email,
      pdf: rechnung.erechnungAssetId,
      letzteStufe: letzte.stufe,
      letzteAm: letzte.am,
      tage: sql<number>`(${heute}::date - ${rechnung.rechnungsdatum})::int`,
    })
    .from(rechnung)
    .leftJoin(kunde, eq(kunde.id, rechnung.kundeId))
    .leftJoin(letzte, eq(letzte.rechnungId, rechnung.id))
    .where(and(
      inArray(rechnung.status, ["GEBUCHT", "OFFEN"]),
      inArray(rechnung.belegart, ["RECHNUNG", "ANZAHLUNGSRECHNUNG"]),
      isNull(rechnung.zahlungsdatum),
      sql`${rechnung.rechnungsdatum} is not null`,
    ))
    .orderBy(rechnung.rechnungsdatum);

  return rows
    .map((r) => {
      const letzteStufe = Number(r.letzteStufe ?? 0);
      const naechsteStufe = letzteStufe >= 3 ? null : letzteStufe + 1;
      const faellig = naechsteStufe != null && Number(r.tage) >= cfg.tage[naechsteStufe - 1];
      return {
        ...r,
        tage: Number(r.tage),
        letzteStufe,
        naechsteStufe,
        faellig,
        gebuehr: naechsteStufe ? cfg.gebuehr[naechsteStufe - 1] : null,
      };
    })
    .filter((r) => opts.alle || r.faellig);
}

/** Für die gewählten Rechnungen jeweils die nächste Mahnstufe per Mail senden (Rechnungs-PDF im Anhang). */
export async function sendeMahnungen(ids: string[]) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (ids.length === 0) throw new DomainError("VALIDATION", "Keine Rechnung ausgewählt.");
  const cfg = await mahnKonfig();
  const vorschlaege = new Map((await listMahnvorschlaege({ alle: true })).map((r) => [r.id, r]));
  const vorlagen = await db.select().from(mailTemplate)
    .where(inArray(mailTemplate.belegart, ["MAHNUNG_1", "MAHNUNG_2", "MAHNUNG_3"]))
    .orderBy(desc(mailTemplate.istStandard));

  const ergebnis: { nummer: string | null; ok: boolean; info: string }[] = [];
  for (const id of ids) {
    const v = vorschlaege.get(id);
    if (!v || !v.naechsteStufe) {
      ergebnis.push({ nummer: v?.nummer ?? null, ok: false, info: "nicht offen oder bereits letzte Mahnung" });
      continue;
    }
    const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
    const [k] = r.kundeId
      ? await db.select({ email: kunde.email, cc: kunde.emailRechnungCc, briefanrede: kunde.briefanrede })
        .from(kunde).where(eq(kunde.id, r.kundeId))
      : [];
    const an = splitEmails(k?.email);
    if (an.length === 0 || !an.every(istEmail)) {
      ergebnis.push({ nummer: r.nummer, ok: false, info: "keine gültige E-Mail beim Kunden" });
      continue;
    }
    const stufe = v.naechsteStufe;
    const sprache = r.kdSprache === "EN" ? "EN" : "DE";
    const art = `MAHNUNG_${stufe}` as "MAHNUNG_1" | "MAHNUNG_2" | "MAHNUNG_3";
    const vorlage = vorlagen.find((t) => t.belegart === art && t.sprache === sprache)
      ?? vorlagen.find((t) => t.belegart === art);
    if (!vorlage) {
      ergebnis.push({ nummer: r.nummer, ok: false, info: `kein Textbaustein „${MAHN_STUFE_LABEL[stufe]}“` });
      continue;
    }
    const wg = r.kdWaehrung === "USD" ? "USD" : "EUR";
    const betrag = Number(v.betrag ?? 0);
    const gebuehr = cfg.gebuehr[stufe - 1];
    const werte = {
      briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
      rechnungsnummer: r.nummer,
      rechnungsdatum: formatDate(r.rechnungsdatum),
      betrag: formatMoney(betrag, wg),
      mahngebuehr: formatMoney(gebuehr, wg),
      gesamtbetrag: formatMoney(betrag + gebuehr, wg),
    };
    const fuelle = (t: string | null) => fuelleVorlage(t, werte as Parameters<typeof fuelleVorlage>[1]);

    const [m] = await db.insert(mailversand).values({
      art: "ZAHLUNGSERINNERUNG",
      status: "ENTWURF",
      rechnungId: r.id,
      auftragId: r.auftragId,
      kundeId: r.kundeId,
      an: an.join(", "),
      cc: k?.cc ?? null,
      betreff: fuelle(vorlage.betreff),
      bodyHtml: textZuHtml(fuelle(vorlage.bodyHtml)),
      anhangIds: r.erechnungAssetId ? [r.erechnungAssetId] : [],
      createdBy: user.id,
      updatedBy: user.id,
    }).returning({ id: mailversand.id });

    let ok = false;
    let fehler = "Versand fehlgeschlagen";
    try {
      const res = (await sendeMailversand(m.id)) as { ok?: boolean; message?: string };
      ok = res?.ok !== false;
      if (!ok && res?.message) fehler = res.message;
    } catch (e) {
      fehler = e instanceof Error ? e.message : String(e);
    }
    if (ok) {
      await db.insert(mahnung).values({
        rechnungId: r.id, stufe, gebuehr: String(gebuehr), waehrung: wg, offenerBetrag: String(betrag),
        mailversandId: m.id, createdBy: user.id, updatedBy: user.id,
      });
      await db.update(rechnung).set({ zahlungsstatus: "ANGEMAHNT" }).where(eq(rechnung.id, r.id));
    }
    ergebnis.push({
      nummer: r.nummer,
      ok,
      info: ok
        ? `${MAHN_STUFE_LABEL[stufe]} an ${an.join(", ")}${r.erechnungAssetId ? "" : " (ohne PDF – Altbestand)"}`
        : fehler,
    });
  }
  return ergebnis;
}

export async function updateMahnKonfig(input: { tage: number[]; gebuehr: number[] }) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [t1, t2, t3] = input.tage;
  if (!(t1 > 0 && t2 > t1 && t3 > t2)) {
    throw new DomainError("VALIDATION", "Die Tage müssen aufsteigend sein (1. < 2. Erinnerung < letzte Mahnung).");
  }
  if (input.gebuehr.some((g) => !(g >= 0))) throw new DomainError("VALIDATION", "Gebühren müssen ≥ 0 sein.");
  const s = await getFirmaSetting();
  await db.update(firmaSetting).set({
    mahnTage1: t1, mahnTage2: t2, mahnTage3: t3,
    mahnGebuehr1: String(input.gebuehr[0]), mahnGebuehr2: String(input.gebuehr[1]), mahnGebuehr3: String(input.gebuehr[2]),
    updatedAt: new Date(), updatedBy: user.id,
  }).where(eq(firmaSetting.id, s.id));
}

/** Letzte gesendete Mahnstufe einer Rechnung (0 = noch nicht gemahnt) + Datum. */
export async function letzteMahnung(rechnungId: string) {
  await requireUser();
  const [m] = await db.select({ stufe: mahnung.stufe, am: mahnung.createdAt }).from(mahnung)
    .where(eq(mahnung.rechnungId, rechnungId)).orderBy(desc(mahnung.stufe)).limit(1);
  return { stufe: m?.stufe ?? 0, am: m?.am ?? null };
}

/** Nach erfolgreichem Versand (Mailfenster der Rechnung): Mahnstufe mit Gebühr protokollieren. */
export async function mahnungProtokollieren(rechnungId: string, stufe: number, mailversandId: string) {
  const user = await requireUser();
  const cfg = await mahnKonfig();
  const [r] = await db.select({
    wg: rechnung.kdWaehrung,
    betrag: sql<string | null>`coalesce(${rechnung.rechnungsbetrag}, ${rechnung.summeBrutto})`,
  }).from(rechnung).where(eq(rechnung.id, rechnungId));
  await db.insert(mahnung).values({
    rechnungId, stufe, gebuehr: String(cfg.gebuehr[stufe - 1] ?? 0), waehrung: r?.wg === "USD" ? "USD" : "EUR",
    offenerBetrag: r?.betrag ?? null, mailversandId, createdBy: user.id, updatedBy: user.id,
  });
  await db.update(rechnung).set({ zahlungsstatus: "ANGEMAHNT" }).where(eq(rechnung.id, rechnungId));
}

/** Platzhalterwerte je Mahnstufe für das Mailfenster (Betrag, Gebühr, Gesamt). */
export async function mahnWerte(rechnungId: string) {
  await requireUser();
  const cfg = await mahnKonfig();
  const [r] = await db.select({
    wg: rechnung.kdWaehrung, datum: rechnung.rechnungsdatum,
    betrag: sql<string | null>`coalesce(${rechnung.rechnungsbetrag}, ${rechnung.summeBrutto}, round((select coalesce(sum(p.gesamtpreis) filter (where p.re_relevant), sum(p.gesamtpreis)) from beleg_position p where p.rechnung_id = "rechnung"."id") * case when ${rechnung.kdSteuerpflichtig} then 1 + coalesce(${rechnung.mwstSatz}, 19) / 100 else 1 end, 2))`,
  }).from(rechnung).where(eq(rechnung.id, rechnungId));
  const wg = r?.wg === "USD" ? "USD" : "EUR";
  const betrag = Number(r?.betrag ?? 0);
  const { stufe } = await letzteMahnung(rechnungId);
  const jeStufe: Record<number, Record<string, string>> = {};
  for (const s of [1, 2, 3]) {
    const g = cfg.gebuehr[s - 1];
    jeStufe[s] = {
      rechnungsdatum: formatDate(r?.datum ?? null),
      betrag: formatMoney(betrag, wg),
      mahngebuehr: formatMoney(g, wg),
      gesamtbetrag: formatMoney(betrag + g, wg),
    };
  }
  return { naechste: Math.min(stufe + 1, 3), jeStufe };
}
