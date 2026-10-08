#!/usr/bin/env node
/**
 * Arbeitszeit-Protokoll: Claude-Code-Sitzungsprotokolle + Git-Commits → Tabelle `arbeitstag`.
 *
 *   node scripts/arbeitszeit-sync.mjs          # schnell: nur Protokolle der letzten 3 Tage
 *   node scripts/arbeitszeit-sync.mjs --voll   # alle Protokolle (Erstbefüllung)
 *
 * Läuft automatisch über einen Claude-Code-Hook (Stop) nach jeder Antwort.
 *
 * Regeln:
 *  - Arbeitstag = Europe/Berlin, Tagesgrenze 04:00 Uhr (nicht Mitternacht).
 *  - Aktive Zeit = Summe der Abstände zwischen Ereignissen; Pausen > 30 min zählen nicht.
 *    Nur-Commit-Strecken (Protokoll fehlt): Abstände bis 60 min, Vorlauf 30 min vor einem Block.
 *  - Ein gespeicherter Tag wird nur überschrieben, wenn mindestens so viele Ereignisse vorliegen
 *    (Claude Code löscht alte Protokolle → Werte sollen nie schrumpfen).
 *  - Manuell bearbeitete Beschreibungen bleiben unangetastet.
 */
import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(ROOT, ".env.local")); } catch { /* Env evtl. schon gesetzt */ }
if (!process.env.DATABASE_URL) { console.error("[arbeitszeit] DATABASE_URL fehlt"); process.exit(0); }

const VOLL = process.argv.includes("--voll");
const PROJEKTE = path.join(homedir(), ".claude", "projects");

/** Frühere Sitzungen zu dieser App aus anderen Arbeitsordnern (Ninox-Analyse, erster Entwurf). */
const HISTORISCH = [
  "C--Users-RainerW-lbeck-OneDrive---dWERK-GmbH---Co-KG-Claude-Code-1/6f5141e4-b297-450d-8639-cbdf74d96255.jsonl",
  "C--Users-RainerW-lbeck-OneDrive---dWERK-GmbH---Co-KG-Claude-Code-1/7a9f1ad1-4956-4ef3-928e-3e262984a2f6.jsonl",
];
/** Projektordner, deren Sitzungen komplett zur App gehören (Name = Pfad mit Ersetzungen). */
const PROJEKT_ORDNER = ["C--Users-W-li-Claude-nikhuber-guitars"];

const PAUSE_MIN = 30;
const PAUSE_GIT_MIN = 60;
const VORLAUF_MIN = 30;

const tagVon = (ms) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(ms - 4 * 3600e3));

function jsonlDateien() {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (f.endsWith(".jsonl")) out.push({ p, mtime: st.mtimeMs });
    }
  };
  for (const o of PROJEKT_ORDNER) walk(path.join(PROJEKTE, o));
  for (const h of HISTORISCH) {
    const p = path.join(PROJEKTE, h);
    if (existsSync(p)) out.push({ p, mtime: statSync(p).mtimeMs });
  }
  const grenze = Date.now() - 3 * 24 * 3600e3;
  return out.filter((f) => VOLL || f.mtime >= grenze).map((f) => f.p);
}

async function protokollEreignisse(dateien) {
  const ev = [];
  for (const f of dateien) {
    for await (const line of createInterface({ input: createReadStream(f) })) {
      if (!/"type":"(user|assistant)"/.test(line)) continue;
      const m = line.match(/"timestamp":"([^"]+)"/);
      if (m) ev.push({ t: Date.parse(m[1]), q: "p" });
    }
  }
  return ev;
}

function commits() {
  try {
    const out = execFileSync("git", ["log", "--format=%at|%s"], { cwd: ROOT, encoding: "utf8" });
    return out.trim().split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf("|");
      return { t: Number(l.slice(0, i)) * 1000, q: "g", s: l.slice(i + 1) };
    });
  } catch {
    return [];
  }
}

/** Commit-Betreffs → kurze Tagesbeschreibung. */
function beschreibung(subjects) {
  const clean = [...new Set(subjects
    .filter((s) => !/^Merge/.test(s))
    .map((s) => s.replace(/^\w+(\([^)]*\))?!?:\s*/, "").trim()))];
  if (!clean.length) return "Analyse / Besprechung (ohne Commit)";
  const txt = clean.join("; ");
  return txt.length > 700 ? `${txt.slice(0, 697)}…` : txt;
}

function auswerten(ev) {
  ev.sort((a, b) => a.t - b.t);
  const tage = new Map();
  for (const e of ev) {
    const k = tagVon(e.t);
    if (!tage.has(k)) tage.set(k, []);
    tage.get(k).push(e);
  }
  const res = [];
  for (const [tag, l] of tage) {
    let ms = 0;
    let beginn = l[0].t;
    if (l[0].q === "g") { ms += VORLAUF_MIN * 60e3; beginn -= VORLAUF_MIN * 60e3; }
    for (let i = 1; i < l.length; i++) {
      const d = l[i].t - l[i - 1].t;
      const nurGit = l[i].q === "g" && l[i - 1].q === "g";
      if (d <= (nurGit ? PAUSE_GIT_MIN : PAUSE_MIN) * 60e3) ms += d;
      else if (l[i].q === "g") ms += VORLAUF_MIN * 60e3;
    }
    const p = l.filter((e) => e.q === "p").length;
    const g = l.length - p;
    const minuten = Math.round(ms / 60e3);
    if (minuten < 1) continue;
    res.push({
      tag,
      beginn: new Date(beginn),
      ende: new Date(l[l.length - 1].t),
      minuten,
      ereignisse: l.length,
      quelle: p && g ? "Protokoll + Git" : p ? "Protokoll" : "Git (geschätzt)",
      beschreibung: beschreibung(l.filter((e) => e.q === "g").map((e) => e.s)),
    });
  }
  return res;
}

const dateien = jsonlDateien();
const ev = [...await protokollEreignisse(dateien), ...commits()];
const tage = auswerten(ev);

// Im Schnellmodus nur Tage aktualisieren, zu denen frische Protokolle vorliegen (+ heute).
const frischeTage = new Set(VOLL ? tage.map((t) => t.tag) : ev.filter((e) => e.q === "p").map((e) => tagVon(e.t)));

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
let n = 0;
try {
  for (const t of tage) {
    if (!frischeTage.has(t.tag)) continue;
    const r = await sql`
      insert into arbeitstag (tag, beginn, ende, minuten, ereignisse, quelle, beschreibung, updated_at)
      values (${t.tag}, ${t.beginn}, ${t.ende}, ${t.minuten}, ${t.ereignisse}, ${t.quelle}, ${t.beschreibung}, now())
      on conflict (tag) do update set
        beginn = excluded.beginn, ende = excluded.ende, minuten = excluded.minuten,
        ereignisse = excluded.ereignisse, quelle = excluded.quelle,
        beschreibung = case when arbeitstag.beschreibung_manuell then arbeitstag.beschreibung else excluded.beschreibung end,
        updated_at = now()
      where arbeitstag.ereignisse <= excluded.ereignisse`;
    n += r.count;
  }
  if (process.argv.includes("--verbose") || VOLL) {
    console.log(`[arbeitszeit] ${dateien.length} Protokolle, ${tage.length} Tage berechnet, ${n} aktualisiert`);
  }
} finally {
  await sql.end();
}
