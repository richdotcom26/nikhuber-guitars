import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  angebot, artikel, auftrag, belegPosition, kunde, rechnung, specBelegung, staat, zaehler,
} from "@/lib/db/schema";
import { SPEC_SLOT_BY_KEY } from "@/lib/specs/slots";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";

export type PosTraeger = "angebot" | "auftrag" | "rechnung";
export type SpecBelegTraeger = "angebot" | "auftrag";

const POS_COL = {
  angebot: belegPosition.angebotId,
  auftrag: belegPosition.auftragId,
  rechnung: belegPosition.rechnungId,
} as const;
const POS_KEY = { angebot: "angebotId", auftrag: "auftragId", rechnung: "rechnungId" } as const;
const SPEC_COL = { angebot: specBelegung.angebotId, auftrag: specBelegung.auftragId } as const;
const SPEC_KEY = { angebot: "angebotId", auftrag: "auftragId" } as const;
const HEAD = { angebot, auftrag, rechnung } as const;

/* -------------------------------------------------------------- Nummernkreis */

const PREFIX = { ANGEBOT: "AN", AUFTRAG: "A", RECHNUNG: "RG" } as const;
type ZaehlerArt = keyof typeof PREFIX;

/**
 * Fortlaufende Belegnummer `PREFIX-JAHR-####`. Transaktional (FOR UPDATE).
 * Initialisiert den Zähler bei Bedarf aus dem höchsten vorhandenen Wert des Jahres
 * (Ninox-Altbestand), damit keine Kollision mit importierten Nummern entsteht.
 */
export async function allocateNummer(art: ZaehlerArt, jahr: number): Promise<string> {
  const prefix = PREFIX[art];
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(zaehler)
      .where(and(eq(zaehler.art, art), eq(zaehler.jahr, jahr)))
      .for("update");

    let stand: number;
    if (rows.length === 0) {
      const head = art === "ANGEBOT" ? angebot : art === "AUFTRAG" ? auftrag : rechnung;
      const [{ maxLfd }] = await tx
        .select({
          maxLfd: sql<number>`coalesce(max(
            (regexp_replace(${head.nummer}, '^[A-Z]+-\\d{4}-', ''))::int
          ), 0)`,
        })
        .from(head)
        .where(sql`${head.nummer} ~ ('^' || ${prefix} || '-' || ${jahr}::text || '-\\d+$')`);
      stand = (maxLfd ?? 0) + 1;
      await tx.insert(zaehler).values({ art, jahr, stand });
    } else {
      stand = rows[0].stand + 1;
      await tx.update(zaehler).set({ stand }).where(and(eq(zaehler.art, art), eq(zaehler.jahr, jahr)));
    }
    return `${prefix}-${jahr}-${String(stand).padStart(4, "0")}`;
  });
}

/* ------------------------------------------------------------- KD-Snapshot */

/** Kunden-Snapshot-Felder für den Belegkopf (eingefroren beim Kundenwählen). */
export async function kdSnapshot(kundeId: string) {
  const [k] = await db.select().from(kunde).where(eq(kunde.id, kundeId));
  if (!k) throw new DomainError("NOT_FOUND", "Kunde nicht gefunden.");
  let staatName: string | null = null;
  if (k.staatId) {
    const [s] = await db.select({ name: staat.name }).from(staat).where(eq(staat.id, k.staatId));
    staatName = s?.name ?? null;
  }
  const name = k.firma?.trim() || [k.vorname, k.nachname].filter(Boolean).join(" ").trim();
  const briefkopf = k.briefkopfManuell?.trim()
    || [name, k.strasse, [k.plz, k.ort].filter(Boolean).join(" "), staatName].filter(Boolean).join("\n");
  return {
    kundeId: k.id,
    kdFirma: k.firma,
    kdVorname: k.vorname,
    kdNachname: k.nachname,
    kdStrasse: k.strasse,
    kdPlz: k.plz,
    kdOrt: k.ort,
    kdStaatId: k.staatId,
    kdRegion: k.region,
    kdWaehrung: k.waehrung,
    kdSprache: k.sprache,
    kdUstId: k.ustIdNr,
    kdSteuerpflichtig: k.steuerpflichtig,
    kdVertriebsweg: k.vertriebsweg,
    kdSonderrabattProzent: k.sonderrabattProzent,
    kdBriefkopf: briefkopf,
  };
}

/* ------------------------------------------------------------------ Positionen */

export async function listPositionen(traeger: PosTraeger, traegerId: string) {
  return db
    .select()
    .from(belegPosition)
    .where(eq(POS_COL[traeger], traegerId))
    .orderBy(
      sql`${belegPosition.posNr} is null`,
      asc(belegPosition.posNr),
      asc(belegPosition.createdAt),
    );
}

export interface PositionInput {
  artikelId?: string | null;
  artikelName?: string | null;
  artikelBeschreibung?: string | null;
  anzahl: number;
  einzelpreis?: number | null;
  rabattProzent?: number;
  reRelevant?: boolean;
  herkunftSlotKey?: string | null;
}

export async function addPosition(traeger: PosTraeger, traegerId: string, input: PositionInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.insert(belegPosition).values({
    [POS_KEY[traeger]]: traegerId,
    artikelId: input.artikelId ?? null,
    artikelName: input.artikelName ?? null,
    artikelBeschreibung: input.artikelBeschreibung ?? null,
    anzahl: String(input.anzahl),
    einzelpreis: input.einzelpreis == null ? null : String(input.einzelpreis),
    rabattProzent: String(input.rabattProzent ?? 0),
    reRelevant: input.reRelevant ?? true,
    herkunftSlotKey: input.herkunftSlotKey ?? null,
    createdBy: user.id,
    updatedBy: user.id,
  });
  await renumberPositionen(traeger, traegerId);
  await recomputeSummen(traeger, traegerId);
}

export async function updatePosition(
  traeger: PosTraeger,
  traegerId: string,
  posId: string,
  patch: Partial<{ anzahl: number; einzelpreis: number | null; rabattProzent: number; reRelevant: boolean; artikelName: string | null; artikelBeschreibung: string | null }>,
) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const set: Record<string, unknown> = { updatedAt: new Date(), updatedBy: user.id };
  if (patch.anzahl != null) set.anzahl = String(patch.anzahl);
  if ("einzelpreis" in patch) set.einzelpreis = patch.einzelpreis == null ? null : String(patch.einzelpreis);
  if (patch.rabattProzent != null) set.rabattProzent = String(patch.rabattProzent);
  if (patch.reRelevant != null) set.reRelevant = patch.reRelevant;
  if ("artikelName" in patch) set.artikelName = patch.artikelName;
  if ("artikelBeschreibung" in patch) set.artikelBeschreibung = patch.artikelBeschreibung;
  const res = await db
    .update(belegPosition)
    .set(set)
    .where(and(eq(belegPosition.id, posId), eq(POS_COL[traeger], traegerId)))
    .returning({ id: belegPosition.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Position nicht gefunden.");
  await renumberPositionen(traeger, traegerId);
  await recomputeSummen(traeger, traegerId);
}

export async function deletePosition(traeger: PosTraeger, traegerId: string, posId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(belegPosition).where(and(eq(belegPosition.id, posId), eq(POS_COL[traeger], traegerId)));
  await renumberPositionen(traeger, traegerId);
  await recomputeSummen(traeger, traegerId);
}

export async function deleteAllePositionen(traeger: PosTraeger, traegerId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  await db.delete(belegPosition).where(eq(POS_COL[traeger], traegerId));
  await recomputeSummen(traeger, traegerId);
}

/** `pos_nr` = 1,2,3… für RE-relevante Zeilen (Reihenfolge wie Liste), Rest null. */
export async function renumberPositionen(traeger: PosTraeger, traegerId: string) {
  const rows = await listPositionen(traeger, traegerId);
  let n = 0;
  for (const r of rows) {
    const soll = r.reRelevant ? ++n : null;
    if (r.posNr !== soll) {
      await db.update(belegPosition).set({ posNr: soll }).where(eq(belegPosition.id, r.id));
    }
  }
}

/* -------------------------------------------------------------- Preis-Tier */

type ArtikelPreis = {
  vkEur: string | null; vkUs: string | null;
  vkEurNet: string | null; net1: string | null; net2: string | null; netUs: string | null;
};

/** Einzelpreis nach Vertriebsweg (§6). Sonderrabatt hat Vorrang. */
export function tierPreis(
  a: ArtikelPreis,
  vertriebsweg: string | null,
  kdWaehrung: string | null,
  sonderrabattProzent: string | null,
): number | null {
  const n = (v: string | null) => (v == null ? null : Number(v));
  const sr = n(sonderrabattProzent);
  if (sr != null && sr !== 0) {
    const base = kdWaehrung === "USD" ? n(a.vkUs) : n(a.vkEurNet);
    return base == null ? null : Math.round(base * (1 - sr / 100) * 100) / 100;
  }
  switch (vertriebsweg) {
    case "NET1": return n(a.net1);
    case "NET2": return n(a.net2);
    case "NET_US": return n(a.netUs);
    case "VK_US": return n(a.vkUs);
    case "VK_EUR": return n(a.vkEurNet);
    default: return n(a.vkEurNet);
  }
}

/* --------------------------------------------------------- Modellvorlage */

/**
 * Modell-Default-Specs auf Angebot/Auftrag kopieren (Snapshot per Value, ex „Vorlage übernehmen").
 * `overwrite` nötig, wenn schon eine Vorlage gesetzt ist.
 */
export async function applyModellvorlage(
  traeger: SpecBelegTraeger,
  traegerId: string,
  modellArtikelId: string,
  overwrite = false,
) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");
  if (h.modellArtikelId && h.modellArtikelId !== modellArtikelId && !overwrite) {
    throw new DomainError("CONFLICT", "Es ist bereits eine Modellvorlage gesetzt. Zum Ersetzen bestätigen.");
  }
  const [m] = await db.select().from(artikel).where(eq(artikel.id, modellArtikelId));
  if (!m || m.artikelgruppe !== "MODEL") throw new DomainError("VALIDATION", "Kein Modell-Artikel.");

  const modellSpecs = await db
    .select()
    .from(specBelegung)
    .where(eq(specBelegung.modellArtikelId, modellArtikelId));

  await db.transaction(async (tx) => {
    await tx.delete(specBelegung).where(eq(SPEC_COL[traeger], traegerId));
    if (modellSpecs.length) {
      await tx.insert(specBelegung).values(
        modellSpecs.map((s) => ({
          [SPEC_KEY[traeger]]: traegerId,
          slotKey: s.slotKey,
          artikelId: s.artikelId,
          aufpreis: s.aufpreis,
          reihenfolge: s.reihenfolge,
          createdBy: user.id,
          updatedBy: user.id,
        })),
      );
    }
    await tx
      .update(head)
      .set({
        modellArtikelId,
        freitextBody: m.freitextBody,
        freitextColour: m.freitextColour,
        freitextNeck: m.freitextNeck,
        freitextAssembly: m.freitextAssembly,
        updatedAt: new Date(),
        updatedBy: user.id,
      })
      .where(eq(head.id, traegerId));
  });
}

/* --------------------------------------------------- Positionen generieren */

function colourSetAnzahl(name: string | null | undefined): number {
  if (!name) return 1;
  const m = name.match(/(\d)\s*x/i);
  return m ? Math.min(Math.max(Number(m[1]), 1), 9) : 1;
}

/**
 * Positionen aus den Specs erzeugen (ex „Angebotspositionen aus Details generieren", Schritt 3).
 * Löscht vorhandene Positionen. Einzelpreise nach Vertriebsweg eingefroren.
 */
export async function generatePositionen(traeger: SpecBelegTraeger, traegerId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");
  if (!h.modellArtikelId) throw new DomainError("STATE", "Keine Modellvorlage gewählt.");
  if (!h.kundeId) throw new DomainError("STATE", "Kein Kunde gewählt.");

  const specs = await db
    .select({
      slotKey: specBelegung.slotKey,
      reihenfolge: specBelegung.reihenfolge,
      aufpreis: specBelegung.aufpreis,
      artikelId: specBelegung.artikelId,
      nameBelege: artikel.nameBelege,
      beschreibung: artikel.beschreibung,
      vkEur: artikel.vkEur, vkUs: artikel.vkUs,
      vkEurNet: artikel.vkEurNet, net1: artikel.net1, net2: artikel.net2, netUs: artikel.netUs,
    })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(eq(SPEC_COL[traeger], traegerId));

  const [modell] = await db.select().from(artikel).where(eq(artikel.id, h.modellArtikelId));

  const vw = h.kdVertriebsweg;
  const wg = h.kdWaehrung;
  const sr = h.kdSonderrabattProzent;
  const colourSetRow = specs.find((s) => s.slotKey === "colour_set");
  const colourAnzahl = colourSetAnzahl(colourSetRow?.nameBelege);

  const order = (k: string) => SPEC_SLOT_BY_KEY[k]?.order ?? 999;
  specs.sort((a, b) => order(a.slotKey) - order(b.slotKey) || a.reihenfolge - b.reihenfolge);

  await db.transaction(async (tx) => {
    await tx.delete(belegPosition).where(eq(POS_COL[traeger], traegerId));

    const rows: (typeof belegPosition.$inferInsert)[] = [];

    if (modell) {
      const preis = tierPreis(modell, vw, wg, sr);
      rows.push({
        [POS_KEY[traeger]]: traegerId,
        artikelId: modell.id,
        artikelName: modell.nameBelege,
        artikelBeschreibung: modell.beschreibung,
        anzahl: "1",
        einzelpreis: preis == null ? null : String(preis),
        rabattProzent: "0",
        reRelevant: true,
        herkunftSlotKey: "modell",
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    for (const s of specs) {
      const slot = SPEC_SLOT_BY_KEY[s.slotKey];
      const multi = slot?.multi ?? false;
      const anzahl = s.slotKey === "colour" ? colourAnzahl : 1;
      const preis = tierPreis(s, vw, wg, sr);
      rows.push({
        [POS_KEY[traeger]]: traegerId,
        artikelId: s.artikelId,
        artikelName: s.nameBelege,
        artikelBeschreibung: multi ? null : s.beschreibung,
        anzahl: String(anzahl),
        einzelpreis: preis == null ? null : String(preis),
        rabattProzent: "0",
        reRelevant: multi ? true : s.aufpreis,
        vkRetailWert: (() => {
          const base = (vw === "NET_US" || vw === "VK_US") ? Number(s.vkUs ?? 0) : Number(s.vkEur ?? 0);
          return String(Math.round(base * anzahl * 100) / 100);
        })(),
        herkunftSlotKey: s.slotKey,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    if (rows.length) await tx.insert(belegPosition).values(rows);
  });

  await renumberPositionen(traeger, traegerId);
  await recomputeSummen(traeger, traegerId);
  await db
    .update(head)
    .set({ positionenAnzeigen: true, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(head.id, traegerId));
}

/* --------------------------------------------------------------------- Summen */

export async function recomputeSummen(traeger: PosTraeger, traegerId: string) {
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) return;

  const [{ summe }] = await db
    .select({
      summe: sql<string>`coalesce(sum(${belegPosition.gesamtpreis}) filter (where ${belegPosition.reRelevant}), 0)`,
    })
    .from(belegPosition)
    .where(eq(POS_COL[traeger], traegerId));

  const summePositionen = Number(summe);
  const rabattProzent = Number(h.gesamtrabattProzent ?? 0);
  const gesamtrabattWert = h.gesamtrabattAktiv
    ? Math.round(summePositionen * (rabattProzent / 100) * 100) / 100
    : 0;
  const summeNetto = Math.round((summePositionen - gesamtrabattWert) * 100) / 100;

  const fs = await getFirmaSetting();
  const mwstSatz = Number(fs.mwstSatz);
  const summeMwst = h.kdSteuerpflichtig
    ? Math.round(summeNetto * (mwstSatz / 100) * 100) / 100
    : 0;
  const summeBrutto = Math.round((summeNetto + summeMwst) * 100) / 100;

  await db
    .update(head)
    .set({
      summePositionen: String(summePositionen),
      gesamtrabattWert: String(gesamtrabattWert),
      summeNetto: String(summeNetto),
      summeMwst: String(summeMwst),
      summeBrutto: String(summeBrutto),
    })
    .where(eq(head.id, traegerId));
}

/** Gesamtrabatt setzen (Prozent ODER Wert; das jeweils andere wird berechnet). */
export async function setGesamtrabatt(
  traeger: "auftrag" | "rechnung",
  traegerId: string,
  input: { aktiv: boolean; prozent?: number | null; wert?: number | null },
) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");
  const summePositionen = Number(h.summePositionen ?? 0);

  let prozent = Number(h.gesamtrabattProzent ?? 0);
  if (input.prozent != null) prozent = input.prozent;
  else if (input.wert != null && summePositionen > 0) prozent = Math.round((input.wert * 100 / summePositionen) * 1000) / 1000;

  await db
    .update(head)
    .set({
      gesamtrabattAktiv: input.aktiv,
      gesamtrabattProzent: String(prozent),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(head.id, traegerId));
  await recomputeSummen(traeger, traegerId);
}

/* --------------------------------------------------- Angebot → Auftrag (7e) */

export async function angebotToAuftrag(angebotId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(angebot).where(eq(angebot.id, angebotId));
  if (!a) throw new DomainError("NOT_FOUND", "Angebot nicht gefunden.");

  const jahr = new Date().getFullYear();
  const nummer = await allocateNummer("AUFTRAG", jahr);

  const specs = await db.select().from(specBelegung).where(eq(specBelegung.angebotId, angebotId));
  const positionen = await db
    .select()
    .from(belegPosition)
    .where(and(eq(belegPosition.angebotId, angebotId), eq(belegPosition.reRelevant, true)));

  const auftragId = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(auftrag)
      .values({
        nummer,
        angebotId,
        auftragsart: "PRODUKTION",
        status: "BACKORDER",
        auftragsdatum: new Date().toISOString().slice(0, 10),
        kundeId: a.kundeId,
        kdFirma: a.kdFirma, kdVorname: a.kdVorname, kdNachname: a.kdNachname,
        kdStrasse: a.kdStrasse, kdPlz: a.kdPlz, kdOrt: a.kdOrt, kdStaatId: a.kdStaatId,
        kdRegion: a.kdRegion, kdWaehrung: a.kdWaehrung, kdSprache: a.kdSprache,
        kdUstId: a.kdUstId, kdSteuerpflichtig: a.kdSteuerpflichtig,
        kdVertriebsweg: a.kdVertriebsweg, kdSonderrabattProzent: a.kdSonderrabattProzent,
        kdBriefkopf: a.kdBriefkopf,
        modellArtikelId: a.modellArtikelId,
        freitextBody: a.freitextBody, freitextColour: a.freitextColour,
        freitextNeck: a.freitextNeck, freitextAssembly: a.freitextAssembly,
        positionenAnzeigen: true,
        createdBy: user.id, updatedBy: user.id,
      })
      .returning({ id: auftrag.id });

    if (specs.length) {
      await tx.insert(specBelegung).values(
        specs.map((s) => ({
          auftragId: neu.id,
          slotKey: s.slotKey,
          artikelId: s.artikelId,
          aufpreis: s.aufpreis,
          reihenfolge: s.reihenfolge,
          createdBy: user.id,
          updatedBy: user.id,
        })),
      );
    }
    if (positionen.length) {
      await tx.insert(belegPosition).values(
        positionen.map((p) => ({
          auftragId: neu.id,
          posNr: p.posNr,
          artikelId: p.artikelId,
          artikelName: p.artikelName,
          artikelBeschreibung: p.artikelBeschreibung,
          anzahl: p.anzahl,
          einzelpreis: p.einzelpreis,
          rabattProzent: p.rabattProzent,
          reRelevant: p.reRelevant,
          vkRetailWert: p.vkRetailWert,
          herkunftSlotKey: p.herkunftSlotKey,
          createdBy: user.id, updatedBy: user.id,
        })),
      );
    }

    await tx
      .update(angebot)
      .set({ status: "AUFTRAG", updatedAt: new Date(), updatedBy: user.id })
      .where(eq(angebot.id, angebotId));

    return neu.id;
  });

  await recomputeSummen("auftrag", auftragId);
  return auftragId;
}

/* --------------------------------------------------- Artikel-Picker (Positionen) */

/** Einzelnen Artikel mit Preis-/Snapshot-Feldern laden (für „Neue Position"). */
export async function getArtikelForPosition(id: string) {
  const [a] = await db
    .select({
      id: artikel.id,
      name: sql<string>`coalesce(${artikel.nameBelege}, ${artikel.nameLang}, '')`,
      beschreibung: artikel.beschreibung,
      vkEur: artikel.vkEur, vkUs: artikel.vkUs,
      vkEurNet: artikel.vkEurNet, net1: artikel.net1, net2: artikel.net2, netUs: artikel.netUs,
    })
    .from(artikel)
    .where(eq(artikel.id, id));
  return a ?? null;
}

/** Aktive Artikel für den „Neue Position"-Picker (kein Modell). */
export async function positionArtikelSuche(q: string, limit = 30) {
  if (!q.trim()) return [];
  const like = `%${q.trim()}%`;
  return db
    .select({
      id: artikel.id,
      name: sql<string>`coalesce(${artikel.nameBelege}, ${artikel.nameLang}, '')`,
      artikelNr: artikel.artikelNr,
      vkEur: artikel.vkEur, vkUs: artikel.vkUs,
      vkEurNet: artikel.vkEurNet, net1: artikel.net1, net2: artikel.net2, netUs: artikel.netUs,
      beschreibung: artikel.beschreibung,
    })
    .from(artikel)
    .where(sql`${artikel.deletedAt} is null and ${artikel.datensatzInaktiv} = false
      and (${artikel.nameBelege} ilike ${like} or ${artikel.nameLang} ilike ${like} or ${artikel.artikelNr} ilike ${like})`)
    .orderBy(asc(sql`lower(coalesce(${artikel.nameBelege}, ${artikel.nameLang}, ''))`))
    .limit(limit);
}
