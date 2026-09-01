import { db } from "../db";
import * as s from "../db/schema";
import { sql } from "drizzle-orm";
import { IdMap } from "./idmap";
import {
  NinoxDump, ninoxBool, ninoxDateOnly, ninoxNum, ninoxStr,
} from "./ninox";

/**
 * Import-Pässe (Ninox -> Supabase). Reihenfolge in scripts/import.ts.
 * Jeder Pass ist idempotent: upsert über einen stabilen Schlüssel; UUID kommt aus der IdMap.
 *
 * Status: staat / zahlungsbedingung / holzart implementiert. Rest = TODO (Skelett unten).
 */
export interface Ctx {
  dump: NinoxDump;
  ids: IdMap;
  log: (msg: string) => void;
}

// helper: Ninox-Feldwert eines Datensatzes per FELD-CAPTION lesen
function field(ctx: Ctx, typeId: string, rec: Record<string, unknown>, caption: string): unknown {
  const fid = ctx.dump.fieldIdByCaption(typeId, caption);
  return fid ? rec[fid] : undefined;
}

// --------------------------------------------------------------- zahlungsbedingung
export async function importZahlungsbedingung(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Zahlungsbedingungen");
  if (!tid) return ctx.log("Zahlungsbedingungen: Typ nicht gefunden");
  const rows = ctx.dump.rows(tid);
  const values = rows.map(({ id, f }) => {
    const uuid = ctx.ids.get(tid, id);
    ctx.ids.alias(`zb_ninoxid:${id}`, uuid);
    return {
      id: uuid,
      bezeichnung: ninoxStr(field(ctx, tid, f, "Bezeichnung")) ?? `#${id}`,
      bezeichnungEn: ninoxStr(field(ctx, tid, f, "Bezeichnung EN")),
    };
  });
  if (values.length) {
    await db.insert(s.zahlungsbedingung).values(values).onConflictDoUpdate({
      target: s.zahlungsbedingung.id,
      set: { bezeichnung: sql`excluded.bezeichnung`, bezeichnungEn: sql`excluded.bezeichnung_en` },
    });
  }
  ctx.log(`zahlungsbedingung: ${values.length}`);
}

// --------------------------------------------------------------- staat
const REGION: Record<string, "D" | "EU" | "WELT" | "ASIEN" | "USA"> = {
  "1": "D", "2": "EU", "3": "WELT", "4": "ASIEN", "5": "USA",
};
const SPRACHE: Record<string, "DE" | "EN"> = { "1": "DE", "2": "EN" };
const WAEHRUNG: Record<string, "EUR" | "USD"> = { "1": "EUR", "2": "USD" };

export async function importStaat(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("Staaten");
  if (!tid) return ctx.log("Staaten: Typ nicht gefunden");
  const rows = ctx.dump.rows(tid);
  let unresolvedZb = 0;
  const values = rows.map(({ id, f }) => {
    const uuid = ctx.ids.get(tid, id);
    const zbRaw = field(ctx, tid, f, "Zahlungsbedingungen");
    const zbId = zbRaw != null
      ? ctx.ids.aliasLookup(`zb_ninoxid:${zbRaw}`) ?? ctx.ids.lookup("ED", zbRaw as number)
      : undefined;
    if (zbRaw != null && !zbId) unresolvedZb++;
    return {
      id: uuid,
      kuerzel: ninoxStr(field(ctx, tid, f, "Länderkürzel")),
      name: ninoxStr(field(ctx, tid, f, "Staat")) ?? `#${id}`,
      region: REGION[String(field(ctx, tid, f, "Region"))] ?? "WELT",
      defaultSprache: SPRACHE[String(field(ctx, tid, f, "Sprache"))] ?? null,
      defaultWaehrung: WAEHRUNG[String(field(ctx, tid, f, "Währung"))] ?? null,
      defaultZahlungsbedingungId: zbId ?? null,
    };
  });
  if (values.length) {
    await db.insert(s.staat).values(values).onConflictDoUpdate({
      target: s.staat.id,
      set: {
        kuerzel: sql`excluded.kuerzel`, name: sql`excluded.name`, region: sql`excluded.region`,
        defaultSprache: sql`excluded.default_sprache`, defaultWaehrung: sql`excluded.default_waehrung`,
        defaultZahlungsbedingungId: sql`excluded.default_zahlungsbedingung_id`,
      },
    });
  }
  ctx.log(`staat: ${values.length}${unresolvedZb ? ` (${unresolvedZb}× Zahlungsbedingung unaufgelöst)` : ""}`);
}

// --------------------------------------------------------------- holzart
export async function importHolzart(ctx: Ctx) {
  const tid = ctx.dump.typeIdByCaption("NKS Holzarten");
  if (!tid) return ctx.log("NKS Holzarten: Typ nicht gefunden");
  const rows = ctx.dump.rows(tid);
  const values = rows.map(({ id, f }) => ({
    id: ctx.ids.get(tid, id),
    holz: ninoxStr(field(ctx, tid, f, "Holz")) ?? `#${id}`,
    botanischerName: ninoxStr(field(ctx, tid, f, "Botanischer Name")),
    herkunft: ninoxStr(field(ctx, tid, f, "Herkunft")),
    holzdichte: ninoxNum(field(ctx, tid, f, "Holzdichte")),
    species: ninoxStr(field(ctx, tid, f, "Species")),
    genus: ninoxStr(field(ctx, tid, f, "Genus")),
    info: ninoxStr(field(ctx, tid, f, "Info")),
  }));
  if (values.length) {
    await db.insert(s.holzart).values(values).onConflictDoUpdate({
      target: s.holzart.id,
      set: {
        holz: sql`excluded.holz`, botanischerName: sql`excluded.botanischer_name`,
        herkunft: sql`excluded.herkunft`, holzdichte: sql`excluded.holzdichte`,
        species: sql`excluded.species`, genus: sql`excluded.genus`, info: sql`excluded.info`,
      },
    });
  }
  ctx.log(`holzart: ${values.length}`);
}

// --------------------------------------------------------------- TODO-Skelette
export async function importArtikel(_ctx: Ctx) {
  // Ninox "Artikel" (WB). Kern der Migration.
  // Mapping: K=artikelgruppe, R=artikeltyp(->HOLZ/HANDELSWARE/null), A=name_kurz, X=name_belege,
  //   L1=beschreibung, G=vk_eur, C2=vk_us, Y5=brutto_fuer_netto, Q5=nicht_rabattierfaehig,
  //   D2/U3=ek, U1=lieferant(ref MC), LE=geschuetztes_holz_cites, SF=holzart(ref TF),
  //   T7=nr_lfd, B4=artikel_nr, YC=datensatz_inaktiv, G6=schreibgeschuetzt, Z7=modelselect(dmulti).
  // ids.alias(`artikel_nr:<T7>`, uuid) fürs Spec-Slot-Auflösen!
  _ctx.log("artikel: TODO");
}

export async function importKunde(_ctx: Ctx) {
  _ctx.log("kunde: TODO");
}

export async function importModellSpecs(_ctx: Ctx) {
  _ctx.log("modell-specs: TODO");
}

export async function importAngebote(_ctx: Ctx) {
  _ctx.log("angebote: TODO");
}

export async function importAuftraege(_ctx: Ctx) {
  _ctx.log("auftraege: TODO");
}

export async function importRechnungen(_ctx: Ctx) {
  _ctx.log("rechnungen: TODO");
}
