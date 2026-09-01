import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Persistente Zuordnung Ninox-ID -> neue UUID (damit Wiederholungsläufe stabil sind
 * und Referenzen tabellenübergreifend aufgelöst werden können).
 * Schlüssel: "<ninoxTypeId>:<ninoxRecordId>"  bzw. für nr_lfd-Referenzen "artikel_nr:<nr>".
 */
export class IdMap {
  private map = new Map<string, string>();
  private dirty = false;

  constructor(private file: string) {
    if (existsSync(file)) {
      const obj = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
      for (const [k, v] of Object.entries(obj)) this.map.set(k, v);
    }
  }

  /** UUID für einen Ninox-Datensatz holen/erzeugen. */
  get(ninoxType: string, ninoxId: number | string): string {
    const k = `${ninoxType}:${ninoxId}`;
    let v = this.map.get(k);
    if (!v) { v = crypto.randomUUID(); this.map.set(k, v); this.dirty = true; }
    return v;
  }

  /** Vorhandene UUID nachschlagen (kein Anlegen); undefined wenn unbekannt. */
  lookup(ninoxType: string, ninoxId: number | string | null | undefined): string | undefined {
    if (ninoxId == null || ninoxId === "") return undefined;
    return this.map.get(`${ninoxType}:${ninoxId}`);
  }

  /** Freien alternativen Schlüssel setzen (z. B. artikel_nr -> uuid). */
  alias(key: string, uuid: string) {
    if (this.map.get(key) !== uuid) { this.map.set(key, uuid); this.dirty = true; }
  }
  aliasLookup(key: string): string | undefined {
    return this.map.get(key);
  }

  save() {
    if (!this.dirty) return;
    const obj: Record<string, string> = {};
    for (const [k, v] of this.map) obj[k] = v;
    writeFileSync(this.file, JSON.stringify(obj, null, 0));
    this.dirty = false;
  }
}
