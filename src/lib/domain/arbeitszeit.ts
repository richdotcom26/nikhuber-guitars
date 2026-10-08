import "server-only";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { arbeitstag } from "@/lib/db/schema";
import { dezimal } from "@/lib/utils";
import { assertRolle, requireUser } from "./context";

/** Arbeitszeit-Protokoll der App-Entwicklung (nur Admin). Befüllt von scripts/arbeitszeit-sync.mjs. */
export async function listArbeitstage() {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  return db.select().from(arbeitstag).orderBy(desc(arbeitstag.tag));
}

const stundenZuMinuten = z.preprocess((v) => {
  if (v == null || (typeof v === "string" && v.trim() === "")) return 0;
  const s = String(v).trim();
  const hm = s.match(/^(\d+):(\d{1,2})$/);            // „1:30" = 1 h 30 min
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  return Math.round(Number(dezimal(s)) * 60);          // „1,5" = 1 h 30 min
}, z.number().int().min(0, "Keine negativen Zeiten.").max(24 * 60, "Mehr als 24 Stunden?"));

export const arbeitstagSchema = z.object({
  tag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt."),
  beschreibung: z.string().trim().max(2000),
  zusatz: stundenZuMinuten,
});

/** Beschreibung und manuell nachgetragene Zeit setzen; legt den Tag an, falls es ihn noch nicht gibt. */
export async function saveArbeitstag(input: z.infer<typeof arbeitstagSchema>) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  await db
    .insert(arbeitstag)
    .values({
      tag: input.tag,
      zusatzMinuten: input.zusatz,
      beschreibung: input.beschreibung || null,
      beschreibungManuell: true,
      quelle: "manuell",
    })
    .onConflictDoUpdate({
      target: arbeitstag.tag,
      set: {
        zusatzMinuten: input.zusatz,
        beschreibung: input.beschreibung || null,
        beschreibungManuell: true,
        updatedAt: new Date(),
      },
    });
}

/** Nur rein manuelle Tage (ohne berechnete Zeit) dürfen gelöscht werden. */
export async function deleteArbeitstag(tag: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  const [t] = await db.select({ minuten: arbeitstag.minuten }).from(arbeitstag).where(eq(arbeitstag.tag, tag));
  if (t && t.minuten === 0) await db.delete(arbeitstag).where(eq(arbeitstag.tag, tag));
}
