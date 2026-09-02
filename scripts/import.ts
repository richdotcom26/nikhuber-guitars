/**
 * Ninox-Import — Backup `data.db` -> Supabase.
 *
 *   npx tsx --env-file=.env.local scripts/import.ts
 *
 * Voraussetzung: `data.db` unter ninox-dump/ (aus dem .ninox-ZIP entpackt) —
 *   siehe README bzw. `unzip "…/1 Nik Huber Guitars.ninox" data.db -d ninox-dump/`.
 * Pfad überschreibbar via NINOX_DATA_DB.
 *
 * Idempotent: IdMap (ninox-dump/idmap.json) hält Ninox-ID -> UUID stabil, alle Pässe upserten.
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { IdMap } from "../src/lib/import/idmap";
import { parseNinoxDump } from "../src/lib/import/ninox";
import type { Ctx } from "../src/lib/import/passes";
import {
  importZahlungsbedingung, importStaat, importHolzart, importHolzVokabeln, importLagerort,
  importKunde, importArtikel, importArtikelModell, importModellSpecs,
  importAngebote, importAuftraege, importRechnungen, importHolzInventar, importSeriennummer,
  importBetriebsmittel, importMitarbeiter, importTodo,
} from "../src/lib/import/passes";

const DATA_DB = resolve(process.env.NINOX_DATA_DB ?? "ninox-dump/data.db");
const IDMAP = resolve("ninox-dump/idmap.json");

async function main() {
  if (!existsSync(DATA_DB)) {
    console.error(`Nicht gefunden: ${DATA_DB}\n` +
      `Entpacken:  unzip "<Backup>/1 Nik Huber Guitars.ninox" data.db -d ninox-dump/`);
    process.exit(1);
  }

  console.log(`Parse ${DATA_DB} …`);
  const t0 = Date.now();
  const dump = await parseNinoxDump(DATA_DB);
  console.log(`  ${Object.keys(dump.schema.types).length} Typen, ` +
    `${[...dump.records.values()].reduce((n, m) => n + m.size, 0)} Datensätze ` +
    `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  const ids = new IdMap(IDMAP);
  const ctx: Ctx = { dump, ids, log: (m) => console.log("  " + m), staatRegion: new Map() };

  const passes: Array<[string, (c: Ctx) => Promise<void>]> = [
    ["Zahlungsbedingungen", importZahlungsbedingung],
    ["Staaten", importStaat],
    ["Holzarten", importHolzart],
    ["Holz-Vokabeln", importHolzVokabeln],
    ["Lagerorte", importLagerort],
    ["Kunden", importKunde],
    ["Artikel", importArtikel],
    ["Artikel-Modell-Zuordnung", importArtikelModell],
    ["Modell-Specs", importModellSpecs],
    ["Angebote", importAngebote],
    ["Aufträge", importAuftraege],
    ["Seriennummern", importSeriennummer],
    ["Rechnungen", importRechnungen],
    ["Holzbestand", importHolzInventar],
    ["Betriebsmittel", importBetriebsmittel],
    ["Mitarbeiter", importMitarbeiter],
    ["ToDo", importTodo],
  ];

  for (const [name, fn] of passes) {
    console.log(`\n[${name}]`);
    try {
      await fn(ctx);
    } catch (e) {
      console.error(`  FEHLER in Pass "${name}":`, e);
      ids.save();
      process.exit(1);
    }
    ids.save();
  }

  ids.save();
  console.log("\nImport fertig.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
