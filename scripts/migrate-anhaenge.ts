/**
 * Anhang-Migration: Dateien aus dem Ninox-Backup nach Supabase Storage + `anhang`-Tabelle.
 *
 *   1. `unzip "<Backup>/1 Nik Huber Guitars.ninox" "files/*" -d ninox-dump/`   (~2,5 GB, einmalig)
 *   2. npx tsx --env-file=.env.local scripts/migrate-anhaenge.ts
 *
 * Idempotent/fortsetzbar: überspringt Dateien, für die schon eine `anhang`-Zeile mit
 * demselben `pfad` existiert. Bei Abbruch einfach erneut starten.
 */
import { resolve } from "node:path";
import { existsSync, statSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { IdMap } from "../src/lib/import/idmap";
import { parseNinoxDump, type NinoxDump } from "../src/lib/import/ninox";
import { db } from "../src/lib/db";
import * as s from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

const NINOX = process.env.NINOX_BACKUP
  ?? "C:/Users/RainerWülbeck/OneDrive - dWERK GmbH & Co KG/Claude Code 1/Huber/Ninox Datenbank Backup/1 Nik Huber Guitars.ninox";
const FILES_DIR = resolve("ninox-dump/files");
const BUCKET = "anhaenge";

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type Art = "BELEG_PDF" | "BILD" | "CITES" | "LACEY" | "ZERTIFIKAT" | "SONSTIGES";

/** Ninox-Typ-Caption -> Feld-Caption -> { traeger-Spalte, art }. */
const PLAN: Record<string, Record<string, { col: string; art: Art }>> = {
  "Aufträge": {
    "Bild / Farbmuster": { col: "auftrag_id", art: "BILD" },
    "Auftrag PDF": { col: "auftrag_id", art: "BELEG_PDF" },
    "Zertifikat": { col: "auftrag_id", art: "ZERTIFIKAT" },
    "Lieferschein": { col: "auftrag_id", art: "BELEG_PDF" },
    "CITES Gitarre Vorne": { col: "auftrag_id", art: "CITES" },
    "CITES Gitarre hinten": { col: "auftrag_id", art: "CITES" },
    "Lacey Act-Dokument": { col: "auftrag_id", art: "LACEY" },
    "CITES-Dokument": { col: "auftrag_id", art: "CITES" },
  },
  "Artikel": { "Bild": { col: "artikel_id", art: "BILD" } },
  "ToDo": { "Bild/Dokument": { col: "todo_id", art: "SONSTIGES" } },
  "Holzbestand": {
    "Bild": { col: "holz_inventar_id", art: "BILD" },
    "QRCode": { col: "holz_inventar_id", art: "BILD" },
  },
  "Angebote": { "Angebot PDF": { col: "angebot_id", art: "BELEG_PDF" } },
  "Rechnungen": { "Rechnungs Vorschau (alt)": { col: "rechnung_id", art: "BELEG_PDF" } },
};

const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", heic: "image/heic", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain",
};
const mimeOf = (name: string) => MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Storage-Key-tauglich: nur [A-Za-z0-9._-], Rest -> "_". */
const keySafe = (str: string) =>
  str.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 180);

function ensureExtracted() {
  if (existsSync(FILES_DIR)) return;
  if (!existsSync(NINOX)) {
    console.error(`Backup nicht gefunden: ${NINOX}\nNINOX_BACKUP setzen oder Pfad anpassen.`);
    process.exit(1);
  }
  console.log(`Entpacke files/ aus dem Backup (~2,5 GB, einmalig) …`);
  const r = spawnSync("unzip", ["-o", NINOX, "files/*", "-d", "ninox-dump/"], { stdio: "inherit" });
  if (r.status !== 0) { console.error("unzip fehlgeschlagen"); process.exit(1); }
}

async function existingPfade(): Promise<Set<string>> {
  const rows = await db.execute(sql`select pfad from anhang where pfad is not null`);
  return new Set((rows as unknown as { pfad: string }[]).map((r) => r.pfad));
}

function fieldId(dump: NinoxDump, tid: string, caption: string): string | undefined {
  return dump.fieldIdByCaption(tid, caption);
}

async function main() {
  ensureExtracted();
  const dump = await parseNinoxDump(resolve("ninox-dump/data.db"));
  const ids = new IdMap(resolve("ninox-dump/idmap.json"));
  const done = await existingPfade();
  console.log(`${done.size} Anhänge bereits migriert — werden übersprungen.`);

  let uploaded = 0, skipped = 0, missing = 0, failed = 0;
  const t0 = Date.now();

  type Job = { col: string; parentId: string; art: Art; disk: string; dateiname: string; pfad: string };
  const jobs: Job[] = [];

  // ---- feldbasierte Typen ----
  for (const [cap, fields] of Object.entries(PLAN)) {
    const tid = dump.typeIdByCaption(cap);
    if (!tid) { console.warn(`Typ "${cap}" nicht gefunden`); continue; }
    for (const { id, f: rec } of dump.rows(tid)) {
      const parentId = ids.lookup(tid, id);
      if (!parentId) continue;
      for (const [fcap, { col, art }] of Object.entries(fields)) {
        const fid = fieldId(dump, tid, fcap);
        const name = fid ? rec[fid] : undefined;
        if (typeof name !== "string" || !name) continue;
        const disk = resolve(FILES_DIR, tid, String(id), name);
        const pfad = `${col.replace("_id", "")}/${parentId}/${tid}_${id}_${fid}_${keySafe(name)}`;
        jobs.push({ col, parentId, art, disk, dateiname: name, pfad });
      }
    }
  }

  // ---- BD "Anhänge_" (Mail-/Beleg-PDFs) ----
  const bd = dump.typeIdByCaption("Anhänge_");
  if (bd) {
    const AD = dump.typeIdByCaption("Mailversand");
    const YC = dump.typeIdByCaption("Angebote");
    const BC = dump.typeIdByCaption("Rechnungen");
    const A = dump.typeIdByCaption("Aufträge");
    const fA = fieldId(dump, bd, "File");
    const fC = fieldId(dump, bd, "MAILVERSAND");
    const fE = fieldId(dump, bd, "ANGEBOT");
    const fF = fieldId(dump, bd, "RECHNUNGEN");
    const fG = fieldId(dump, bd, "AUFTRAG");
    for (const { id, f: rec } of dump.rows(bd)) {
      const name = fA ? rec[fA] : undefined;
      if (typeof name !== "string" || !name) continue;
      let col: string | null = null, parentId: string | undefined;
      if (fC && rec[fC] != null && AD) { parentId = ids.lookup(AD, rec[fC] as number); col = "mailversand_id"; }
      if (!parentId && fG && rec[fG] != null && A) { parentId = ids.lookup(A, rec[fG] as number); col = "auftrag_id"; }
      if (!parentId && fF && rec[fF] != null && BC) { parentId = ids.lookup(BC, rec[fF] as number); col = "rechnung_id"; }
      if (!parentId && fE && rec[fE] != null && YC) { parentId = ids.lookup(YC, rec[fE] as number); col = "angebot_id"; }
      if (!parentId || !col) continue;
      const disk = resolve(FILES_DIR, bd, String(id), name);
      const pfad = `${col.replace("_id", "")}/${parentId}/BD_${id}_${keySafe(name)}`;
      jobs.push({ col, parentId, art: "BELEG_PDF", disk, dateiname: name, pfad });
    }
  }

  console.log(`${jobs.length} Datei-Zuordnungen erkannt.`);
  if (process.env.DRY) {
    const byCol: Record<string, number> = {};
    let onDisk = 0, gone = 0;
    for (const j of jobs) {
      byCol[j.col] = (byCol[j.col] ?? 0) + 1;
      if (existsSync(j.disk)) onDisk++; else gone++;
    }
    console.log("je Träger:", byCol);
    console.log(`Datei vorhanden: ${onDisk}, fehlt im Backup: ${gone}`);
    process.exit(0);
  }
  console.log("Upload startet …");

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (done.has(j.pfad)) { skipped++; continue; }
    if (!existsSync(j.disk)) { missing++; continue; }
    try {
      const bytes = readFileSync(j.disk);
      const size = statSync(j.disk).size;
      const up = await supa.storage.from(BUCKET).upload(j.pfad, bytes, {
        contentType: mimeOf(j.dateiname), upsert: true,
      });
      if (up.error) throw up.error;
      await db.insert(s.anhang).values({
        [j.col]: j.parentId,
        art: j.art,
        dateiname: j.dateiname,
        pfad: j.pfad,
        groesse: size,
        mime: mimeOf(j.dateiname),
      } as typeof s.anhang.$inferInsert);
      uploaded++;
    } catch (e) {
      failed++;
      console.warn(`  FEHLER ${j.pfad}: ${e instanceof Error ? e.message : e}`);
    }
    if ((i + 1) % 100 === 0) {
      const rate = uploaded / ((Date.now() - t0) / 1000);
      console.log(`  ${i + 1}/${jobs.length} — hoch ${uploaded}, übersprungen ${skipped}, fehlt ${missing}, Fehler ${failed} (${rate.toFixed(1)}/s)`);
    }
  }

  console.log(`\nFertig: ${uploaded} hochgeladen, ${skipped} schon da, ${missing} Datei fehlte im Backup, ${failed} Fehler.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
