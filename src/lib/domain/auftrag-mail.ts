import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { anhang, artikel, auftrag, kunde, mailTemplate, mailversand } from "@/lib/db/schema";
import { istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";

/** Kontext für das Mail-Fenster eines Auftrags (allgemeine Kunden-Mail mit Textbaustein + optional Anhängen). */
export async function auftragMailKontext(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, id));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  if (!a.kundeId) throw new DomainError("STATE", "Kein Kunde gewählt.");
  const [k] = await db.select().from(kunde).where(eq(kunde.id, a.kundeId));
  const [m] = a.modellArtikelId
    ? await db.select({ nameLang: artikel.nameLang, nameBelege: artikel.nameBelege }).from(artikel).where(eq(artikel.id, a.modellArtikelId))
    : [];
  const sprache: "DE" | "EN" = (a.kdSprache ?? k?.sprache) === "EN" ? "EN" : "DE";
  const [vorlagen, dateien] = await Promise.all([
    db.select({
      id: mailTemplate.id, sprache: mailTemplate.sprache, name: mailTemplate.name, istStandard: mailTemplate.istStandard,
      betreff: mailTemplate.betreff, text: mailTemplate.bodyHtml,
    }).from(mailTemplate).where(eq(mailTemplate.belegart, "AUFTRAG")).orderBy(asc(mailTemplate.sprache), asc(mailTemplate.name)),
    db.select({ id: anhang.id, dateiname: anhang.dateiname, groesse: anhang.groesse, mime: anhang.mime })
      .from(anhang).where(eq(anhang.auftragId, id)).orderBy(asc(anhang.createdAt)),
  ]);
  const kundeName = k?.firma || [k?.vorname, k?.nachname].filter(Boolean).join(" ") || "";
  return {
    auftrag: { id: a.id, nummer: a.nummer },
    sprache,
    an: k?.email ?? "",
    werte: {
      briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
      auftragsnummer: a.nummer,
      model: m?.nameLang?.trim() || m?.nameBelege || "",
      kunde: kundeName,
    },
    vorlagen,
    dateien,
  };
}

export const auftragMailSchema = z.object({
  id: z.uuid(),
  an: z.string().trim().min(1, "Empfänger fehlt."),
  cc: z.string().trim().optional().default(""),
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
  anhangIds: z.array(z.uuid()).default([]),
});

/** Mail an den Kunden des Auftrags senden (wird im Mailversand beim Kunden protokolliert). */
export async function sendeAuftragMail(input: z.infer<typeof auftragMailSchema>) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select({ id: auftrag.id, kundeId: auftrag.kundeId }).from(auftrag).where(eq(auftrag.id, input.id));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");
  const an = splitEmails(input.an);
  const cc = splitEmails(input.cc);
  const falsch = [...an, ...cc].filter((e) => !istEmail(e));
  if (!an.length || falsch.length) throw new DomainError("VALIDATION", `Ungültige E-Mail-Adresse: ${falsch.join(", ") || "–"}`);
  // nur Anhänge dieses Auftrags
  const ok = input.anhangIds.length
    ? await db.select({ id: anhang.id }).from(anhang).where(and(inArray(anhang.id, input.anhangIds), eq(anhang.auftragId, a.id)))
    : [];
  const [m] = await db.insert(mailversand).values({
    art: "MAIL_AUSGANG",
    status: "ENTWURF",
    auftragId: a.id,
    kundeId: a.kundeId,
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
