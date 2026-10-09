import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  appUser, artikel, auftrag, kunde, mailTemplate, mailversand, seriennummer, verleih,
} from "@/lib/db/schema";
import { artikelName } from "@/lib/artikel-shared";
import { fuelleVorlage, istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { getTransport, mailKonfig } from "@/lib/mail/transport";
import { renderVerleihPdf, type VerleihPdfData } from "@/lib/pdf/verleih-pdf";
import { dezimal, formatDate, formatDateTime, heuteBerlin } from "@/lib/utils";
import { verleihStatus, type VerleihSprache } from "@/lib/verleih-shared";
import { ladeAnhangDatei, speichereAnhang } from "./anhang";
import { kdSnapshot } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";
import { getFirmaSetting } from "./stammdaten";

/** Gitarren, die verliehen werden: Aufträge mit Besonderes = „Verleih-/Testgitarre". */
export const VERLEIH_BESONDERES = "Verleih-/Testgitarre";

const kundeName = (k: { firma: string | null; vorname: string | null; nachname: string | null; kurzname?: string | null }) =>
  k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";

/* ------------------------------------------------------------------ lesen */

export async function listVerleih(params: { mitZurueck?: boolean; auftragId?: string } = {}) {
  await requireUser();
  const filters = [];
  if (!params.mitZurueck) filters.push(isNull(verleih.zurueckAm));
  if (params.auftragId) filters.push(eq(verleih.auftragId, params.auftragId));
  const rows = await db
    .select({
      id: verleih.id,
      auftragId: verleih.auftragId,
      auftragNummer: auftrag.nummer,
      modell: sql<string | null>`coalesce(${artikel.nameLang}, ${artikel.nameBelege}, ${artikel.nameKurz})`,
      seriennummer: seriennummer.anzeige,
      kundeId: verleih.kundeId,
      firma: kunde.firma, vorname: kunde.vorname, nachname: kunde.nachname, kurzname: kunde.kurzname,
      email: kunde.email,
      versendetAm: verleih.versendetAm,
      verfuegbarBis: verleih.verfuegbarBis,
      zurueckAm: verleih.zurueckAm,
      zweck: verleih.zweck,
      unterschriftAngefordertAm: verleih.unterschriftAngefordertAm,
      unterschriebenAm: verleih.unterschriebenAm,
      letzteErinnerungAm: verleih.letzteErinnerungAm,
      erinnerungen: verleih.erinnerungen,
    })
    .from(verleih)
    .innerJoin(auftrag, eq(auftrag.id, verleih.auftragId))
    .innerJoin(kunde, eq(kunde.id, verleih.kundeId))
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(sql`${verleih.zurueckAm} nulls first`, desc(verleih.versendetAm), desc(verleih.createdAt));
  const heute = heuteBerlin();
  return rows.map((r) => ({ ...r, kundeName: kundeName(r), status: verleihStatus(r, heute) }));
}
export type VerleihRow = Awaited<ReturnType<typeof listVerleih>>[number];

/** Alle Verleih-Gitarren mit aktuellem Stand (frei / verliehen an …). */
export async function verleihGitarren() {
  await requireUser();
  const gitarren = await db
    .select({
      id: auftrag.id,
      nummer: auftrag.nummer,
      modell: sql<string | null>`coalesce(${artikel.nameLang}, ${artikel.nameBelege}, ${artikel.nameKurz})`,
      seriennummer: seriennummer.anzeige,
      umsatzerwartung: auftrag.umsatzerwartung,
    })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(eq(auftrag.besonderes, VERLEIH_BESONDERES))
    .orderBy(asc(auftrag.nummer));
  const offen = await listVerleih();
  return gitarren.map((g) => ({ ...g, offen: offen.find((v) => v.auftragId === g.id) ?? null }));
}

export async function getVerleih(id: string) {
  await requireUser();
  const [v] = await db.select().from(verleih).where(eq(verleih.id, id));
  if (!v) throw new DomainError("NOT_FOUND", "Verleih nicht gefunden.");
  const [a] = await db
    .select({
      nummer: auftrag.nummer,
      modell: sql<string | null>`coalesce(${artikel.nameLang}, ${artikel.nameBelege}, ${artikel.nameKurz})`,
      seriennummer: seriennummer.anzeige,
    })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(eq(auftrag.id, v.auftragId));
  const [k] = await db.select().from(kunde).where(eq(kunde.id, v.kundeId));
  return { verleih: v, gitarre: a, kunde: k, kundeName: k ? kundeName(k) : "–", status: verleihStatus(v, heuteBerlin()) };
}

/* ---------------------------------------------------------------- schreiben */

const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig").nullable(),
);
const textOrNull = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);

export const verleihSchema = z.object({
  auftragId: z.uuid("Gitarre wählen."),
  kundeId: z.uuid("Kontakt wählen."),
  versendetAm: dateOrNull,
  verfuegbarBis: dateOrNull,
  zurueckAm: dateOrNull,
  zweck: textOrNull,
  zubehoer: textOrNull,
  wert: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : dezimal(String(v))),
    z.coerce.number().min(0).transform((n) => n.toFixed(2)).nullable(),
  ),
  bemerkung: textOrNull,
});
export type VerleihInput = z.infer<typeof verleihSchema>;

async function schreibRecht() {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  return user;
}

export async function createVerleih(input: VerleihInput): Promise<string> {
  const user = await schreibRecht();
  // Eine Gitarre kann nicht zweimal gleichzeitig unterwegs sein
  const [offen] = await db.select({ id: verleih.id }).from(verleih)
    .where(and(eq(verleih.auftragId, input.auftragId), isNull(verleih.zurueckAm)));
  if (offen) throw new DomainError("CONFLICT", "Diese Gitarre ist noch verliehen — bitte zuerst die Rückgabe eintragen.");
  const [row] = await db.insert(verleih)
    .values({ ...input, createdBy: user.id, updatedBy: user.id })
    .returning({ id: verleih.id });
  return row.id;
}

export async function updateVerleih(id: string, input: VerleihInput) {
  const user = await schreibRecht();
  const res = await db.update(verleih)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(verleih.id, id))
    .returning({ id: verleih.id });
  if (!res.length) throw new DomainError("NOT_FOUND", "Verleih nicht gefunden.");
}

export async function setZurueck(id: string, datum: string | null) {
  const user = await schreibRecht();
  await db.update(verleih)
    .set({ zurueckAm: datum ?? heuteBerlin(), updatedAt: new Date(), updatedBy: user.id })
    .where(eq(verleih.id, id));
}

export async function deleteVerleih(id: string) {
  await schreibRecht();
  await db.delete(verleih).where(eq(verleih.id, id));
}

/* ------------------------------------------------------- Übergabevereinbarung */

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || "https://nikhuber-guitars.vercel.app").replace(/\/$/, "");
const geld = (v: string | null, sprache: VerleihSprache) =>
  v == null ? "" : Number(v).toLocaleString(sprache === "EN" ? "en-US" : "de-DE", { style: "currency", currency: "EUR" });
const datumSprache = (iso: string | null, sprache: VerleihSprache) => {
  if (!iso) return "";
  if (sprache === "DE") return formatDate(iso);
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

async function pdfDaten(id: string, unterschrift?: VerleihPdfData["unterschrift"]): Promise<{ data: VerleihPdfData; v: typeof verleih.$inferSelect; dateiBasis: string }> {
  const [v] = await db.select().from(verleih).where(eq(verleih.id, id));
  if (!v) throw new DomainError("NOT_FOUND", "Verleih nicht gefunden.");
  const [g] = await db
    .select({ nummer: auftrag.nummer, nameBelege: artikel.nameBelege, nameLang: artikel.nameLang, nameKurz: artikel.nameKurz, sn: seriennummer.anzeige })
    .from(auftrag)
    .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
    .leftJoin(seriennummer, eq(seriennummer.id, auftrag.seriennummerId))
    .where(eq(auftrag.id, v.auftragId));
  const [k] = await db.select().from(kunde).where(eq(kunde.id, v.kundeId));
  const fs = await getFirmaSetting();
  const sprache: VerleihSprache = k?.sprache === "EN" ? "EN" : "DE";
  const leihnehmer = k ? (await kdSnapshot(k.id)).kdBriefkopf : "";
  const sn = g?.sn ?? "";
  return {
    v,
    dateiBasis: `Uebergabevereinbarung ${sn || g?.nummer || ""} ${k ? kundeName(k) : ""}`.trim(),
    data: {
      sprache,
      firma: fs.firma,
      firmaZeilen: [fs.strasse, [fs.plz, fs.ort].filter(Boolean).join(" "), fs.land].filter((x): x is string => !!x && !!x.trim()),
      leihnehmer,
      modell: g ? (g.nameLang?.trim() || artikelName(g)) : "",
      seriennummer: sn,
      zubehoer: v.zubehoer ?? "",
      wert: geld(v.wert, sprache),
      zweck: v.zweck ?? "",
      vom: datumSprache(v.versendetAm, sprache),
      bis: datumSprache(v.verfuegbarBis, sprache),
      ortDatum: [fs.ort, datumSprache(heuteBerlin(), sprache)].filter(Boolean).join(", "),
      unterschrift: unterschrift ?? null,
    },
  };
}

/** Übergabevereinbarung (ohne Unterschrift) erzeugen und als Anhang an der Gitarre (Auftrag) ablegen. */
export async function erzeugeVereinbarung(id: string): Promise<string> {
  const user = await schreibRecht();
  const { data, v, dateiBasis } = await pdfDaten(id);
  if (!v.verfuegbarBis) throw new DomainError("VALIDATION", "Bitte zuerst „Zur Verfügung bis“ eintragen.");
  if (!data.modell) throw new DomainError("STATE", "Für die Gitarre ist kein Modell hinterlegt – bitte im Auftrag (Details) die Modellvorlage setzen.");
  if (!data.seriennummer) {
    throw new DomainError("STATE", "Für die Gitarre ist keine Seriennummer vergeben – bitte im Auftrag unter „Seriennummer“ vergeben.");
  }
  const pdf = await renderVerleihPdf(data);
  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: v.auftragId, dateiname: `${heuteBerlin()} ${dateiBasis}.pdf`,
    bytes: pdf, mime: "application/pdf", art: "VERLEIH", userId: user.id,
  });
  await db.update(verleih).set({ vereinbarungAnhangId: anhangId, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(verleih.id, id));
  return anhangId;
}

/* ------------------------------------------------------------------ Mails */

export type VerleihMailArt = "VEREINBARUNG" | "ERINNERUNG";

const STANDARD_TEXT: Record<VerleihMailArt, Record<VerleihSprache, { betreff: string; text: string }>> = {
  VEREINBARUNG: {
    DE: {
      betreff: "Übergabevereinbarung {{model}} #{{seriennummer}}",
      text: "{{briefanrede}}\n\nanbei die Übergabevereinbarung für die Testgitarre {{model}} (Seriennummer {{seriennummer}}). Die Gitarre steht dir bis zum {{rueckgabe_bis}} zur Verfügung.\n\nBitte unterschreibe die Vereinbarung elektronisch über diesen Link:\n{{link}}\n\nViele Grüße\nNik Huber Guitars",
    },
    EN: {
      betreff: "Loan agreement {{model}} #{{seriennummer}}",
      text: "{{briefanrede}}\n\nplease find attached the loan agreement for the test guitar {{model}} (serial number {{seriennummer}}). The guitar is available to you until {{rueckgabe_bis}}.\n\nPlease sign the agreement electronically using this link:\n{{link}}\n\nBest regards\nNik Huber Guitars",
    },
  },
  ERINNERUNG: {
    DE: {
      betreff: "Erinnerung: Rückgabe {{model}} #{{seriennummer}}",
      text: "{{briefanrede}}\n\nkurze Erinnerung: Die Testgitarre {{model}} (Seriennummer {{seriennummer}}) sollte bis zum {{rueckgabe_bis}} wieder bei uns sein. Bei uns ist sie noch nicht angekommen.\n\nBitte gib uns kurz Bescheid, wann du sie zurückschickst.\n\nViele Grüße\nNik Huber Guitars",
    },
    EN: {
      betreff: "Reminder: return of {{model}} #{{seriennummer}}",
      text: "{{briefanrede}}\n\njust a quick reminder: the test guitar {{model}} (serial number {{seriennummer}}) was due back by {{rueckgabe_bis}}, and we have not received it yet.\n\nPlease let us know when you will send it back.\n\nBest regards\nNik Huber Guitars",
    },
  },
};

/** Vorschlag für das Mail-Fenster: Empfänger, Betreff, Text (Textbaustein „Standard" bzw. eingebauter Text). */
export async function verleihMailVorschlag(id: string, art: VerleihMailArt) {
  await schreibRecht();
  const { verleih: v, gitarre, kunde: k } = await getVerleih(id);
  const sprache: VerleihSprache = k?.sprache === "EN" ? "EN" : "DE";
  const [tpl] = await db.select().from(mailTemplate)
    .where(and(
      eq(mailTemplate.belegart, art === "VEREINBARUNG" ? "VERLEIH_VEREINBARUNG" : "VERLEIH_ERINNERUNG"),
      eq(mailTemplate.sprache, sprache),
    ))
    .orderBy(desc(mailTemplate.istStandard))
    .limit(1);
  const basis = tpl ? { betreff: tpl.betreff ?? "", text: tpl.bodyHtml ?? "" } : STANDARD_TEXT[art][sprache];
  const werte = {
    briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
    model: gitarre?.modell ?? "",
    seriennummer: gitarre?.seriennummer ?? "",
    versendet_am: datumSprache(v.versendetAm, sprache),
    rueckgabe_bis: datumSprache(v.verfuegbarBis, sprache),
    link: "{{link}}", // wird erst beim Senden mit dem Unterschrifts-Link gefüllt
  };
  const fill = (s: string) => fuelleVorlage(s, werte as never);
  return { an: k?.email ?? "", betreff: fill(basis.betreff), text: fill(basis.text) };
}

export const verleihMailSchema = z.object({
  id: z.uuid(),
  art: z.enum(["VEREINBARUNG", "ERINNERUNG"]),
  an: z.string().trim().min(1, "Empfänger fehlt."),
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
});

/**
 * Mail senden (über Mailversand, damit sie beim Kontakt protokolliert ist):
 * - VEREINBARUNG: erzeugt die Vereinbarung neu, legt einen geheimen Unterschrifts-Link an und hängt das PDF an,
 * - ERINNERUNG: Rückgabe-Erinnerung, zählt die Erinnerungen hoch.
 */
export async function sendeVerleihMail(input: z.infer<typeof verleihMailSchema>) {
  const user = await schreibRecht();
  const an = splitEmails(input.an);
  const falsch = an.filter((e) => !istEmail(e));
  if (!an.length || falsch.length) throw new DomainError("VALIDATION", `Ungültige E-Mail-Adresse: ${falsch.join(", ") || "–"}`);
  const [v] = await db.select().from(verleih).where(eq(verleih.id, input.id));
  if (!v) throw new DomainError("NOT_FOUND", "Verleih nicht gefunden.");

  let text = input.text;
  const anhangIds: string[] = [];
  if (input.art === "VEREINBARUNG") {
    if (v.unterschriebenAm) throw new DomainError("STATE", "Die Vereinbarung ist bereits unterschrieben.");
    const token = v.unterschriftToken ?? randomBytes(24).toString("base64url");
    const link = `${APP_URL()}/unterschrift/${token}`;
    text = text.includes("{{link}}") ? text.replaceAll("{{link}}", link) : `${text}\n\n${link}`;
    anhangIds.push(await erzeugeVereinbarung(input.id));
    await db.update(verleih)
      .set({ unterschriftToken: token, unterschriftAngefordertAm: new Date(), updatedAt: new Date(), updatedBy: user.id })
      .where(eq(verleih.id, input.id));
  }

  const [m] = await db.insert(mailversand).values({
    art: "SONSTIGES",
    status: "ENTWURF",
    auftragId: v.auftragId,
    kundeId: v.kundeId,
    an: an.join(", "),
    betreff: input.betreff,
    bodyHtml: textZuHtml(text),
    anhangIds,
    createdBy: user.id,
    updatedBy: user.id,
  }).returning({ id: mailversand.id });
  const res = await sendeMailversand(m.id);

  if (res.ok && input.art === "ERINNERUNG") {
    await db.update(verleih)
      .set({ letzteErinnerungAm: new Date(), erinnerungen: sql`${verleih.erinnerungen} + 1`, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(verleih.id, input.id));
  }
  return res;
}

/* ------------------------------------------- Elektronische Unterschrift (öffentlich) */

/** Für die öffentliche Unterschrifts-Seite — ohne Anmeldung, nur über den geheimen Token. */
export async function unterschriftKontext(token: string) {
  if (!token || token.length < 20) return null;
  const [v] = await db.select({ id: verleih.id, unterschriebenAm: verleih.unterschriebenAm, unterschriebenName: verleih.unterschriebenName })
    .from(verleih).where(eq(verleih.unterschriftToken, token));
  if (!v) return null;
  const { data } = await pdfDaten(v.id);
  return { verleihId: v.id, unterschriebenAm: v.unterschriebenAm, unterschriebenName: v.unterschriebenName, daten: data };
}

/** Vereinbarung unterschreiben: unterschriebenes PDF erzeugen, ablegen, Büro benachrichtigen. */
export async function unterschreiben(token: string, name: string, pngDataUrl: string, ip: string) {
  const ctx = await unterschriftKontext(token);
  if (!ctx) throw new DomainError("NOT_FOUND", "Link ungültig.");
  if (ctx.unterschriebenAm) throw new DomainError("STATE", "Bereits unterschrieben.");
  const n = name.trim();
  if (n.length < 3) throw new DomainError("VALIDATION", "Bitte den vollständigen Namen eingeben.");
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(pngDataUrl);
  if (!m) throw new DomainError("VALIDATION", "Bitte unterschreiben.");
  const png = Buffer.from(m[1], "base64");
  if (png.length < 500 || png.length > 600_000) throw new DomainError("VALIDATION", "Unterschrift ungültig.");

  const jetzt = new Date();
  const [v] = await db.select().from(verleih).where(eq(verleih.id, ctx.verleihId));
  const { data, dateiBasis } = await pdfDaten(ctx.verleihId, {
    png, name: n, ip,
    zeit: ctx.daten.sprache === "EN"
      ? `${jetzt.toLocaleString("en-US", { timeZone: "Europe/Berlin" })} (CET)`
      : `${formatDateTime(jetzt)} Uhr`,
  });
  const pdf = await renderVerleihPdf(data);
  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: v.auftragId, dateiname: `${heuteBerlin()} ${dateiBasis} unterschrieben.pdf`,
    bytes: pdf, mime: "application/pdf", art: "VERLEIH", userId: (v.createdBy ?? null) as unknown as string,
  });
  await db.update(verleih).set({
    unterschriebenAm: jetzt, unterschriebenName: n, unterschriftIp: ip || null,
    unterschriebenAnhangId: anhangId, updatedAt: jetzt,
  }).where(eq(verleih.id, v.id));

  // Büro informieren (best effort, mit PDF)
  const cfg = mailKonfig();
  const [u] = v.createdBy ? await db.select({ email: appUser.email }).from(appUser).where(eq(appUser.id, v.createdBy)) : [];
  if (cfg && u?.email) {
    try {
      const f = await ladeAnhangDatei(anhangId);
      await getTransport().sendMail({
        from: cfg.from, to: u.email,
        subject: `Übergabevereinbarung unterschrieben: ${data.modell} #${data.seriennummer} – ${n}`,
        text: `${n} hat die Übergabevereinbarung für ${data.modell} (#${data.seriennummer}) elektronisch unterschrieben.\n\nVerleih: ${APP_URL()}/verleih/${v.id}\n`,
        attachments: [{ filename: f.dateiname, content: f.bytes, contentType: f.mime }],
      });
    } catch (e) {
      console.error("[verleih] Benachrichtigung fehlgeschlagen:", e instanceof Error ? e.message : e);
    }
  }
}
