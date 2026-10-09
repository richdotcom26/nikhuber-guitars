import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUser, artikel, auftrag, auftragEreignis, kunde, mailTemplate, mailversand } from "@/lib/db/schema";
import { fuelleVorlage, istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { getTransport, mailKonfig } from "@/lib/mail/transport";
import { renderBelegPdf } from "@/lib/pdf/render";
import { formatDateTime, heuteBerlin } from "@/lib/utils";
import { ladeAnhangDatei, speichereAnhang } from "./anhang";
import { logAuftrag } from "./auftrag-verlauf";
import { ladeBelegData } from "./beleg-render";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";

/**
 * Auftragsbestätigung (AB) mit einfacher elektronischer Unterschrift:
 * Versand mit PDF + persönlichem Link → Kunde unterschreibt auf /unterschrift/<token>
 * → unterschriebene AB wird am Auftrag abgelegt, Status „Eingang" → „Bestätigt".
 */

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || "https://nikhuber-guitars.vercel.app").replace(/\/$/, "");

const STANDARD: Record<"DE" | "EN", { betreff: string; text: string }> = {
  DE: {
    betreff: "Auftragsbestätigung {{auftragsnummer}} – {{model}}",
    text: "{{briefanrede}}\n\nvielen Dank für deinen Auftrag! Anbei die Auftragsbestätigung {{auftragsnummer}} für deine {{model}}.\n\nBitte prüfe alle Angaben und bestätige den Auftrag mit deiner elektronischen Unterschrift über diesen Link:\n{{link}}\n\nErst nach deiner Bestätigung ist der Auftrag verbindlich angenommen.\n\nViele Grüße\nNik Huber Guitars",
  },
  EN: {
    betreff: "Order confirmation {{auftragsnummer}} – {{model}}",
    text: "{{briefanrede}}\n\nthank you for your order! Please find attached the order confirmation {{auftragsnummer}} for your {{model}}.\n\nPlease check all details and confirm the order with your electronic signature using this link:\n{{link}}\n\nThe order is only accepted once you have confirmed it.\n\nBest regards\nNik Huber Guitars",
  },
};

async function ladeAuftrag(id: string) {
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, id));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  return a;
}

/** Vorschlag für das Mail-Fenster (Textbaustein „Auftragsbestätigung" Standard bzw. eingebauter Text). */
export async function abMailVorschlag(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const a = await ladeAuftrag(id);
  if (!a.kundeId) throw new DomainError("STATE", "Bitte zuerst einen Kunden wählen.");
  const [k] = await db.select().from(kunde).where(eq(kunde.id, a.kundeId));
  const [m] = a.modellArtikelId
    ? await db.select({ nameLang: artikel.nameLang, nameBelege: artikel.nameBelege }).from(artikel).where(eq(artikel.id, a.modellArtikelId))
    : [];
  const sprache: "DE" | "EN" = (a.kdSprache ?? k?.sprache) === "EN" ? "EN" : "DE";
  const [tpl] = await db.select().from(mailTemplate)
    .where(and(eq(mailTemplate.belegart, "AUFTRAGSBESTAETIGUNG"), eq(mailTemplate.sprache, sprache)))
    .orderBy(desc(mailTemplate.istStandard)).limit(1);
  const basis = tpl ? { betreff: tpl.betreff ?? "", text: tpl.bodyHtml ?? "" } : STANDARD[sprache];
  const werte = {
    briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
    auftragsnummer: a.nummer,
    model: m?.nameLang?.trim() || m?.nameBelege || (sprache === "EN" ? "guitar" : "Gitarre"),
    kunde: k?.firma || [k?.vorname, k?.nachname].filter(Boolean).join(" "),
    link: "{{link}}",
  };
  const fill = (s: string) => fuelleVorlage(s, werte as never);
  let text = fill(basis.text);
  if (!text.includes("{{link}}")) text += `\n\n${sprache === "EN" ? "Sign here" : "Hier unterschreiben"}: {{link}}`;
  return { an: k?.email ?? "", cc: k?.emailRechnungCc ?? "", betreff: fill(basis.betreff), text };
}

export const abMailSchema = z.object({
  id: z.uuid(),
  an: z.string().trim().min(1, "Empfänger fehlt."),
  cc: z.string().trim().optional().default(""),
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
});

/** AB-PDF (mit leerem Annahme-Feld) erzeugen, Link anlegen und per Mail (Mailversand) senden. */
export async function sendeAbZurUnterschrift(input: z.infer<typeof abMailSchema>) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const a = await ladeAuftrag(input.id);
  if (!a.kundeId) throw new DomainError("STATE", "Bitte zuerst einen Kunden wählen.");
  if (a.abUnterschriebenAm) throw new DomainError("STATE", "Die Auftragsbestätigung ist bereits unterschrieben.");
  const an = splitEmails(input.an);
  const cc = splitEmails(input.cc);
  const falsch = [...an, ...cc].filter((e) => !istEmail(e));
  if (!an.length || falsch.length) throw new DomainError("VALIDATION", `Ungültige E-Mail-Adresse: ${falsch.join(", ") || "–"}`);

  const data = await ladeBelegData("auftrag", a.id);
  if (!data.positionen.length) throw new DomainError("STATE", "Der Auftrag hat noch keine Positionen.");
  const pdf = await renderBelegPdf({ ...data, annahme: { leer: true } });
  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: a.id, dateiname: `${heuteBerlin()} Auftragsbestaetigung ${a.nummer}.pdf`,
    bytes: pdf, mime: "application/pdf", art: "BELEG_PDF", userId: user.id,
  });
  const token = a.abToken ?? randomBytes(24).toString("base64url");
  const link = `${APP_URL()}/unterschrift/${token}`;
  await db.update(auftrag)
    .set({ abToken: token, abAngefordertAm: new Date(), abAnhangId: anhangId, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(auftrag.id, a.id));

  const [m] = await db.insert(mailversand).values({
    art: "AUFTRAGSBESTAETIGUNG",
    status: "ENTWURF",
    auftragId: a.id,
    kundeId: a.kundeId,
    an: an.join(", "),
    cc: cc.length ? cc.join(", ") : null,
    betreff: input.betreff,
    bodyHtml: textZuHtml(input.text.replaceAll("{{link}}", link)),
    anhangIds: [anhangId],
    createdBy: user.id,
    updatedBy: user.id,
  }).returning({ id: mailversand.id });
  const res = await sendeMailversand(m.id);
  if (res.ok) await logAuftrag(a.id, "AB_GESENDET", { text: an.join(", ") }, user.id);
  return res;
}

/* ------------------------------------------- öffentlich (ohne Anmeldung, nur Token) */

export async function abKontext(token: string) {
  if (!token || token.length < 20) return null;
  const [a] = await db.select({
    id: auftrag.id, nummer: auftrag.nummer, abUnterschriebenAm: auftrag.abUnterschriebenAm,
    abUnterschriebenName: auftrag.abUnterschriebenName, status: auftrag.status,
  }).from(auftrag).where(eq(auftrag.abToken, token));
  if (!a) return null;
  const daten = await ladeBelegData("auftrag", a.id);
  return { ...a, daten };
}

/** AB unterschreiben: unterschriebenes PDF ablegen, Auftrag bestätigen, Büro benachrichtigen. */
export async function abUnterschreiben(token: string, name: string, pngDataUrl: string, ip: string) {
  const ctx = await abKontext(token);
  if (!ctx) throw new DomainError("NOT_FOUND", "Link ungültig.");
  if (ctx.abUnterschriebenAm) throw new DomainError("STATE", "Bereits unterschrieben.");
  const n = name.trim();
  if (n.length < 3) throw new DomainError("VALIDATION", "Bitte den vollständigen Namen eingeben.");
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(pngDataUrl);
  if (!m) throw new DomainError("VALIDATION", "Bitte unterschreiben.");
  const png = Buffer.from(m[1], "base64");
  if (png.length < 500 || png.length > 600_000) throw new DomainError("VALIDATION", "Unterschrift ungültig.");

  const jetzt = new Date();
  const zeit = ctx.daten.sprache === "EN"
    ? `${jetzt.toLocaleString("en-US", { timeZone: "Europe/Berlin" })} (CET)`
    : `${formatDateTime(jetzt)} Uhr`;
  const pdf = await renderBelegPdf({ ...ctx.daten, annahme: { png, name: n, zeit, ip } });

  // Absender der AB (letztes AB_GESENDET) — für Ablage und Benachrichtigung
  const [gesendet] = await db.select({ userId: auftragEreignis.userId }).from(auftragEreignis)
    .where(and(eq(auftragEreignis.auftragId, ctx.id), eq(auftragEreignis.art, "AB_GESENDET")))
    .orderBy(desc(auftragEreignis.zeit)).limit(1);
  const absender = gesendet?.userId ?? null;

  const anhangId = await speichereAnhang({
    traeger: "auftrag", traegerId: ctx.id,
    dateiname: `${heuteBerlin()} Auftragsbestaetigung ${ctx.nummer} unterschrieben.pdf`,
    bytes: pdf, mime: "application/pdf", art: "BELEG_PDF", userId: absender as unknown as string,
  });
  const bestaetigen = ctx.status === "BACKORDER";
  await db.update(auftrag).set({
    abUnterschriebenAm: jetzt, abUnterschriebenName: n, abUnterschriftIp: ip || null,
    abUnterschriebenAnhangId: anhangId, ...(bestaetigen ? { status: "BESTAETIGT" as const } : {}), updatedAt: jetzt,
  }).where(eq(auftrag.id, ctx.id));
  await logAuftrag(ctx.id, "AB_UNTERSCHRIEBEN", { text: n }, null);
  if (bestaetigen) await logAuftrag(ctx.id, "STATUS", { von: "BACKORDER", nach: "BESTAETIGT", text: "AB unterschrieben" }, null);

  const cfg = mailKonfig();
  const [u] = absender ? await db.select({ email: appUser.email }).from(appUser).where(eq(appUser.id, absender)) : [];
  if (cfg && u?.email) {
    try {
      const f = await ladeAnhangDatei(anhangId);
      await getTransport().sendMail({
        from: cfg.from, to: u.email,
        subject: `Auftrag bestätigt: ${ctx.nummer} – ${n}`,
        text: `${n} hat die Auftragsbestätigung ${ctx.nummer} elektronisch unterschrieben.${bestaetigen ? " Der Auftrag steht jetzt auf „Bestätigt“." : ""}\n\nAuftrag: ${APP_URL()}/auftraege/${ctx.id}\n`,
        attachments: [{ filename: f.dateiname, content: f.bytes, contentType: f.mime }],
      });
    } catch (e) {
      console.error("[ab] Benachrichtigung fehlgeschlagen:", e instanceof Error ? e.message : e);
    }
  }
}
