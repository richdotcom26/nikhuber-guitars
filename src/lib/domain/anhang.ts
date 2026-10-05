import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { anhang, rechnung } from "@/lib/db/schema";
import {
  ANHANG_ART_VALUES, ANHANG_SPALTE, ANHANG_TRAEGER, type AnhangArt, type AnhangTraeger,
} from "@/lib/anhang-shared";
import { ANHANG_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import type { Tx } from "./belege";
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

/** Drizzle-Feldname (camelCase) je Träger — für insert/where über das Schema-Objekt. */
const ANHANG_FELD = {
  auftrag: "auftragId",
  angebot: "angebotId",
  rechnung: "rechnungId",
  artikel: "artikelId",
  holzInventar: "holzInventarId",
  todo: "todoId",
  mailversand: "mailversandId",
  ticket: "ticketId",
} as const satisfies Record<AnhangTraeger, keyof typeof anhang.$inferInsert>;

/* --------------------------------------------------------------------- liste */

export interface AnhangRow {
  id: string;
  art: AnhangArt | null;
  dateiname: string | null;
  groesse: number | null;
  mime: string | null;
  mitRechnung: boolean;
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
      mitRechnung: anhang.mitRechnung,
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
  const col = anhang[ANHANG_FELD[traeger]];
  const rows = await db
    .select({ tid: col, n: sql<number>`count(*)::int` })
    .from(anhang)
    .where(inArray(col, ids))
    .groupBy(col);
  for (const r of rows) if (r.tid) out.set(r.tid, r.n);
  return out;
}

/**
 * Kurzlebige signierte URL. `alsDownload=true` (Default) erzwingt den Download,
 * `false` liefert eine URL zum Inline-Anzeigen (z. B. für <img>-Vorschau).
 */
export async function anhangUrl(id: string, alsDownload = true): Promise<string> {
  await requireUser();
  const [row] = await db.select({ pfad: anhang.pfad, dateiname: anhang.dateiname })
    .from(anhang).where(eq(anhang.id, id));
  if (!row?.pfad) throw new DomainError("NOT_FOUND", "Anhang nicht gefunden.");
  const { data, error } = await supabaseAdmin()
    .storage.from(ANHANG_BUCKET)
    .createSignedUrl(row.pfad, 600, alsDownload ? { download: row.dateiname ?? undefined } : undefined);
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

  return speichereAnhang({
    traeger: parsed.traeger,
    traegerId: parsed.id,
    dateiname: file.name,
    bytes: Buffer.from(await file.arrayBuffer()),
    mime: file.type || null,
    art: parsed.art ?? (file.type.startsWith("image/") ? "BILD" : "SONSTIGES"),
    userId: user.id,
  });
}

/**
 * Datei in den Storage legen + anhang-Zeile anlegen (ohne Rollenprüfung — Aufrufer prüft).
 * Wird vom Upload und vom Archivieren erzeugter PDFs genutzt.
 */
export async function speichereAnhang(p: {
  traeger: AnhangTraeger;
  traegerId: string;
  dateiname: string;
  bytes: Buffer;
  mime: string | null;
  art: AnhangArt;
  userId: string;
  /** Innerhalb einer laufenden Transaktion (z. B. Rechnung buchen) einfügen. */
  tx?: Tx;
  /** Meldet den Storage-Key nach dem Upload — der Aufrufer räumt bei Rollback auf. */
  onUploaded?: (key: string) => void;
}): Promise<string> {
  const safeName = p.dateiname.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  const key = `${p.traeger}/${p.traegerId}/${randomUUID()}-${safeName}`;

  const { error } = await supabaseAdmin()
    .storage.from(ANHANG_BUCKET)
    .upload(key, p.bytes, { contentType: p.mime || "application/octet-stream", upsert: false });
  if (error) throw new DomainError("STATE", `Upload fehlgeschlagen: ${error.message}`);
  p.onUploaded?.(key);

  try {
    const [row] = await (p.tx ?? db)
      .insert(anhang)
      .values({
        [ANHANG_FELD[p.traeger]]: p.traegerId,
        art: p.art,
        dateiname: p.dateiname,
        pfad: key,
        groesse: p.bytes.length,
        mime: p.mime,
        createdBy: p.userId,
        updatedBy: p.userId,
      })
      .returning({ id: anhang.id });
    return row.id;
  } catch (e) {
    await supabaseAdmin().storage.from(ANHANG_BUCKET).remove([key]).catch(() => {});
    throw e;
  }
}

/** Dateiinhalt aus dem Storage laden (für Mail-Anhänge). */
export async function ladeAnhangDatei(id: string) {
  const [row] = await db
    .select({ pfad: anhang.pfad, dateiname: anhang.dateiname, mime: anhang.mime })
    .from(anhang)
    .where(eq(anhang.id, id));
  if (!row?.pfad) throw new DomainError("NOT_FOUND", "Anhang nicht gefunden.");
  const { data, error } = await supabaseAdmin().storage.from(ANHANG_BUCKET).download(row.pfad);
  if (error || !data) throw new DomainError("STATE", `Datei nicht ladbar: ${error?.message ?? "unbekannt"}`);
  return {
    dateiname: row.dateiname ?? "datei",
    mime: row.mime ?? "application/octet-stream",
    bytes: Buffer.from(await data.arrayBuffer()),
  };
}

/** Foto „Mit Rechnung senden" an/aus. */
export async function setAnhangMitRechnung(id: string, an: boolean) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO", "WERKSTATT");
  await db
    .update(anhang)
    .set({ mitRechnung: an, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(anhang.id, id));
}

export async function deleteAnhang(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [row] = await db.select({ pfad: anhang.pfad }).from(anhang).where(eq(anhang.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Anhang nicht gefunden.");
  const [archiv] = await db.select({ nummer: rechnung.nummer }).from(rechnung)
    .where(eq(rechnung.erechnungAssetId, id));
  if (archiv) {
    throw new DomainError("STATE", `Archiviertes PDF der Rechnung ${archiv.nummer} kann nicht gelöscht werden.`);
  }
  if (row.pfad) {
    await supabaseAdmin().storage.from(ANHANG_BUCKET).remove([row.pfad]);
  }
  await db.delete(anhang).where(eq(anhang.id, id));
}
