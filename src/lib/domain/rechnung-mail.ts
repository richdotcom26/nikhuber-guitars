import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { anhang, artikel, auftrag, kunde, mailversand, rechnung } from "@/lib/db/schema";
import { istEmail, splitEmails, textZuHtml } from "@/lib/mail-vorlage-shared";
import { anhangUrl } from "./anhang";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { sendeMailversand } from "./mailversand";
import { listMailVorlagen } from "./textbausteine";

/**
 * Kontext für das Mail-Fenster einer erstellten (festgeschriebenen) Rechnung:
 * Empfänger aus dem Kunden, Textbausteine, archiviertes PDF und Fotos von Auftrag/Rechnung.
 */
export async function rechnungMailKontext(id: string) {
  await requireUser();
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  if (r.status === "ENTWURF" || !r.erechnungAssetId || !r.nummer) {
    throw new DomainError("STATE", "Die Rechnung muss zuerst gebucht werden.");
  }

  const [k] = r.kundeId
    ? await db
      .select({
        email: kunde.email, emailRechnungCc: kunde.emailRechnungCc, briefanrede: kunde.briefanrede,
        firma: kunde.firma, vorname: kunde.vorname, nachname: kunde.nachname,
      })
      .from(kunde).where(eq(kunde.id, r.kundeId))
    : [];

  let auftragNummer: string | null = null;
  let modell: string | null = null;
  if (r.auftragId) {
    const [a] = await db
      .select({ nummer: auftrag.nummer, modell: artikel.nameBelege })
      .from(auftrag)
      .leftJoin(artikel, eq(artikel.id, auftrag.modellArtikelId))
      .where(eq(auftrag.id, r.auftragId));
    auftragNummer = a?.nummer ?? null;
    modell = a?.modell ?? null;
  }

  const [pdf] = await db
    .select({ id: anhang.id, dateiname: anhang.dateiname, groesse: anhang.groesse })
    .from(anhang).where(eq(anhang.id, r.erechnungAssetId));

  // Fotos: vom Auftrag (fertige Gitarre) und von der Rechnung selbst
  const traeger = [eq(anhang.rechnungId, id)];
  if (r.auftragId) traeger.push(eq(anhang.auftragId, r.auftragId));
  const bilder = await db
    .select({
      id: anhang.id, dateiname: anhang.dateiname, groesse: anhang.groesse, mitRechnung: anhang.mitRechnung,
    })
    .from(anhang)
    .where(and(or(...traeger), sql`${anhang.mime} like 'image/%'`))
    .orderBy(asc(anhang.createdAt));

  const sprache = (r.kdSprache ?? "DE") as "DE" | "EN";
  const kundeName = r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || null;

  return {
    rechnung: { id: r.id, nummer: r.nummer, belegart: r.belegart, auftragId: r.auftragId },
    titel: r.belegart === "RECHNUNG" ? "Rechnung" : r.belegart === "STORNORECHNUNG" ? "Stornorechnung" : "Rechnungskorrektur",
    sprache,
    an: k?.email ?? "",
    rechnungsEmpfaenger: k?.emailRechnungCc ?? null,
    werte: {
      briefanrede: k?.briefanrede?.trim() || (sprache === "EN" ? "Hello," : "Hallo,"),
      rechnungsnummer: r.nummer,
      auftragsnummer: auftragNummer,
      model: modell,
      kunde: kundeName,
    },
    vorlagen: await listMailVorlagen("RECHNUNG"),
    pdf: pdf ?? null,
    bilder: await Promise.all(
      bilder.map(async (b) => ({ ...b, previewUrl: await anhangUrl(b.id, false).catch(() => null) })),
    ),
  };
}

export const rechnungMailSchema = z.object({
  id: z.uuid(),
  an: z.string().trim().min(1, "Empfänger fehlt."),
  cc: z.string().trim().optional().default(""),
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
  bildIds: z.array(z.uuid()).default([]),
});
export type RechnungMailInput = z.infer<typeof rechnungMailSchema>;

/** Mail mit archiviertem Rechnungs-PDF (+ gewählten Fotos) protokollieren und per SMTP senden. */
export async function sendeRechnungMail(input: RechnungMailInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");

  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, input.id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  if (r.status === "ENTWURF" || !r.erechnungAssetId || !r.nummer) {
    throw new DomainError("STATE", "Die Rechnung muss zuerst gebucht werden.");
  }

  const an = splitEmails(input.an);
  const cc = splitEmails(input.cc);
  const falsch = [...an, ...cc].filter((e) => !istEmail(e));
  if (an.length === 0) throw new DomainError("VALIDATION", "Empfänger fehlt.", { an: ["Empfänger fehlt."] });
  if (falsch.length) {
    throw new DomainError("VALIDATION", `Ungültige E-Mail-Adresse: ${falsch.join(", ")}`);
  }

  // Nur Fotos zulassen, die wirklich zu dieser Rechnung bzw. ihrem Auftrag gehören
  let bildIds: string[] = [];
  if (input.bildIds.length) {
    const traeger = [eq(anhang.rechnungId, r.id)];
    if (r.auftragId) traeger.push(eq(anhang.auftragId, r.auftragId));
    const ok = await db
      .select({ id: anhang.id })
      .from(anhang)
      .where(and(inArray(anhang.id, input.bildIds), or(...traeger)));
    bildIds = ok.map((x) => x.id);
  }

  const [m] = await db
    .insert(mailversand)
    .values({
      art: r.belegart === "RECHNUNG" ? "RECHNUNG" : "GUTSCHRIFT",
      status: "ENTWURF",
      rechnungId: r.id,
      auftragId: r.auftragId,
      kundeId: r.kundeId,
      an: an.join(", "),
      cc: cc.length ? cc.join(", ") : null,
      betreff: input.betreff,
      bodyHtml: textZuHtml(input.text),
      anhangIds: [r.erechnungAssetId, ...bildIds],
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: mailversand.id });

  const res = await sendeMailversand(m.id);
  return { ...res, mailId: m.id };
}
