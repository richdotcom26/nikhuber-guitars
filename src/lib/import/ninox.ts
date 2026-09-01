import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Parser für den Ninox-Backup `data.db` (Append-Log, eine Zeile pro Ereignis).
 *
 *   Zeile 1:  s:{ "seq":…, "types":{…}, … }            -> Schema
 *   U<Typ><Id>:{…}                                     -> Datensatz-Snapshot (letzter gewinnt)
 *   D<Typ><Id>:{…}                                     -> Löschung
 *   V<Id>:{…}                                          -> View (ignoriert)
 *
 * Feld-Keys in den Datensätzen sind Ninox-Feld-IDs; `_cd/_cu/_md/_mu` = created/modified-Meta.
 */

export type NinoxRecord = Record<string, unknown> & {
  _cd?: number; _cu?: string; _md?: number; _mu?: string;
};

export interface NinoxField {
  base?: string;
  caption?: string;
  values?: Record<string, { caption: string }>;   // choice
  refTypeId?: string;
  refFieldId?: string;
  fn?: string;
}

export interface NinoxType {
  caption?: string;
  fields: Record<string, NinoxField>;
  kind?: string;
  hidden?: boolean;
}

export interface NinoxSchema {
  seq: number;
  version: number;
  types: Record<string, NinoxType>;
}

export interface NinoxDump {
  schema: NinoxSchema;
  /** typeId -> (recordId -> fields) */
  records: Map<string, Map<number, NinoxRecord>>;
  typeIdByCaption(caption: string): string | undefined;
  fieldIdByCaption(typeId: string, caption: string): string | undefined;
  choiceMap(typeId: string, fieldCaption: string): Record<string, string>; // ninoxValue -> caption
  rows(typeIdOrCaption: string): Array<{ id: number; f: NinoxRecord }>;
}

const U_RE = /^U([A-Z]{1,2})(\d+)$/;
const D_RE = /^D([A-Z]{1,2})(\d+)$/;

export async function parseNinoxDump(path: string): Promise<NinoxDump> {
  const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  let schema: NinoxSchema | undefined;
  const records = new Map<string, Map<number, NinoxRecord>>();
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    const key = line.slice(0, colon);
    const rest = line.slice(colon + 1);

    if (lineNo === 1 && key === "s") {
      schema = JSON.parse(rest) as NinoxSchema;
      continue;
    }

    const um = U_RE.exec(key);
    if (um) {
      const [, typeId, idStr] = um;
      const id = Number(idStr);
      let byId = records.get(typeId);
      if (!byId) { byId = new Map(); records.set(typeId, byId); }
      try {
        byId.set(id, JSON.parse(rest) as NinoxRecord);
      } catch {
        // defekte Zeile überspringen
      }
      continue;
    }

    const dm = D_RE.exec(key);
    if (dm) {
      const [, typeId, idStr] = dm;
      records.get(typeId)?.delete(Number(idStr));
      continue;
    }
    // V… (Views) und alles andere: ignorieren
  }

  if (!schema) throw new Error(`Kein Schema in ${path} (Zeile 1 nicht 's:')`);

  const captionToTypeId = new Map<string, string>();
  for (const [tid, t] of Object.entries(schema.types)) {
    if (t.caption) captionToTypeId.set(t.caption, tid);
  }

  const dump: NinoxDump = {
    schema,
    records,
    typeIdByCaption: (c) => captionToTypeId.get(c),
    fieldIdByCaption(typeId, caption) {
      const t = schema!.types[typeId];
      if (!t) return undefined;
      for (const [fid, f] of Object.entries(t.fields)) {
        if (f.caption === caption) return fid;
      }
      return undefined;
    },
    choiceMap(typeId, fieldCaption) {
      const fid = dump.fieldIdByCaption(typeId, fieldCaption);
      const f = fid ? schema!.types[typeId]?.fields[fid] : undefined;
      const out: Record<string, string> = {};
      if (f?.values) for (const [v, o] of Object.entries(f.values)) out[v] = o.caption;
      return out;
    },
    rows(typeIdOrCaption) {
      const tid = schema!.types[typeIdOrCaption]
        ? typeIdOrCaption
        : captionToTypeId.get(typeIdOrCaption);
      if (!tid) return [];
      const byId = records.get(tid);
      if (!byId) return [];
      return [...byId.entries()].map(([id, f]) => ({ id, f }));
    },
  };
  return dump;
}

// ---------------------------------------------------------------------------

/** Ninox-Datum: ms-Timestamp oder ISO-String -> JS Date | null */
export function ninoxDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v.length <= 10 ? v + "T00:00:00Z" : v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Ninox-Datum -> 'YYYY-MM-DD' (für Postgres `date`) */
export function ninoxDateOnly(v: unknown): string | null {
  const d = ninoxDate(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

export function ninoxNum(v: unknown): string | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

export function ninoxBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

export function ninoxStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
