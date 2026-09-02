import { db } from "../db";
import * as s from "../db/schema";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { IdMap } from "./idmap";
import { SPEC_SLOTS } from "../specs/slots";
import {
  NinoxDump, ninoxBool, ninoxDateOnly, ninoxNum, ninoxStr,
} from "./ninox";

/**
 * Import-Pässe (Ninox -> Supabase). Reihenfolge in scripts/import.ts.
 * Jeder Pass idempotent: upsert über `id` (aus IdMap).
 */
export interface Ctx {
  dump: NinoxDump;
  ids: IdMap;
  log: (msg: string) => void;
  /** Ninox-JD-ID -> region (aus dem Staaten-Pass), für kunde.region. */
  staatRegion: Map<string, string>;
}

// ---- Helfer -------------------------------------------------------------
function f(ctx: Ctx, typeId: string, rec: Record<string, unknown>, caption: string): unknown {
  const fid = ctx.dump.fieldIdByCaption(typeId, caption);
  return fid ? rec[fid] : undefined;
}

/** chunked upsert; `set` (für DO UPDATE) automatisch aus den Value-Keys (außer `id`). */
async function upsert(table: PgTable, rows: Record<string, unknown>[], target: unknown): Promise<number> {
  if (!rows.length) return 0;
  const t = table as unknown as Record<string, { name?: string }>;
  const set: Record<string, unknown> = {};
  for (const k of Object.keys(rows[0])) {
    if (k === "id") continue;
    const name = t[k]?.name;
    if (name) set[k] = sql.raw(`excluded."${name}"`);
  }
  const CHUNK = 400;
  let n = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.insert(table) as any).values(chunk).onConflictDoUpdate({ target, set });
    n += chunk.length;
  }
  return n;
}

const num1 = (v: unknown) => String(v) === "1";

// ======================================================= zahlungsbedingung
export async function importZahlungsbedingung(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Zahlungsbedingungen");
  if (!tid) return ctx.log("Typ nicht gefunden");
  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const uuid = ctx.ids.get(tid, id);
    ctx.ids.alias(`zb_ninoxid:${id}`, uuid);
    return {
      id: uuid,
      bezeichnung: ninoxStr(f(ctx, tid, rec, "Bezeichnung")) ?? `#${id}`,
      bezeichnungEn: ninoxStr(f(ctx, tid, rec, "Bezeichnung EN")),
    };
  });
  ctx.log(`${await upsert(s.zahlungsbedingung, rows, s.zahlungsbedingung.id)}`);
}

// =============================================================== staat
const REGION: Record<string, "D" | "EU" | "WELT" | "ASIEN" | "USA"> = {
  "1": "D", "2": "EU", "3": "WELT", "4": "ASIEN", "5": "USA",
};
const SPRACHE: Record<string, "DE" | "EN"> = { "1": "DE", "2": "EN" };
const WAEHRUNG: Record<string, "EUR" | "USD"> = { "1": "EUR", "2": "USD" };

export async function importStaat(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Staaten");
  if (!tid) return ctx.log("Typ nicht gefunden");
  let unresolvedZb = 0;
  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const region = REGION[String(f(ctx, tid, rec, "Region"))] ?? "WELT";
    ctx.staatRegion.set(String(id), region);
    const zbRaw = f(ctx, tid, rec, "Zahlungsbedingungen");
    const zbId = zbRaw != null
      ? ctx.ids.aliasLookup(`zb_ninoxid:${zbRaw}`) ?? ctx.ids.lookup("ED", zbRaw as number)
      : undefined;
    if (zbRaw != null && !zbId) unresolvedZb++;
    return {
      id: ctx.ids.get(tid, id),
      kuerzel: ninoxStr(f(ctx, tid, rec, "Länderkürzel")),
      name: ninoxStr(f(ctx, tid, rec, "Staat")) ?? `#${id}`,
      region,
      defaultSprache: SPRACHE[String(f(ctx, tid, rec, "Sprache"))] ?? null,
      defaultWaehrung: WAEHRUNG[String(f(ctx, tid, rec, "Währung"))] ?? null,
      defaultZahlungsbedingungId: zbId ?? null,
    };
  });
  ctx.log(`${await upsert(s.staat, rows, s.staat.id)}` +
    (unresolvedZb ? ` (${unresolvedZb}× ZB unaufgelöst)` : ""));
}

// ============================================================= holzart
export async function importHolzart(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("NKS Holzarten");
  if (!tid) return ctx.log("Typ nicht gefunden");
  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => ({
    id: ctx.ids.get(tid, id),
    holz: ninoxStr(f(ctx, tid, rec, "Holz")) ?? `#${id}`,
    botanischerName: ninoxStr(f(ctx, tid, rec, "Botanischer Name")),
    herkunft: ninoxStr(f(ctx, tid, rec, "Herkunft")),
    holzdichte: ninoxNum(f(ctx, tid, rec, "Holzdichte")),
    species: ninoxStr(f(ctx, tid, rec, "Species")),
    genus: ninoxStr(f(ctx, tid, rec, "Genus")),
    info: ninoxStr(f(ctx, tid, rec, "Info")),
  }));
  ctx.log(`${await upsert(s.holzart, rows, s.holzart.id)}`);
}

// =============================================================== kunde
const KONTAKTART: Record<string, string> = {
  "1": "KUNDE", "2": "LIEFERANT", "3": "HAENDLER", "4": "ARTIST",
  "5": "HOLZHAENDLER", "6": "INDUSTRIE", "7": "SONSTIGE",
};
const VERTRIEBSWEG: Record<string, string> = {
  "1": "NET1", "2": "NET2", "3": "NET_US", "4": "VK_US", "5": "VK_EUR",
};

export async function importKunde(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Adressen");
  if (!tid) return ctx.log("Typ 'Adressen' nicht gefunden");
  const jd = ctx.dump.typeIdByCaption("Staaten");
  const ed = ctx.dump.typeIdByCaption("Zahlungsbedingungen");

  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const staatRaw = f(ctx, tid, rec, "STAATEN");
    const staatId = jd && staatRaw != null ? ctx.ids.lookup(jd, staatRaw as number) : undefined;
    const region = staatRaw != null ? ctx.staatRegion.get(String(staatRaw)) : undefined;
    const zbRaw = f(ctx, tid, rec, "Zahlungsbedingungen");
    const zbId = zbRaw != null
      ? ctx.ids.aliasLookup(`zb_ninoxid:${zbRaw}`) ?? (ed ? ctx.ids.lookup(ed, zbRaw as number) : undefined)
      : undefined;
    return {
      id: ctx.ids.get(tid, id),
      kundenNr: ninoxStr(f(ctx, tid, rec, "Kunden-Nr")),
      kontaktart: KONTAKTART[String(f(ctx, tid, rec, "Kontaktart"))] ?? "SONSTIGE",
      firma: ninoxStr(f(ctx, tid, rec, "Firma")),
      vorname: ninoxStr(f(ctx, tid, rec, "Vorname")),
      nachname: ninoxStr(f(ctx, tid, rec, "Nachname")),
      kurzname: ninoxStr(f(ctx, tid, rec, "Kurzname")),
      strasse: ninoxStr(f(ctx, tid, rec, "Strasse")),
      adresszusatz: ninoxStr(f(ctx, tid, rec, "Adresszusatz")),
      plz: ninoxStr(f(ctx, tid, rec, "PLZ")),
      ort: ninoxStr(f(ctx, tid, rec, "Ort")),
      staatId: staatId ?? null,
      region: region ?? null,
      vertriebsweg: VERTRIEBSWEG[String(f(ctx, tid, rec, "Vertriebsweg"))] ?? null,
      steuerpflichtig: f(ctx, tid, rec, "Steuerpflichtig") == null
        ? null : ninoxBool(f(ctx, tid, rec, "Steuerpflichtig")),
      waehrung: WAEHRUNG[String(f(ctx, tid, rec, "Währung"))] ?? null,
      sprache: SPRACHE[String(f(ctx, tid, rec, "Sprache"))] ?? null,
      zahlungsbedingungId: zbId ?? null,
      ustIdNr: ninoxStr(f(ctx, tid, rec, "USt-Id Nr.")),
      email: ninoxStr(f(ctx, tid, rec, "E-Mail")),
      emailRechnungCc: ninoxStr(f(ctx, tid, rec, "Rechnungs-E-Mail (cc)")),
      telefon: ninoxStr(f(ctx, tid, rec, "Telefon")),
      mobil: ninoxStr(f(ctx, tid, rec, "Mobil")),
      url: ninoxStr(f(ctx, tid, rec, "URL")),
      briefanrede: ninoxStr(f(ctx, tid, rec, "Briefanrede")),
      briefkopfManuell: ninoxStr(f(ctx, tid, rec, "Manueller Briefkopf (editierbar)")),
      seriennummerAufRechnung: ninoxBool(f(ctx, tid, rec, "Seriennummer auf Rechnung")),
      person2Name: ninoxStr(f(ctx, tid, rec, "2. Person Name")),
      person2Email: ninoxStr(f(ctx, tid, rec, "2. Person E-Mail")),
      person2Telefon: ninoxStr(f(ctx, tid, rec, "2. Person Telefon")),
      person2Bemerkung: ninoxStr(f(ctx, tid, rec, "2. Person Bemerkung")),
      bemerkung: ninoxStr(f(ctx, tid, rec, "Bemerkung")) ?? ninoxStr(f(ctx, tid, rec, "Bemerkung_")),
    };
  });
  ctx.log(`${await upsert(s.kunde, rows, s.kunde.id)}`);
}

// =============================================================== artikel
/** Ninox Artikelgruppe-Caption -> artikelgruppe_enum. */
const GRUPPE_OVERRIDE: Record<string, string> = {
  "Body Options (nicht verwendet)": "SONSTIGES",
  "Test": "SONSTIGES",
  "Hardware/Parts": "HARDWARE_PARTS",
};
function gruppeEnum(caption: string | undefined): string {
  if (!caption) return "SONSTIGES";
  if (GRUPPE_OVERRIDE[caption]) return GRUPPE_OVERRIDE[caption];
  return caption.replace(/\s*\(.*?\)/g, "").trim().replace(/[/\s]+/g, "_").toUpperCase();
}

/** Gruppen ohne physisches Teil -> artikeltyp null (E9). */
const KONFIG_GRUPPEN = new Set<string>([
  "BODY_FINISH", "TOP_FINISH", "NECK_FINISH", "COLOUR", "TOP_COLOUR", "BODY_COLOUR",
  "NECK_COLOUR", "COLOUR_SET", "FINISH_TYPE", "SCALE_LENGTH", "LEFTY", "HOLLOW_BODY",
  "BODY_THICKNESS", "CUSTOM_OPTIONS", "CNC_CUSTOM", "CNC_PU_CUSTOM",
]);
const ARTIKELGRUPPE_ENUM = new Set<string>(s.artikelgruppeEnum.enumValues);

export async function importArtikel(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Artikel");
  if (!tid) return ctx.log("Typ 'Artikel' nicht gefunden");
  const tf = ctx.dump.typeIdByCaption("NKS Holzarten");
  const mc = ctx.dump.typeIdByCaption("Adressen");
  const gruppeVals = ctx.dump.choiceMap(tid, "Artikelgruppe");   // ninoxValue -> caption
  const typVals = ctx.dump.choiceMap(tid, "Artikeltyp");

  const unknownGruppe = new Set<string>();
  let typUnklar = 0;

  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const uuid = ctx.ids.get(tid, id);

    const gCaption = gruppeVals[String(f(ctx, tid, rec, "Artikelgruppe"))];
    const gruppe = gruppeEnum(gCaption);
    if (!ARTIKELGRUPPE_ENUM.has(gruppe)) unknownGruppe.add(`${gCaption} -> ${gruppe}`);

    const holzartRaw = f(ctx, tid, rec, "NKS Holzart");
    const holzartId = tf && holzartRaw != null ? ctx.ids.lookup(tf, holzartRaw as number) : undefined;
    const lieferantRaw = f(ctx, tid, rec, "LIEFERANT");
    const lieferantId = mc && lieferantRaw != null ? ctx.ids.lookup(mc, lieferantRaw as number) : undefined;
    const bestandMin = ninoxNum(f(ctx, tid, rec, "Bestand min"));
    const bestandMax = ninoxNum(f(ctx, tid, rec, "Bestand max"));
    const altTyp = typVals[String(f(ctx, tid, rec, "Artikeltyp"))]; // "Holz" | "Lagerartikel" | …

    // artikeltyp ableiten (E9)
    let artikeltyp: "HOLZ" | "HANDELSWARE" | null = null;
    if (gruppe === "MODEL") artikeltyp = null;
    else if (holzartId || altTyp === "Holz") artikeltyp = "HOLZ";
    else if (KONFIG_GRUPPEN.has(gruppe)) artikeltyp = null;
    else if (lieferantId || bestandMin || bestandMax || altTyp === "Lagerartikel") artikeltyp = "HANDELSWARE";
    else { artikeltyp = null; typUnklar++; }

    const nameBelege = ninoxStr(f(ctx, tid, rec, "Artikelname Belege"));
    const nameLang = nameBelege ? nameBelege.split("- ").pop()!.trim() : null;

    return {
      id: uuid,
      artikelNr: ninoxStr(f(ctx, tid, rec, "Artikel Nr")),
      nrLfd: id,                                   // T7 "Nr" = _id
      artikelgruppe: ARTIKELGRUPPE_ENUM.has(gruppe) ? gruppe : "SONSTIGES",
      artikeltyp,
      nameKurz: ninoxStr(f(ctx, tid, rec, "Artikelname kurz")),
      nameLang,
      nameBelege,
      nameZertifikat: ninoxStr(f(ctx, tid, rec, "Artikelname auf Zertifikat")),
      beschreibung: ninoxStr(f(ctx, tid, rec, "Artikelbeschreibung")),
      vkEur: ninoxNum(f(ctx, tid, rec, "VK_EUR")),
      vkUs: ninoxNum(f(ctx, tid, rec, "VK_US")),
      bruttoFuerNetto: ninoxBool(f(ctx, tid, rec, "Brutto für Netto")),
      nichtRabattierfaehig: ninoxBool(f(ctx, tid, rec, "nicht rabattierfähig")),
      ekNettoEur: ninoxNum(f(ctx, tid, rec, "EK netto EUR")),
      ekNettoUsd: ninoxNum(f(ctx, tid, rec, "EK netto USD")),
      hersteller: ninoxStr(f(ctx, tid, rec, "Hersteller")),
      lieferantId: lieferantId ?? null,
      lieferantArtikelNr: ninoxStr(f(ctx, tid, rec, "Lieferant Artikel-Nr")),
      bestandMin,
      bestandMax,
      geschuetztesHolzCites: num1(f(ctx, tid, rec, "Geschütztes Holz (Cites)")),
      holzartId: holzartId ?? null,
      gewichtKg: ninoxNum(f(ctx, tid, rec, "Gewicht kg")),
      datensatzInaktiv: ninoxBool(f(ctx, tid, rec, "Datensatz inaktiv")),
      schreibgeschuetzt: ninoxBool(f(ctx, tid, rec, "Datensatz schreibgeschützt")),
    };
  });
  const n = await upsert(s.artikel, rows, s.artikel.id);
  ctx.log(`${n}` +
    (typUnklar ? `; artikeltyp unklar (null): ${typUnklar}` : "") +
    (unknownGruppe.size ? `; unbekannte Gruppen: ${[...unknownGruppe].join(", ")}` : ""));
}

// ======================================================= artikel_modell (M:N)
export async function importArtikelModell(ctx: Ctx) {
  // Ninox `Modelselect` (WB.Z7, dmulti) ist ein BITMASKEN-Hex-String über die dynamische
  // Model-Optionsliste — nicht als ID-Array dekodierbar ohne exakte Options-Reihenfolge.
  // -> Zuordnung wird im neuen UI neu gepflegt (betrifft nur "Sonstiges"-Optionen je Modell, 6.3).
  ctx.log("übersprungen — Z7 ist Bitmaske, Zuordnung später im UI (siehe MIGRATION 6.3)");
}

// ===================================================== modell-specs -> spec_belegung
/**
 * Auflösen des `_K`-Feld-Captions je Slot: Ninox nutzt Unterstrich-Form + "_K".
 * (z. B. "PU Bridge" -> "PU_Bridge_K", "Back Top" -> "Back_Top_K")
 */
function kCaption(slotCaption: string): string {
  return slotCaption.replace(/ /g, "_") + "_K";
}

export async function importModellSpecs(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Artikel");
  if (!tid) return ctx.log("Typ 'Artikel' nicht gefunden");
  const gruppeFid = ctx.dump.fieldIdByCaption(tid, "Artikelgruppe");

  // val-/K-Feld-IDs je Slot einmal auflösen
  const slotFields = SPEC_SLOTS.map((slot) => ({
    slot,
    valFid: ctx.dump.fieldIdByCaption(tid, slot.caption, "dchoice"),
    kFid: slot.aufpreis
      ? ctx.dump.fieldIdByCaption(tid, kCaption(slot.caption), "boolean")
      : undefined,
  }));
  const noVal = slotFields.filter((x) => !x.valFid).map((x) => x.slot.key);

  const rows: Array<{
    modellArtikelId: string; slotKey: string; artikelId: string;
    aufpreis: boolean; reihenfolge: number;
  }> = [];
  let modelle = 0;
  for (const { id, f: rec } of ctx.dump.rows(tid)) {
    if (String(gruppeFid ? rec[gruppeFid] : undefined) !== "1") continue; // nur Model
    const modellArtikelId = ctx.ids.lookup(tid, id);
    if (!modellArtikelId) continue;
    modelle++;
    for (const { slot, valFid, kFid } of slotFields) {
      if (!valFid) continue;
      const v = rec[valFid];
      if (v == null || v === "" || v === 0) continue;
      const artikelId = ctx.ids.lookup(tid, v as number); // dchoice speichert Artikel-_id
      if (!artikelId) continue;
      rows.push({
        modellArtikelId,
        slotKey: slot.key,
        artikelId,
        aufpreis: kFid ? ninoxBool(rec[kFid]) : false,
        reihenfolge: 0,
      });
    }
  }

  // idempotent: Modell-Specs komplett neu
  await db.delete(s.specBelegung).where(sql`modell_artikel_id is not null`);
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.insert(s.specBelegung) as any).values(rows.slice(i, i + CHUNK));
  }
  ctx.log(`${rows.length} Zeilen für ${modelle} Modelle` +
    (noVal.length ? `; keine Quelle für Slots: ${noVal.join(", ")}` : ""));
}

export async function importAngebote(_ctx: Ctx) { _ctx.log("TODO"); }
export async function importAuftraege(_ctx: Ctx) { _ctx.log("TODO"); }
export async function importRechnungen(_ctx: Ctx) { _ctx.log("TODO"); }

// noch ungenutzte Helfer stumm halten:
void ninoxDateOnly;
