import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { mailTemplate } from "@/lib/db/schema";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

/** Mail-Textbausteine (Einstellungen → Textbausteine). Text = Klartext mit {{Platzhaltern}}. */

export const TEXTBAUSTEIN_BELEGARTEN = ["RECHNUNG", "ANGEBOT", "AUFTRAGSBESTAETIGUNG"] as const;

export async function listMailVorlagen(belegart?: (typeof TEXTBAUSTEIN_BELEGARTEN)[number]) {
  await requireUser();
  return db
    .select({
      id: mailTemplate.id,
      belegart: mailTemplate.belegart,
      sprache: mailTemplate.sprache,
      name: mailTemplate.name,
      istStandard: mailTemplate.istStandard,
      betreff: mailTemplate.betreff,
      text: mailTemplate.bodyHtml,
      updatedAt: mailTemplate.updatedAt,
    })
    .from(mailTemplate)
    .where(belegart ? eq(mailTemplate.belegart, belegart) : undefined)
    .orderBy(asc(mailTemplate.belegart), asc(mailTemplate.sprache), asc(mailTemplate.name));
}

const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const textbausteinSchema = z.object({
  belegart: z.enum(TEXTBAUSTEIN_BELEGARTEN),
  sprache: z.enum(["DE", "EN"]),
  name: z.string().trim().min(1, "Name fehlt."),
  istStandard: boolFlag,
  betreff: z.string().trim().min(1, "Betreff fehlt."),
  text: z.string().trim().min(1, "Text fehlt."),
});
export type TextbausteinInput = z.infer<typeof textbausteinSchema>;

/** Anlegen/Ändern. Ist der Baustein Standard, verliert der bisherige Standard (gleiche Belegart + Sprache) das Flag. */
export async function saveTextbaustein(id: string | null, input: TextbausteinInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const values = {
    belegart: input.belegart,
    sprache: input.sprache,
    name: input.name,
    istStandard: input.istStandard,
    betreff: input.betreff,
    bodyHtml: input.text,
    updatedAt: new Date(),
    updatedBy: user.id,
  };
  await db.transaction(async (tx) => {
    let rowId = id;
    if (id) {
      const res = await tx.update(mailTemplate).set(values).where(eq(mailTemplate.id, id))
        .returning({ id: mailTemplate.id });
      if (res.length === 0) throw new DomainError("NOT_FOUND", "Textbaustein nicht gefunden.");
    } else {
      const [row] = await tx.insert(mailTemplate).values({ ...values, createdBy: user.id })
        .returning({ id: mailTemplate.id });
      rowId = row.id;
    }
    if (input.istStandard && rowId) {
      await tx.update(mailTemplate)
        .set({ istStandard: false })
        .where(and(
          eq(mailTemplate.belegart, input.belegart),
          eq(mailTemplate.sprache, input.sprache),
          ne(mailTemplate.id, rowId),
        ));
    }
  });
}

export async function deleteTextbaustein(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(mailTemplate).where(eq(mailTemplate.id, id));
}
