import { db } from "../db";
import * as s from "../db/schema";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { IdMap } from "./idmap";
import { SPEC_SLOTS } from "../specs/slots";
import {
  NinoxDump, ninoxBool, ninoxDate, ninoxDateOnly, ninoxNum, ninoxStr,
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
// grobe Bezeichnung: alle Rosewood-* -> "Rosewood", Khaya/Sapeli/Swietenia -> "Mahogany",
// "Macassar Ebony" -> "Ebony", sonst = Name selbst.
const HOLZART_GROB: Record<string, string> = {
  "Macassar Ebony": "Ebony", "Khaya": "Mahogany", "Sapeli": "Mahogany", "Swietenia": "Mahogany",
  "Rosewood Brazilian": "Rosewood", "Rosewood East-Indian": "Rosewood", "Rosewood Madagascar": "Rosewood",
};

export async function importHolzart(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("NKS Holzarten");
  if (!tid) return ctx.log("Typ nicht gefunden");
  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const holz = ninoxStr(f(ctx, tid, rec, "Holz")) ?? `#${id}`;
    return {
    id: ctx.ids.get(tid, id),
    holz,
    holzartGrob: HOLZART_GROB[holz] ?? holz,
    botanischerName: ninoxStr(f(ctx, tid, rec, "Botanischer Name")),
    herkunft: ninoxStr(f(ctx, tid, rec, "Herkunft")),
    holzdichte: ninoxNum(f(ctx, tid, rec, "Holzdichte")),
    species: ninoxStr(f(ctx, tid, rec, "Species")),
    genus: ninoxStr(f(ctx, tid, rec, "Genus")),
    info: ninoxStr(f(ctx, tid, rec, "Info")),
    };
  });
  ctx.log(`${await upsert(s.holzart, rows, s.holzart.id)}`);
}

// ==================================================== holz-vokabeln (KF/JF)
export async function importHolzVokabeln(ctx: Ctx) {
  // KF.Holzart ist eine dchoice auf HF „Holzart" (17 grobe Namen, NICHT die 23 botanischen TF).
  const hfId = ctx.dump.typeIdByCaption("Holzart"); // HF
  const kfId = ctx.dump.typeIdByCaption("Unterart");
  const jfId = ctx.dump.typeIdByCaption("Struktur");

  const hfLabel = new Map<string, string>();
  if (hfId) {
    for (const { id, f: rec } of ctx.dump.rows(hfId)) {
      const nm = ninoxStr(f(ctx, hfId, rec, "Holzart"));
      if (nm) hfLabel.set(String(id), nm);
    }
  }

  if (kfId) {
    const rows = ctx.dump.rows(kfId).map(({ id, f: rec }) => {
      const haRaw = f(ctx, kfId, rec, "Holzart");
      return {
        id: ctx.ids.get(kfId, id),
        holzartGrob: haRaw != null ? hfLabel.get(String(haRaw)) ?? null : null,
        name: ninoxStr(f(ctx, kfId, rec, "Unterart")) ?? `#${id}`,
        reihenfolge: ninoxNum(f(ctx, kfId, rec, "Sortierung")) as unknown as number | null,
      };
    });
    ctx.log(`Unterart: ${await upsert(s.holzUnterart, rows, s.holzUnterart.id)}`);
  }

  if (jfId) {
    const seen = new Set<string>();
    const rows = ctx.dump.rows(jfId).flatMap(({ id, f: rec }) => {
      const name = ninoxStr(f(ctx, jfId, rec, "Struktur"));
      if (!name || seen.has(name)) return [];
      seen.add(name);
      return [{ id: ctx.ids.get(jfId, id), name }];
    });
    ctx.log(`Struktur: ${await upsert(s.holzStruktur, rows, s.holzStruktur.name)}`);
  }
}

// ============================================================= lagerort
// Ninox "Lagerorte" (IF): Choice-Kombi Lagerraum(F) / Regal(D) / Fach(E).
// Anzeige-Code = "<Lagerraum>-<Regal><Fach>", z. B. "L1-B3".
const LO_REGAL: Record<string, string> = {
  "1": "A", "2": "B", "3": "C", "4": "D", "5": "E", "6": "F", "7": "G",
  "8": "H", "9": "I", "10": "J", "11": "K", "12": "L", "13": "M", "14": "N",
};
const LO_RAUM: Record<string, string> = { "1": "L1", "2": "L2", "3": "L3" };

export async function importLagerort(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Lagerorte");
  if (!tid) return ctx.log("Typ 'Lagerorte' nicht gefunden");
  const rows = ctx.dump.rows(tid).map(({ id, f: rec }) => {
    const raum = LO_RAUM[String(f(ctx, tid, rec, "Lagerraum"))] ?? "?";
    const regal = LO_REGAL[String(f(ctx, tid, rec, "Regal"))] ?? "?";
    const fach = ninoxStr(f(ctx, tid, rec, "Fach")) ?? "?";
    return {
      id: ctx.ids.get(tid, id),
      code: `${raum}-${regal}${fach}`,
      bezeichnung: `Lagerraum ${raum}, Regal ${regal}, Fach ${fach}`,
    };
  });
  // Natürlicher Schlüssel = code (Alt-Import ohne IdMap möglich).
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
  ctx.log(`${await upsert(s.lagerort, unique, s.lagerort.code)}`);
}

// ======================================================= holz_inventar (FF)
const FF_QUALITAET: Record<string, "STANDARD" | "EXCEPTIONAL"> = { "1": "EXCEPTIONAL", "2": "STANDARD" };
const FF_DICKE: Record<string, "DUENN" | "DICK"> = { "1": "DICK", "2": "DUENN" };
const FF_GROESSE: Record<string, "STANDARD" | "RIETBERGEN"> = { "1": "STANDARD", "2": "RIETBERGEN" };
const FF_PIECE: Record<string, "EIN_PC" | "ZWEI_PC"> = { "1": "ZWEI_PC", "2": "EIN_PC" };
const FF_CNC: Record<string, "STANDARD" | "DICK_59" | "HOLLOW_BODY" | "HONEYCOMB"> = {
  "1": "STANDARD", "2": "DICK_59", "3": "HOLLOW_BODY", "4": "HONEYCOMB",
};
const FF_STATUS: Record<string, "FREI" | "RESERVIERT" | "VERBAUT" | "VERKAUFT"> = {
  "1": "FREI", "2": "RESERVIERT", "3": "VERKAUFT",
};
const FF_FUER: Record<string, "TOP" | "BODY" | "NECK" | "FRETBOARD"> = {
  "1": "TOP", "2": "BODY", "3": "NECK", "4": "FRETBOARD",
};
const JF_NAME: Record<string, string> = { "1": "Burl", "2": "Flamed", "3": "Quilted", "4": "xtra Birdseye", "5": "xtra Spalted" };

export async function importHolzInventar(ctx: Ctx) {
  const ffId = ctx.dump.typeIdByCaption("Holzbestand");
  if (!ffId) return ctx.log("Typ 'Holzbestand' nicht gefunden");
  const hfId = ctx.dump.typeIdByCaption("Holzart");   // HF
  const kfId = ctx.dump.typeIdByCaption("Unterart");  // KF
  const ifId = ctx.dump.typeIdByCaption("Lagerorte"); // IF
  const tfId = ctx.dump.typeIdByCaption("NKS Holzarten");
  const mcId = ctx.dump.typeIdByCaption("Adressen");
  const aId = ctx.dump.typeIdByCaption("Aufträge");

  // HF-id -> Name -> holzart(TF).id  (Namensmatch)
  const holzartByName = new Map<string, string>();
  if (tfId) {
    for (const { id, f: rec } of ctx.dump.rows(tfId)) {
      const nm = ninoxStr(f(ctx, tfId, rec, "Holz"));
      if (nm) holzartByName.set(nm.toLowerCase(), ctx.ids.get(tfId, id));
    }
  }
  const hfName = new Map<string, string>();
  if (hfId) for (const { id, f: rec } of ctx.dump.rows(hfId)) {
    const nm = ninoxStr(f(ctx, hfId, rec, "Holzart"));
    if (nm) hfName.set(String(id), nm);
  }
  const kfName = new Map<string, string>();
  if (kfId) for (const { id, f: rec } of ctx.dump.rows(kfId)) {
    const nm = ninoxStr(f(ctx, kfId, rec, "Unterart"));
    if (nm) kfName.set(String(id), nm);
  }
  const ifCode = new Map<string, string>();
  if (ifId) for (const { id, f: rec } of ctx.dump.rows(ifId)) {
    const raum = LO_RAUM[String(f(ctx, ifId, rec, "Lagerraum"))] ?? "?";
    const regal = LO_REGAL[String(f(ctx, ifId, rec, "Regal"))] ?? "?";
    const fach = ninoxStr(f(ctx, ifId, rec, "Fach")) ?? "?";
    ifCode.set(String(id), `${raum}-${regal}${fach}`);
  }
  const lagerortByCode = new Map<string, string>(
    (await db.select({ id: s.lagerort.id, code: s.lagerort.code }).from(s.lagerort)).map((r) => [r.code, r.id]),
  );

  let unresolvedLo = 0;
  const rows = ctx.dump.rows(ffId).map(({ id, f: rec }) => {
    const hfRaw = f(ctx, ffId, rec, "Holzart");
    const hfNm = hfRaw != null ? hfName.get(String(hfRaw)) : undefined;
    const holzartId = hfNm ? holzartByName.get(hfNm.toLowerCase()) ?? null : null;

    const kfRaw = f(ctx, ffId, rec, "Unterart");
    const unterart = kfRaw != null ? kfName.get(String(kfRaw)) ?? String(kfRaw) : null;

    const lRaw = f(ctx, ffId, rec, "Struktur");
    const struktur = lRaw == null ? null
      : /^\d+$/.test(String(lRaw)) ? JF_NAME[String(lRaw)] ?? String(lRaw) : String(lRaw);

    const loRaw = f(ctx, ffId, rec, "Lagerort");
    const loCode = loRaw != null ? ifCode.get(String(loRaw)) : undefined;
    const lagerortId = loCode ? lagerortByCode.get(loCode) ?? null : null;
    if (loRaw != null && !lagerortId) unresolvedLo++;

    const hhRaw = f(ctx, ffId, rec, "Holzhändler");
    const holzhaendlerId = mcId && hhRaw != null ? ctx.ids.lookup(mcId, hhRaw as number) : null;
    const resRaw = f(ctx, ffId, rec, "Reservierung für Auftrag");
    const reserviertFuerAuftragId = aId && resRaw != null ? ctx.ids.lookup(aId, resRaw as number) : null;

    const fuerRaw = f(ctx, ffId, rec, "für");
    const fuer = fuerRaw != null ? FF_FUER[String(fuerRaw).split(",")[0]] ?? null : null;

    return {
      id: ctx.ids.get(ffId, id),
      inventarId: ninoxStr(f(ctx, ffId, rec, "Inventar-ID")) ?? `FF-${id}`,
      holzartId,
      unterart,
      struktur,
      besonderes: ninoxStr(f(ctx, ffId, rec, "Besonderes")),
      qualitaet: FF_QUALITAET[String(f(ctx, ffId, rec, "Qualität"))] ?? null,
      dicke: FF_DICKE[String(f(ctx, ffId, rec, "Dicke"))] ?? null,
      groesse: FF_GROESSE[String(f(ctx, ffId, rec, "Größe"))] ?? null,
      piece: FF_PIECE[String(f(ctx, ffId, rec, "Piece"))] ?? null,
      fuer,
      cnc: FF_CNC[String(f(ctx, ffId, rec, "CNC"))] ?? null,
      gewichtG: ninoxNum(f(ctx, ffId, rec, "Gewicht (in Gramm)")) as unknown as number | null,
      bemerkung: ninoxStr(f(ctx, ffId, rec, "Bemerkungen")),
      eingangAm: ninoxDateOnly(f(ctx, ffId, rec, "Eingang am")),
      lagerortId,
      status: FF_STATUS[String(f(ctx, ffId, rec, "Status"))] ?? "FREI",
      statusGeaendertAm: ninoxDateOnly(f(ctx, ffId, rec, "Statusänderung am")),
      reserviertFuerAuftragId: reserviertFuerAuftragId ?? null,
      holzhaendlerId: holzhaendlerId ?? null,
      einkaufspreis: ninoxNum(f(ctx, ffId, rec, "Einkaufspreis")),
      verkaufspreis: ninoxNum(f(ctx, ffId, rec, "Verkaufspreis")),
    };
  });
  ctx.log(`${await upsert(s.holzInventar, rows, s.holzInventar.inventarId)}` +
    (unresolvedLo ? ` (${unresolvedLo}× Lagerort unaufgelöst)` : ""));
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

// ===================================================== Beleg-Helfer
type ParentKey = "angebotId" | "auftragId";

/** spec_belegung-Zeilen aus den dchoice/_K-Feldern eines Belegs (Typ YC oder A). */
function belegSpecRows(
  ctx: Ctx, typeId: string, parentKey: ParentKey, parentUuid: string,
  rec: Record<string, unknown>, wbTid: string,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const slot of SPEC_SLOTS) {
    const valFid = ctx.dump.fieldIdByCaption(typeId, slot.caption, "dchoice");
    if (!valFid) continue;
    const v = rec[valFid];
    if (v == null || v === "" || v === 0) continue;
    const artikelId = ctx.ids.lookup(wbTid, v as number);
    if (!artikelId) continue;
    const kFid = slot.aufpreis
      ? ctx.dump.fieldIdByCaption(typeId, kCaption(slot.caption), "boolean") : undefined;
    out.push({
      [parentKey]: parentUuid,
      slotKey: slot.key,
      artikelId,
      aufpreis: kFid ? ninoxBool(rec[kFid]) : false,
      reihenfolge: 0,
    });
  }
  return out;
}

/** kd_*-Snapshot aus dem verknüpften Kunden (Ninox MC), + optionale Beleg-Overrides. */
function kdSnapshot(
  ctx: Ctx, mcTid: string, kundeNinoxId: unknown,
  override: Partial<Record<string, string | null>> = {},
) {
  const rec = kundeNinoxId != null
    ? ctx.dump.records.get(mcTid)?.get(Number(kundeNinoxId)) : undefined;
  const g = (cap: string) => (rec ? f(ctx, mcTid, rec, cap) : undefined);
  return {
    kundeId: kundeNinoxId != null ? ctx.ids.lookup(mcTid, kundeNinoxId as number) ?? null : null,
    kdFirma: override.kdFirma ?? ninoxStr(g("Firma")),
    kdVorname: override.kdVorname ?? ninoxStr(g("Vorname")),
    kdNachname: override.kdNachname ?? ninoxStr(g("Nachname")),
    kdStrasse: override.kdStrasse ?? ninoxStr(g("Strasse")),
    kdPlz: override.kdPlz ?? ninoxStr(g("PLZ")),
    kdOrt: override.kdOrt ?? ninoxStr(g("Ort")),
    kdStaatId: rec && ctx.dump.typeIdByCaption("Staaten")
      ? ctx.ids.lookup(ctx.dump.typeIdByCaption("Staaten")!, g("STAATEN") as number) ?? null : null,
    kdRegion: rec ? ctx.staatRegion.get(String(g("STAATEN"))) ?? null : null,
    kdWaehrung: WAEHRUNG[String(g("Währung"))] ?? null,
    kdSprache: SPRACHE[String(g("Sprache"))] ?? null,
    kdUstId: ninoxStr(g("USt-Id Nr.")),
    kdSteuerpflichtig: g("Steuerpflichtig") == null ? null : ninoxBool(g("Steuerpflichtig")),
    kdVertriebsweg: VERTRIEBSWEG[String(g("Vertriebsweg"))] ?? null,
  };
}

async function insertChunked(table: PgTable, rows: Record<string, unknown>[], chunk = 400) {
  for (let i = 0; i < rows.length; i += chunk) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.insert(table) as any).values(rows.slice(i, i + chunk));
  }
}

// ===================================================== angebote (YC + ZC)
const ANGEBOT_STATUS: Record<string, string> = {
  "1": "NEU", "2": "VERSENDET_OFFEN", "3": "AUFTRAG", "4": "VERLOREN", "5": "VERWORFEN",
};

export async function importAngebote(ctx: Ctx) {
  const yc = ctx.dump.typeIdByCaption("Angebote");
  const zc = ctx.dump.typeIdByCaption("Angebotspositionen");
  const mc = ctx.dump.typeIdByCaption("Adressen")!;
  const wb = ctx.dump.typeIdByCaption("Artikel")!;
  if (!yc) return ctx.log("Typ 'Angebote' nicht gefunden");

  const headers: Record<string, unknown>[] = [];
  const specs: Record<string, unknown>[] = [];
  for (const { id, f: rec } of ctx.dump.rows(yc)) {
    const uuid = ctx.ids.get(yc, id);
    const kd = kdSnapshot(ctx, mc, f(ctx, yc, rec, "KUNDE"), {
      kdFirma: ninoxStr(f(ctx, yc, rec, "Firma")),
      kdVorname: ninoxStr(f(ctx, yc, rec, "Vorname")),
      kdNachname: ninoxStr(f(ctx, yc, rec, "Nachname")),
      kdStrasse: ninoxStr(f(ctx, yc, rec, "Strasse_HsNr")),
      kdPlz: ninoxStr(f(ctx, yc, rec, "PLZ")),
      kdOrt: ninoxStr(f(ctx, yc, rec, "Ort")),
    });
    headers.push({
      id: uuid,
      nummer: ninoxStr(f(ctx, yc, rec, "AngebotsnummerText")) ?? `AN-?-${id}`,
      ...kd,
      kdWaehrung: WAEHRUNG[String(f(ctx, yc, rec, "Währung"))] ?? kd.kdWaehrung,
      modellArtikelId: ctx.ids.lookup(wb, f(ctx, yc, rec, "MODELLARTIKEL") as number) ?? null,
      status: ANGEBOT_STATUS[String(f(ctx, yc, rec, "Angebotsstatus"))] ?? "NEU",
      angebotsdatum: ninoxDateOnly(f(ctx, yc, rec, "Angebotsdatum")),
      kopftext: ninoxStr(f(ctx, yc, rec, "Angebots Text")),
      freitextBody: ninoxStr(f(ctx, yc, rec, "Body Freitext")),
      freitextNeck: ninoxStr(f(ctx, yc, rec, "Neck Freitext")),
      freitextAssembly: ninoxStr(f(ctx, yc, rec, "Assembly Freitext")),
      summeNetto: ninoxNum(f(ctx, yc, rec, "Summe Netto")),
      summeMwst: ninoxNum(f(ctx, yc, rec, "Summe MwSt.")),
      summeBrutto: ninoxNum(f(ctx, yc, rec, "Summe Brutto")),
      positionenAnzeigen: ninoxBool(f(ctx, yc, rec, "Positionen anzeigen")),
      schreibschutz: ninoxBool(f(ctx, yc, rec, "Schreibschutz")),
    });
    specs.push(...belegSpecRows(ctx, yc, "angebotId", uuid, rec, wb));
  }

  const positions: Record<string, unknown>[] = [];
  if (zc) for (const { f: rec } of ctx.dump.rows(zc)) {
    const angebotId = ctx.ids.lookup(yc, f(ctx, zc, rec, "Angebot") as number);
    if (!angebotId) continue;
    positions.push({
      angebotId,
      posNr: ninoxNum(f(ctx, zc, rec, "Pos Nr")),
      artikelId: ctx.ids.lookup(wb, f(ctx, zc, rec, "ARTIKEL AUSWÄHLEN") as number) ?? null,
      artikelName: ninoxStr(f(ctx, zc, rec, "Artikel")),
      artikelBeschreibung: ninoxStr(f(ctx, zc, rec, "Artikelbeschreibung")),
      anzahl: ninoxNum(f(ctx, zc, rec, "Anzahl")) ?? "1",
      einzelpreis: ninoxNum(f(ctx, zc, rec, "Einzelpreis")),
      rabattProzent: ninoxNum(f(ctx, zc, rec, "Rabatt")) ?? "0",
      reRelevant: ninoxBool(f(ctx, zc, rec, "RE_relevant")),
      vkRetailWert: ninoxNum(f(ctx, zc, rec, "VK Retail Wert")),
    });
  }

  await db.delete(s.specBelegung).where(sql`angebot_id is not null`);
  await db.delete(s.belegPosition).where(sql`angebot_id is not null`);
  await db.delete(s.angebot);
  await insertChunked(s.angebot, headers);
  await insertChunked(s.specBelegung, specs, 500);
  await insertChunked(s.belegPosition, positions, 500);
  ctx.log(`angebot ${headers.length}, positionen ${positions.length}, specs ${specs.length}`);
}

// ===================================================== aufträge (A + AC + D)
const AUFTRAGSART: Record<string, string> = {
  "1": "PRODUKTION", "2": "NONE_GUITAR", "3": "SERVICE",
};
const AUFTRAG_STATUS: Record<string, string> = {
  "4": "BACKORDER", "6": "ABGESCHLOSSEN", "10": "WERKSTATT", "12": "STORNIERT",
  "13": "SERVICE", "14": "BEI_NICL", "15": "PROD_FERTIG", "17": "NONE_GUITAR",
  "21": "ABGESCHL_OHNE_BEFUND",
};
const PRODUKTIONSORT: Record<string, string> = { "1": "RODGAU", "2": "HAMBURG" };
const SCHRITT_STATUS: Record<string, string> = {
  "1": "OFFEN", "3": "ERLEDIGT", "4": "WARTEN_AUF", "5": "KISTE_VOLLSTAENDIG",
};
const WARTEN_AUF: Record<string, string> = {
  "1": "Igor", "2": "Florian", "3": "Rui", "4": "Intern",
};

export async function importAuftraege(ctx: Ctx) {
  const a = ctx.dump.typeIdByCaption("Aufträge");
  const ac = ctx.dump.typeIdByCaption("Auftragspositionen");
  const dd = ctx.dump.typeIdByCaption("Arbeitsschritte-Auftrag");
  const mc = ctx.dump.typeIdByCaption("Adressen")!;
  const wb = ctx.dump.typeIdByCaption("Artikel")!;
  if (!a) return ctx.log("Typ 'Aufträge' nicht gefunden");

  // vorrat nr -> uuid
  const vorratByNr = new Map<number, string>();
  for (const r of await db.select({ id: s.arbeitsschrittVorrat.id, nr: s.arbeitsschrittVorrat.nr }).from(s.arbeitsschrittVorrat)) {
    vorratByNr.set(r.nr, r.id);
  }

  const headers: Record<string, unknown>[] = [];
  const specs: Record<string, unknown>[] = [];
  for (const { id, f: rec } of ctx.dump.rows(a)) {
    const uuid = ctx.ids.get(a, id);
    const kd = kdSnapshot(ctx, mc, f(ctx, a, rec, "KUNDE"));
    const netto = ninoxNum(f(ctx, a, rec, "Summe Netto_"));
    const mwst = ninoxNum(f(ctx, a, rec, "Summe MwSt_"));
    headers.push({
      id: uuid,
      nummer: ninoxStr(f(ctx, a, rec, "AuftragsnummerText")) ?? `A-?-${id}`,
      ...kd,
      kdWaehrung: WAEHRUNG[String(f(ctx, a, rec, "Währung"))] ?? kd.kdWaehrung,
      modellArtikelId: ctx.ids.lookup(wb, f(ctx, a, rec, "MODELLARTIKEL") as number) ?? null,
      auftragsart: AUFTRAGSART[String(f(ctx, a, rec, "Auftragsart"))] ?? "PRODUKTION",
      status: AUFTRAG_STATUS[String(f(ctx, a, rec, "Auftragsstatus"))] ?? "BACKORDER",
      auftragsdatum: ninoxDateOnly(f(ctx, a, rec, "Auftragsdatum")),
      prio: ((): number | null => {
        const p = Number(f(ctx, a, rec, "Prio")); return p >= 1 && p <= 3 ? p : null;
      })(),
      produktionsort: PRODUKTIONSORT[String(f(ctx, a, rec, "Produktionsort"))] ?? null,
      bauplandatum: ninoxDateOnly(f(ctx, a, rec, "Bauplandatum")),
      bauplanMonat: ((): string | null => {
        const dt = ninoxDateOnly(f(ctx, a, rec, "Bauplandatum"));
        return dt ? dt.slice(0, 7).replace("-", "/") : null;
      })(),
      werkstattbeginn: ninoxDateOnly(f(ctx, a, rec, "Werkstattbeginn")),
      endmontagedatum: ninoxDateOnly(f(ctx, a, rec, "Endmontagedatum")),
      versanddatum: ninoxDateOnly(f(ctx, a, rec, "Versanddatum")),
      rechnungsdatum: ninoxDateOnly(f(ctx, a, rec, "Rechnungsdatum")),
      zahlungsdatum: ninoxDateOnly(f(ctx, a, rec, "Zahlungsdatum")),
      sernrVergebenAm: ninoxDateOnly(f(ctx, a, rec, "SerNr vergeben")),
      umsatzerwartung: ninoxNum(f(ctx, a, rec, "Umsatzerwartung")),
      citesArtikelanzahl: Number(ninoxNum(f(ctx, a, rec, "Cites-Artikelanzahl")) ?? 0),
      citesDokumentnr: ninoxStr(f(ctx, a, rec, "CITES Dokumentennummer")),
      wiederausfuhrNoneeu: ((): boolean | null => {
        const w = String(f(ctx, a, rec, "Wiederausfuhr (none-EU)"));
        return w === "1" ? true : w === "2" ? false : null;
      })(),
      gesamtrabattProzent: ninoxNum(f(ctx, a, rec, "Gesamtrabatt Prozent")) ?? "0",
      gesamtrabattWert: ninoxNum(f(ctx, a, rec, "Gesamtrabatt Wert")) ?? "0",
      gesamtrabattAktiv: ninoxBool(f(ctx, a, rec, "Gesamtrabatt gewähren")),
      summeNetto: netto,
      summeMwst: mwst,
      summeBrutto: ninoxNum(f(ctx, a, rec, "Summe Brutto_")),
      freitextBody: ninoxStr(f(ctx, a, rec, "Body Freitext")),
      freitextColour: ninoxStr(f(ctx, a, rec, "Colour Freitext")),
      freitextNeck: ninoxStr(f(ctx, a, rec, "Neck Freitext")),
      freitextAssembly: ninoxStr(f(ctx, a, rec, "Assembly Freitext")),
      positionenAnzeigen: ninoxBool(f(ctx, a, rec, "Positionen anzeigen")),
      schreibschutz: ninoxBool(f(ctx, a, rec, "Schreibschutz")),
      modellvorlageVergebenAt: ninoxDate(f(ctx, a, rec, "Modellvorlage vergeben")),
    });
    specs.push(...belegSpecRows(ctx, a, "auftragId", uuid, rec, wb));
  }

  const positions: Record<string, unknown>[] = [];
  if (ac) for (const { f: rec } of ctx.dump.rows(ac)) {
    const auftragId = ctx.ids.lookup(a, f(ctx, ac, rec, "AUFTRAG") as number);
    if (!auftragId) continue;
    positions.push({
      auftragId,
      posNr: ninoxNum(f(ctx, ac, rec, "Pos Nr")),
      artikelId: ctx.ids.lookup(wb, f(ctx, ac, rec, "ARTIKEL AUSWÄHLEN") as number) ?? null,
      artikelName: ninoxStr(f(ctx, ac, rec, "Artikel")),
      artikelBeschreibung: ninoxStr(f(ctx, ac, rec, "Artikelbeschreibung")),
      anzahl: ninoxNum(f(ctx, ac, rec, "Anzahl")) ?? "1",
      einzelpreis: ninoxNum(f(ctx, ac, rec, "Einzelpreis")),
      rabattProzent: ninoxNum(f(ctx, ac, rec, "Rabatt")) ?? "0",
      reRelevant: ninoxBool(f(ctx, ac, rec, "RE_relevant")),
      vkRetailWert: ninoxNum(f(ctx, ac, rec, "VK Retail Wert")),
    });
  }

  const schritte: Record<string, unknown>[] = [];
  if (dd) for (const { f: rec } of ctx.dump.rows(dd)) {
    const auftragId = ctx.ids.lookup(a, f(ctx, dd, rec, "AUFTRAG") as number);
    const vorratNr = Number(f(ctx, dd, rec, "ARBEITSSCHRITTEVORRAT"));
    const vorratId = vorratByNr.get(vorratNr);
    if (!auftragId || !vorratId) continue;
    const dauerMs = Number(f(ctx, dd, rec, "Dauer"));
    schritte.push({
      auftragId,
      vorratId,
      status: SCHRITT_STATUS[String(f(ctx, dd, rec, "Status"))] ?? "OFFEN",
      erledigtAm: ninoxDate(f(ctx, dd, rec, "Date + Time")),
      maImport: ninoxStr(f(ctx, dd, rec, "MA")),
      bemerkungBearbeiter: ninoxStr(f(ctx, dd, rec, "Bemerkung des Bearbeiters")),
      wartenAuf: WARTEN_AUF[String(f(ctx, dd, rec, "Warten auf"))] ?? null,
      dauerMinuten: Number.isFinite(dauerMs) && dauerMs > 0 ? Math.round(dauerMs / 60000) : null,
    });
  }

  await db.delete(s.specBelegung).where(sql`auftrag_id is not null`);
  await db.delete(s.belegPosition).where(sql`auftrag_id is not null`);
  await db.delete(s.arbeitsschritt);
  await db.delete(s.auftrag);
  await insertChunked(s.auftrag, headers);
  await insertChunked(s.specBelegung, specs, 500);
  await insertChunked(s.belegPosition, positions, 500);
  await insertChunked(s.arbeitsschritt, schritte, 500);
  ctx.log(`auftrag ${headers.length}, positionen ${positions.length}, ` +
    `arbeitsschritte ${schritte.length}, specs ${specs.length}`);
}

// ===================================================== rechnungen (BC + CC)
const RECHNUNG_BELEGART: Record<string, string> = {
  "1": "RECHNUNG", "2": "STORNORECHNUNG", "5": "GUTSCHRIFT",
};
const RECHNUNG_STATUS: Record<string, string> = {
  "1": "OFFEN", "2": "BEZAHLT", "3": "STORNORECHNUNG", "4": "GUTSCHRIFT", "5": "RG_STORNIERT",
};
const ZAHLUNGSSTATUS: Record<string, string> = {
  "1": "ANGEZAHLT", "2": "TEILZAHLUNG", "3": "BEZAHLT", "4": "ANGEMAHNT",
};
const BANK: Record<string, string> = { "1": "VVB", "2": "CHASE", "3": "PAYPAL" };

export async function importRechnungen(ctx: Ctx) {
  const bc = ctx.dump.typeIdByCaption("Rechnungen");
  const cc = ctx.dump.typeIdByCaption("Rechnungspositionen");
  const a = ctx.dump.typeIdByCaption("Aufträge")!;
  const mc = ctx.dump.typeIdByCaption("Adressen")!;
  const wb = ctx.dump.typeIdByCaption("Artikel")!;
  if (!bc) return ctx.log("Typ 'Rechnungen' nicht gefunden");

  const nummerToId = new Map<string, string>();
  const rawX3 = new Map<string, string>();  // rechnungUuid -> "Referenz zu RE" (string)

  const headers: Record<string, unknown>[] = [];
  for (const { id, f: rec } of ctx.dump.rows(bc)) {
    const uuid = ctx.ids.get(bc, id);
    const nummer = ninoxStr(f(ctx, bc, rec, "RechnungsnummerText")) ?? `RG-?-${id}`;
    nummerToId.set(nummer, uuid);
    const x3 = ninoxStr(f(ctx, bc, rec, "Referenz zu RE"));
    if (x3) rawX3.set(uuid, x3);

    const kd = kdSnapshot(ctx, mc, f(ctx, bc, rec, "KUNDE"));
    const auftragId = ctx.ids.lookup(a, f(ctx, bc, rec, "ZUGEHÖRIGER AUFTRAG") as number) ?? null;
    // Modell aus dem Auftrag ziehen
    let modellArtikelId: string | null = null;
    const auftragNinox = f(ctx, bc, rec, "ZUGEHÖRIGER AUFTRAG");
    if (auftragNinox != null) {
      const arec = ctx.dump.records.get(a)?.get(Number(auftragNinox));
      if (arec) modellArtikelId = ctx.ids.lookup(wb, f(ctx, a, arec, "MODELLARTIKEL") as number) ?? null;
    }
    headers.push({
      id: uuid,
      nummer,
      ...kd,
      kdWaehrung: WAEHRUNG[String(f(ctx, bc, rec, "Währung"))] ?? kd.kdWaehrung,
      modellArtikelId,
      auftragId,
      belegart: RECHNUNG_BELEGART[String(f(ctx, bc, rec, "Belegart"))] ?? "RECHNUNG",
      status: RECHNUNG_STATUS[String(f(ctx, bc, rec, "Rechnungsstatus"))] ?? "OFFEN",
      zahlungsstatus: ZAHLUNGSSTATUS[String(f(ctx, bc, rec, "Zahlungsstatus"))] ?? null,
      rechnungsdatum: ninoxDateOnly(f(ctx, bc, rec, "Rechnungsdatum")),
      lieferdatum: ninoxDateOnly(f(ctx, bc, rec, "Lieferdatum")),
      anzahlungBeruecksichtigen: ninoxBool(f(ctx, bc, rec, "Anzahlung berücksichtigen")),
      anzahlungBrutto: ninoxNum(f(ctx, bc, rec, "Anzahlung Brutto")),
      anzahlungDatum: ninoxDateOnly(f(ctx, bc, rec, "Anzahlung Datum")),
      rechnungsbetrag: ninoxNum(f(ctx, bc, rec, "Rechnungsbetrag")),
      zahlungsdatum: ninoxDateOnly(f(ctx, bc, rec, "Zahlungsdatum")),
      zahlbetrag: ninoxNum(f(ctx, bc, rec, "Tatsächlicher Zahlbetrag")),
      zahlungAnBank: BANK[String(f(ctx, bc, rec, "Zahlung an Bank"))] ?? null,
      differenzZahlung: ninoxNum(f(ctx, bc, rec, "Differenz Zahlung_")),
      abzugProzent: ninoxNum(f(ctx, bc, rec, "Abzug in %")),
      gesamtrabattProzent: ninoxNum(f(ctx, bc, rec, "Gesamtrabatt Prozent")) ?? "0",
      gesamtrabattWert: ninoxNum(f(ctx, bc, rec, "Gesamtrabatt Wert")) ?? "0",
      gesamtrabattAktiv: ninoxBool(f(ctx, bc, rec, "Gesamtrabatt gewähren")),
      summeNetto: ninoxNum(f(ctx, bc, rec, "Summe Netto_")),
      summeMwst: ninoxNum(f(ctx, bc, rec, "MwSt. Summe_")),
      summeBrutto: ninoxNum(f(ctx, bc, rec, "Summe Brutto_")),
      reportMonat: ninoxStr(f(ctx, bc, rec, "RGmonat"))
        ?? (ninoxDateOnly(f(ctx, bc, rec, "Rechnungsdatum"))?.slice(0, 7) ?? null),
      bemerkungRechnung: ninoxStr(f(ctx, bc, rec, "Bemerkung Rechnung"))
        ?? ninoxStr(f(ctx, bc, rec, "Bemerkung")),
    });
  }
  // referenz_rechnung_id: X3 (String) -> nummer -> uuid. Wird NACH dem Insert per UPDATE gesetzt
  // (Self-FK: Storno/Gutschrift kann vor dem Original stehen).
  const refUpdates: Array<[string, string]> = [];
  for (const h of headers) {
    const x3 = rawX3.get(h.id as string);
    if (x3) {
      const rid = nummerToId.get(x3) ?? nummerToId.get(`RG-${x3}`);
      if (rid) refUpdates.push([h.id as string, rid]);
    }
  }

  const positions: Record<string, unknown>[] = [];
  if (cc) for (const { f: rec } of ctx.dump.rows(cc)) {
    const rechnungId = ctx.ids.lookup(bc, f(ctx, cc, rec, "RECHNUNGEN") as number);
    if (!rechnungId) continue;
    positions.push({
      rechnungId,
      posNr: ninoxNum(f(ctx, cc, rec, "Pos Nr")),
      artikelId: ctx.ids.lookup(wb, f(ctx, cc, rec, "ARTIKEL AUSWÄHLEN") as number) ?? null,
      artikelName: ninoxStr(f(ctx, cc, rec, "Artikel")),
      artikelBeschreibung: ninoxStr(f(ctx, cc, rec, "Artikelbeschreibung")),
      anzahl: ninoxNum(f(ctx, cc, rec, "Anzahl")) ?? "1",
      einzelpreis: ninoxNum(f(ctx, cc, rec, "Einzelpreis")),
      rabattProzent: ninoxNum(f(ctx, cc, rec, "Rabatt")) ?? "0",
      reRelevant: ninoxBool(f(ctx, cc, rec, "RE_relevant")),
      vkRetailWert: ninoxStr(f(ctx, cc, rec, "VK Retail Wert")),
    });
  }

  await db.delete(s.belegPosition).where(sql`rechnung_id is not null`);
  await db.delete(s.rechnung);
  await insertChunked(s.rechnung, headers);
  for (const [id, rid] of refUpdates) {
    await db.update(s.rechnung).set({ referenzRechnungId: rid }).where(sql`id = ${id}`);
  }
  await insertChunked(s.belegPosition, positions, 500);
  ctx.log(`rechnung ${headers.length} (${refUpdates.length}× Storno/Gutschrift-Bezug), ` +
    `positionen ${positions.length}`);
}

// ========================================================= seriennummer (7w)
export async function importSeriennummer(ctx: Ctx) {
  const a = ctx.dump.typeIdByCaption("Aufträge");
  if (!a) return ctx.log("Typ 'Aufträge' nicht gefunden");

  const snRows: Record<string, unknown>[] = [];
  const auftragUpdates: { auftragId: string; snId: string; vergebenAm: string | null }[] = [];
  const seen = new Set<string>();

  for (const { id, f: rec } of ctx.dump.rows(a)) {
    const lfdRaw = f(ctx, a, rec, "Seriennummer lfd");
    const serStr = ninoxStr(f(ctx, a, rec, "Seriennummer"));
    if (lfdRaw == null && !serStr) continue;
    const lfd = ninoxNum(lfdRaw) != null ? Number(ninoxNum(lfdRaw)) : null;
    // Jahrpräfix aus dem String "4 4809" (Teil vor dem Leerzeichen), sonst aus Bauplandatum-Jahr
    let praefix = serStr && serStr.includes(" ") ? serStr.split(" ")[0].trim() : null;
    if (!praefix) {
      const bp = ninoxDate(f(ctx, a, rec, "Bauplandatum"));
      const jahr = bp ? bp.getUTCFullYear() : new Date().getUTCFullYear();
      praefix = jahr <= 2025 ? String(jahr % 10) : String(jahr % 100);
    }
    const nLfd = lfd ?? (serStr && serStr.includes(" ") ? Number(serStr.split(" ")[1]) : null);
    if (nLfd == null || Number.isNaN(nLfd)) continue;

    const key = `${praefix}|${nLfd}`;
    if (seen.has(key)) continue;           // Alt-Dubletten je (praefix, lfd) überspringen
    seen.add(key);

    const auftragId = ctx.ids.get(a, id);
    const snId = ctx.ids.get(a, id + 9_000_000); // deterministische zweite ID je Auftrag
    const vergebenAm = ninoxDateOnly(f(ctx, a, rec, "SerNr vergeben"));
    snRows.push({
      id: snId,
      lfd: nLfd,
      jahrPraefix: praefix,
      auftragId,
      manuell: ninoxBool(f(ctx, a, rec, "SerNr wurde manuell vergeben")),
      vergebenAm,
      geloescht: false,
    });
    auftragUpdates.push({ auftragId, snId, vergebenAm });
  }

  await db.delete(s.seriennummer);
  await insertChunked(s.seriennummer, snRows, 500);
  for (const u of auftragUpdates) {
    await db.update(s.auftrag)
      .set({ seriennummerId: u.snId, sernrVergebenAm: u.vergebenAm })
      .where(sql`id = ${u.auftragId}`);
  }
  ctx.log(`seriennummer ${snRows.length}, auftrag-verknüpft ${auftragUpdates.length}`);
}
