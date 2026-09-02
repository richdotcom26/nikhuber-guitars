import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { anhang } from "@/lib/db/schema";
import {
  ANHANG_ART_VALUES, ANHANG_SPALTE, ANHANG_TRAEGER, type AnhangArt, type AnhangTraeger,
} from "@/lib/anhang-shared";
import { ANHANG_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export {
  ANHANG_ART, ANHANG_ART_LABEL, formatBytes, type AnhangArt, type AnhangTraeger,
} from "@/lib/anhang-shared";

function spalte(traeger: string): string {
  if (!(ANHANG_TRAEGER as readonly string[]).includes(traeger)) {
    throw new DomainError("VALIDATION", "Unbekannter Anhang-Träger.");
  }
  return ANHANG_SPALTE[traeger as AnhangTraeger];
}

/* --------------------------------------------------------------------- liste */

export interface AnhangRow {
  id: string;
  art: AnhangArt | null;
  dateiname: string | null;
  groesse: number | null;
  mime: string | null;
  createdAt: Date;
}

export async function listAnhaenge(traeger: AnhangTraeger, id: string): Promise<AnhangRow[]> {
  await requireUser();
  const col = spalte(traeger);
  const rows = await db
    .select({
      id: anhang.id,
      art: anhang.art,
      dateiname: anhang.dateiname,
      groesse: anhang.groesse,
      mime: anhang.mime,
      createdAt: anhang.createdAt,
    })
    .from(anhang)
    .where(sql`${sql.identifier(col)} = ${id}`)
    .orderBy(desc(anhang.createdAt));
  return rows as AnhangRow[];
}

/** Zähler je Träger-ID (für Badges in Listen). */
export async function anhangAnzahl(traeger: AnhangTraeger, ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  await requireUser();
  const col = anhang[traeger === "holzInventar" ? "holzInventarId"
    : traeger === "mailversand" ? "mailversandId"
    : (`${traeger}Id` as "auftragId")];
  const rows = await db
    .select({ tid: col, n: sql<number>`count(*)::int` })
    .from(anhang)
    .where(inArray(col, ids))
    .groupBy(col);
  for (const r of rows) if (r.tid) out.set(r.tid, r.n);
  return out;
}

/** Kurzlebige signierte Download-URL. */
export async function anhangUrl(id: string): Promise<string> {
  await requireUser();
  const [row] = await db.select({ pfad: anhang.pfad, dateiname: anhang.dateiname })
    .from(anhang).where(eq(anhang.id, id));
  if (!row?.pfad) throw new DomainError("NOT_FOUND", "Anhang nicht gefunden.");
  const { data, error } = await supabaseAdmin()
    .storage.from(ANHANG_BUCKET)
    .createSignedUrl(row.pfad, 600, { download: row.dateiname ?? undefined });
  if (error || !data) throw new DomainError("STATE", `Storage-Fehler: ${error?.message ?? "unbekannt"}`);
  return data.signedUrl;
}

/* ------------------------------------------------------------------ upload */

const uploadSchema = z.object({
  traeger: z.enum(ANHANG_TRAEGER),
  id: z.uuid(),
  art: z.enum(ANHANG_ART_VALUES).optional(),
});

const MAX_BYTES = 50 * 1024 * 1024;

export async function uploadAnhang(form: FormData): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");

  const parsed = uploadSchema.parse({
    traeger: form.get("traeger"),
    id: form.get("id"),
    art: form.get("art") || undefined,
  });
  const file = form.get("datei");
  if (!(file instanceof File) || file.size === 0) {
    throw new DomainError("VALIDATION", "Keine Datei gewählt.");
  }
  if (file.size > MAX_BYTES) throw new DomainError("VALIDATION", "Datei größer als 50 MB.");

  const col = spalte(parsed.traeger);
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  const key = `${parsed.traeger}/${parsed.id}/${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin()
    .storage.from(ANHANG_BUCKET)
    .upload(key, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new DomainError("STATE", `Upload fehlgeschlagen: ${error.message}`);

  const [row] = await db
    .insert(anhang)
    .values({
      [col]: parsed.id,
      art: parsed.art ?? (file.type.startsWith("image/") ? "BILD" : "SONSTIGES"),
      dateiname: file.name,
      pfad: key,
      groesse: file.size,
      mime: file.type || null,
      createdBy: user.id,
      updatedBy: user.id,
    } as typeof anhang.$inferInsert)
    .returning({ id: anhang.id });
  return row.id;
}

export async function deleteAnhang(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [row] = await db.select({ pfad: anhang.pfad }).from(anhang).where(eq(anhang.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Anhang nicht gefunden.");
  if (row.pfad) {
    await supabaseAdmin().storage.from(ANHANG_BUCKET).remove([row.pfad]);
  }
  await db.delete(anhang).where(eq(anhang.id, id));
}
