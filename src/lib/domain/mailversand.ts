import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { angebot, auftrag, kunde, mailversand, rechnung } from "@/lib/db/schema";
import { MAIL_ART_VALUES, MAIL_STATUS_VALUES } from "@/lib/mailversand-shared";
import { getTransport, mailKonfig, pruefeSmtp } from "@/lib/mail/transport";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export {
  MAIL_ART, MAIL_ART_LABEL, MAIL_STATUS, MAIL_STATUS_LABEL, MAIL_STATUS_TONE,
} from "@/lib/mailversand-shared";

/* -------------------------------------------------------------------- helpers */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const uuidOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());

const kdName = sql<string>`coalesce(${kunde.firma}, nullif(trim(concat_ws(' ', ${kunde.vorname}, ${kunde.nachname})), ''), ${kunde.kurzname})`;

/* --------------------------------------------------------------------- liste */

export async function listMailversand(
  params: { q?: string; art?: string; status?: string; page?: number } = {},
) {
  await requireUser();
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);

  const filters = [];
  if (params.art && (MAIL_ART_VALUES as readonly string[]).includes(params.art)) {
    filters.push(eq(mailversand.art, params.art as (typeof MAIL_ART_VALUES)[number]));
  }
  if (params.status && (MAIL_STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(mailversand.status, params.status as (typeof MAIL_STATUS_VALUES)[number]));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(ilike(mailversand.betreff, like), ilike(mailversand.an, like))!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: mailversand.id,
      art: mailversand.art,
      status: mailversand.status,
      an: mailversand.an,
      betreff: mailversand.betreff,
      createdAt: mailversand.createdAt,
      wiedervorlage: mailversand.wiedervorlage,
      kundeId: mailversand.kundeId,
      kundeName: kdName,
      angebotNummer: angebot.nummer,
      auftragNummer: auftrag.nummer,
      rechnungNummer: rechnung.nummer,
      angebotId: mailversand.angebotId,
      auftragId: mailversand.auftragId,
      rechnungId: mailversand.rechnungId,
    })
    .from(mailversand)
    .leftJoin(kunde, eq(kunde.id, mailversand.kundeId))
    .leftJoin(angebot, eq(angebot.id, mailversand.angebotId))
    .leftJoin(auftrag, eq(auftrag.id, mailversand.auftragId))
    .leftJoin(rechnung, eq(rechnung.id, mailversand.rechnungId))
    .where(where)
    .orderBy(desc(mailversand.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mailversand)
    .where(where);

  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

export async function getMailversand(id: string) {
  const [row] = await db
    .select({
      m: mailversand,
      kundeName: kdName,
      angebotNummer: angebot.nummer,
      auftragNummer: auftrag.nummer,
      rechnungNummer: rechnung.nummer,
    })
    .from(mailversand)
    .leftJoin(kunde, eq(kunde.id, mailversand.kundeId))
    .leftJoin(angebot, eq(angebot.id, mailversand.angebotId))
    .leftJoin(auftrag, eq(auftrag.id, mailversand.auftragId))
    .leftJoin(rechnung, eq(rechnung.id, mailversand.rechnungId))
    .where(eq(mailversand.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Mail-Eintrag nicht gefunden.");
  return row;
}

/** Kunden-Korrespondenz (für Adress-Detailseite; kompakt). */
export async function mailversandFuerKunde(kundeId: string, limit = 30) {
  await requireUser();
  return db
    .select({
      id: mailversand.id,
      art: mailversand.art,
      status: mailversand.status,
      betreff: mailversand.betreff,
      an: mailversand.an,
      createdAt: mailversand.createdAt,
    })
    .from(mailversand)
    .where(eq(mailversand.kundeId, kundeId))
    .orderBy(desc(mailversand.createdAt))
    .limit(limit);
}

/* ------------------------------------------------------------------- schema */

export const mailversandSchema = z.object({
  art: z.enum(MAIL_ART_VALUES),
  an: nullableText,
  cc: nullableText,
  betreff: nullableText,
  bodyHtml: nullableText,
  kundeId: uuidOrNull,
});
export type MailversandInput = z.infer<typeof mailversandSchema>;

/* ------------------------------------------------------------------ mutationen */

/** Manueller Eintrag (Telefonnotiz, extern versendete Mail …). */
export async function createMailversand(input: MailversandInput): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .insert(mailversand)
    .values({
      art: input.art,
      status: "ENTWURF",
      an: input.an,
      cc: input.cc,
      betreff: input.betreff,
      bodyHtml: input.bodyHtml,
      kundeId: input.kundeId,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: mailversand.id });
  return row.id;
}

export async function setMailStatus(id: string, status: string) {
  const user = await requireUser();
  if (!(MAIL_STATUS_VALUES as readonly string[]).includes(status)) {
    throw new DomainError("VALIDATION", "Ungültiger Status.");
  }
  const res = await db
    .update(mailversand)
    .set({
      status: status as (typeof MAIL_STATUS_VALUES)[number],
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(mailversand.id, id))
    .returning({ id: mailversand.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Mail-Eintrag nicht gefunden.");
}

export async function deleteMailversand(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(mailversand).where(eq(mailversand.id, id));
}

/* -------------------------------------------------------------------- Versand */

/** SMTP-Verbindung prüfen (für die Statusanzeige). */
export async function mailKonfigStatus() {
  await requireUser();
  const cfg = mailKonfig();
  const check = await pruefeSmtp();
  return { konfiguriert: !!cfg, from: cfg?.from ?? null, ...check };
}

/**
 * Einen Mailversand-Eintrag per SMTP verschicken.
 * Erfolg → status ERFOLG + gesendet_am; Fehler → status FEHLER + fehler_text (kein Werfen).
 */
export async function sendeMailversand(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");

  const [row] = await db.select().from(mailversand).where(eq(mailversand.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Mail-Eintrag nicht gefunden.");
  if (row.gesendetAm) throw new DomainError("CONFLICT", "Diese Mail wurde bereits versendet.");

  const an = row.an?.trim();
  if (!an || !an.includes("@")) {
    throw new DomainError("VALIDATION", "Keine gültige Empfänger-Adresse im Feld An hinterlegt.");
  }
  if (!row.betreff?.trim()) throw new DomainError("VALIDATION", "Betreff fehlt.");
  if (!mailKonfig()) throw new DomainError("STATE", "SMTP ist nicht konfiguriert.");

  const html = row.bodyHtml ?? "";
  const text = html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();

  try {
    const info = await getTransport().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: an,
      cc: row.cc?.trim() || undefined,
      bcc: row.bcc?.trim() || undefined,
      subject: row.betreff,
      html: html || undefined,
      text: text || row.betreff,
    });
    await db.update(mailversand)
      .set({
        status: "ERFOLG",
        gesendetAm: new Date(),
        fehlerText: null,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(mailversand.id, id));
    return { ok: true, message: `Gesendet an ${an} (${info.messageId}).` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.update(mailversand)
      .set({ status: "FEHLER", fehlerText: msg, updatedAt: new Date(), updatedBy: user.id })
      .where(eq(mailversand.id, id));
    return { ok: false, message: `Versand fehlgeschlagen: ${msg}` };
  }
}
