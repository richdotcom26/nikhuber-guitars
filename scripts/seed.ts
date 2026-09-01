/**
 * Basis-Seed (idempotent, upsert).
 *
 *   npx tsx --env-file=.env.local scripts/seed.ts
 *
 * Seedet:
 *  - spec_slot            (aus src/lib/specs/slots.ts)
 *  - firma_setting        (Singleton mit Default-Werten — echte Firmendaten später)
 *  - arbeitsschritt_vorrat (Schritt-Katalog, aus Ninox PB abgeleitet)
 *
 * Stammdaten (staat, zahlungsbedingung, holzart, artikel, kunde …) kommen über den
 * Ninox-Import, nicht hier.
 */
import { db } from "../src/lib/db";
import { firmaSetting, specSlot, arbeitsschrittVorrat } from "../src/lib/db/schema";
import { SPEC_SLOTS } from "../src/lib/specs/slots";
import { sql } from "drizzle-orm";

async function seedSpecSlots() {
  await db
    .insert(specSlot)
    .values(
      SPEC_SLOTS.map((s) => ({
        key: s.key,
        caption: s.caption,
        gruppe: s.gruppe,
        section: s.section,
        reihenfolge: s.order,
        aufpreisMoeglich: s.aufpreis,
        mehrfach: s.multi,
        holz: s.holz,
      })),
    )
    .onConflictDoUpdate({
      target: specSlot.key,
      set: {
        caption: sql`excluded.caption`,
        gruppe: sql`excluded.gruppe`,
        section: sql`excluded.section`,
        reihenfolge: sql`excluded.reihenfolge`,
        aufpreisMoeglich: sql`excluded.aufpreis_moeglich`,
        mehrfach: sql`excluded.mehrfach`,
        holz: sql`excluded.holz`,
      },
    });
  console.log(`spec_slot: ${SPEC_SLOTS.length} Zeilen`);
}

async function seedFirmaSetting() {
  const [existing] = await db.select({ id: firmaSetting.id }).from(firmaSetting).limit(1);
  if (existing) {
    console.log("firma_setting: existiert bereits — übersprungen");
    return;
  }
  await db.insert(firmaSetting).values({
    firma: "Nik Huber Guitars",
    // Rest = Spalten-Defaults (mwst_satz 19, Rabatte 35/40/30, serien_start 4900,
    //   hts_code 92079010, lacey_unterzeichner "Elly Müller", usd_eur_faktor 0.92).
    // Echte Adresse / Steuernummer / Bank später eintragen.
  });
  console.log("firma_setting: angelegt");
}

// Schritt-Katalog (Ninox PB). nr = Referenznummer (81 Montage · 84 Reparatur · 93 Cites ·
// 94 F&W · 95 Rechnung · 96 Ausfuhr · 99 Versendet). reihenfolge = "Order" (29 = Kiste packen).
const VORRAT: Array<{ nr: number; workstep: string; reihenfolge: number; typ: "WERKSTATT" | "OFFICE" | null }> = [
  { nr: 102, workstep: "Holzauswahl Top", reihenfolge: 10, typ: "WERKSTATT" },
  { nr: 62, workstep: "Holzauswahl Body", reihenfolge: 12, typ: "WERKSTATT" },
  { nr: 64, workstep: "Holzauswahl Neck", reihenfolge: 13, typ: "WERKSTATT" },
  { nr: 65, workstep: "Body vorbereiten", reihenfolge: 16, typ: "WERKSTATT" },
  { nr: 66, workstep: "Neck vorbereiten", reihenfolge: 19, typ: "WERKSTATT" },
  { nr: 67, workstep: "Body CNC", reihenfolge: 21, typ: "WERKSTATT" },
  { nr: 90, workstep: "Binding kleben", reihenfolge: 22, typ: "WERKSTATT" },
  { nr: 68, workstep: "Neck CNC inkl. Griffbrett", reihenfolge: 24, typ: "WERKSTATT" },
  { nr: 69, workstep: "Neck bundieren", reihenfolge: 27, typ: "WERKSTATT" },
  { nr: 88, workstep: "Body bohren", reihenfolge: 28, typ: "WERKSTATT" },
  { nr: 86, workstep: "Kiste packen", reihenfolge: 29, typ: "WERKSTATT" },
  { nr: 70, workstep: "Holzschliff Body", reihenfolge: 30, typ: "WERKSTATT" },
  { nr: 87, workstep: "Holzschliff Neck", reihenfolge: 31, typ: "WERKSTATT" },
  { nr: 71, workstep: "Absperren", reihenfolge: 33, typ: "WERKSTATT" },
  { nr: 72, workstep: "ggf. Poren füllen", reihenfolge: 36, typ: "WERKSTATT" },
  { nr: 73, workstep: "ggf. Beizen", reihenfolge: 39, typ: "WERKSTATT" },
  { nr: 74, workstep: "Grund I", reihenfolge: 42, typ: "WERKSTATT" },
  { nr: 91, workstep: "Zwischenschliff", reihenfolge: 43, typ: "WERKSTATT" },
  { nr: 92, workstep: "Grund II", reihenfolge: 44, typ: "WERKSTATT" },
  { nr: 75, workstep: "Planschliff", reihenfolge: 45, typ: "WERKSTATT" },
  { nr: 76, workstep: "Lack I", reihenfolge: 48, typ: "WERKSTATT" },
  { nr: 77, workstep: "Verleimen", reihenfolge: 51, typ: "WERKSTATT" },
  { nr: 78, workstep: "Lack II", reihenfolge: 54, typ: "WERKSTATT" },
  { nr: 79, workstep: "ggf. SDF Openpore", reihenfolge: 57, typ: "WERKSTATT" },
  { nr: 80, workstep: "Finish", reihenfolge: 60, typ: "WERKSTATT" },
  { nr: 81, workstep: "Montage", reihenfolge: 63, typ: "WERKSTATT" },
  { nr: 89, workstep: "Setup/Zertifikat (Nik)", reihenfolge: 64, typ: "OFFICE" },
  { nr: 93, workstep: "Cites (Rio)", reihenfolge: 65, typ: "OFFICE" },
  { nr: 94, workstep: "Fish&Wildlife (USA)", reihenfolge: 67, typ: "OFFICE" },
  { nr: 95, workstep: "Rechnung", reihenfolge: 72, typ: "OFFICE" },
  { nr: 96, workstep: "Ausfuhrantrag", reihenfolge: 80, typ: "OFFICE" },
  { nr: 97, workstep: "Fotos gespeichert", reihenfolge: 81, typ: "OFFICE" },
  { nr: 98, workstep: "Verpackt", reihenfolge: 82, typ: "OFFICE" },
  { nr: 99, workstep: "Versendet", reihenfolge: 84, typ: "OFFICE" },
  { nr: 84, workstep: "Sonderarbeit (Reparatur)", reihenfolge: 99, typ: null },
];

async function seedVorrat() {
  await db
    .insert(arbeitsschrittVorrat)
    .values(VORRAT)
    .onConflictDoUpdate({
      target: arbeitsschrittVorrat.nr,
      set: {
        workstep: sql`excluded.workstep`,
        reihenfolge: sql`excluded.reihenfolge`,
        typ: sql`excluded.typ`,
      },
    });
  console.log(`arbeitsschritt_vorrat: ${VORRAT.length} Zeilen`);
}

async function main() {
  await seedSpecSlots();
  await seedFirmaSetting();
  await seedVorrat();
  console.log("Seed fertig.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("Seed FEHLGESCHLAGEN:", e);
  process.exit(1);
});
