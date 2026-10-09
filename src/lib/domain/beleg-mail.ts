import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { angebot, anhang, artikel, auftrag, kunde, mailTemplate, mailversand } from "@/lib/db/schema";
import { istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";

/** Allgemeine Kunden-Mail aus Angebot oder Auftrag (Textbaustein + optional Dateien des Belegs). */
export type MailBeleg = "angebot" | "auftrag";

const HEAD = { angebot, auftrag } as const;
const ANHANG_COL = { angebot: anhang.angebotId, auftrag: anhang.auftragId } as const;
const VORLAGE_ART = { angebot: "ANGEBOT", auftrag: "AUFTRAG" } as const;

/** Kontext für das Mail-Fenster eines Angebots/Auftrags. */
export async function belegMailKontext(art: MailBeleg, id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[art];
  const [b] = await db.select().from(head).where(eq(head.id, id));
  if (!b) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");
  if (!b.kundeId) throw new DomainError("STATE", "Kein Kunde gewählt.");
  const [k] = await db.select().from(kunde).where(eq(kunde.id, b.kundeId));
  const [m] = b.modellArtikelId
    ? await db.select({ nameLang: artikel.nameLang, nameBelege: artikel.nameBelege }).from(artikel).where(eq(artikel.id, b.modellArtikelId))
    : [];
  const sprache: "DE" | "EN" = (b.kdSprache ?? k?.sprache) === "EN" ? "EN" : "DE";
  const [vorlagen, dateien] = await Promise.all([
    db.select({
      id: mailTemplate.id, sprache: mailTemplate.sprache, name: mailTemplate.name, istStandard: mailTemplate.istStandard,
      betreff: mailTemplate.betreff, text: mailTemplate.bodyHtml,
    }).from(mailTemplate).where(eq(mailTemplate.belegart, VORLAGE_ART[art])).orderBy(asc(mailTemplate.sprache), asc(mailTemplate.name)),
    db.select({ id: anhang.id, dateiname: anhang.dateiname, groesse: anhang.groesse, mime: anhang.mime })
      .from(anhang).where(eq(ANHANG_COL[art], id)).orderBy(asc(anhang.createdAt)),
  ]);
  const kundeName = k?.firma || [k?.vorname, k?.nachname].filter(Boolean).join(" ") || "";
  return {
    art,
    beleg: { id: b.id, nummer: b.nummer },
    sprache,
    an: k?.email ?? "",
    werte: {
      briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
      auftragsnummer: b.nummer,
      model: m?.nameLang?.trim() || m?.nameBelege || "",
      kunde: kundeName,
    },
    vorlagen,
    dateien,
  };
}
export type BelegMailKontext = Awaited<ReturnType<typeof belegMailKontext>>;

export const belegMailSchema = z.object({
  art: z.enum(["angebot", "auftrag"]),
  id: z.uuid(),
  an: z.string().trim().min(1, "Empfänger fehlt."),
  cc: z.string().trim().optional().default(""),
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
  anhangIds: z.array(z.uuid()).default([]),
});

/** Mail an den Kunden des Belegs senden (wird im Mailversand beim Kunden protokolliert). */
export async function sendeBelegMail(input: z.infer<typeof belegMailSchema>) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[input.art];
  const [b] = await db.select({ id: head.id, kundeId: head.kundeId }).from(head).where(eq(head.id, input.id));
  if (!b) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");
  const an = splitEmails(input.an);
  const cc = splitEmails(input.cc);
  const falsch = [...an, ...cc].filter((e) => !istEmail(e));
  if (!an.length || falsch.length) throw new DomainError("VALIDATION", `Ungültige E-Mail-Adresse: ${falsch.join(", ") || "–"}`);
  // nur Dateien dieses Belegs
  const ok = input.anhangIds.length
    ? await db.select({ id: anhang.id }).from(anhang).where(and(inArray(anhang.id, input.anhangIds), eq(ANHANG_COL[input.art], b.id)))
    : [];
  const [m] = await db.insert(mailversand).values({
    art: input.art === "angebot" ? "ANGEBOT" : "MAIL_AUSGANG",
    status: "ENTWURF",
    ...(input.art === "angebot" ? { angebotId: b.id } : { auftragId: b.id }),
    kundeId: b.kundeId,
    an: an.join(", "),
    cc: cc.length ? cc.join(", ") : null,
    betreff: input.betreff,
    bodyHtml: textZuHtml(input.text),
    anhangIds: ok.map((x) => x.id),
    createdBy: user.id,
    updatedBy: user.id,
  }).returning({ id: mailversand.id });
  return sendeMailversand(m.id);
}
