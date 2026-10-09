import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  angebot, artikel, auftrag, belegPosition, kunde, rechnung, rechnungAnzahlung, specBelegung, staat, zaehler,
} from "@/lib/db/schema";
import { SPEC_SLOT_BY_KEY } from "@/lib/specs/slots";
import { berechneBriefkopf } from "@/lib/adressen-shared";
import { abrechnungsStand, assertAuftragPositionenAenderbar, versandBerechnet } from "./abrechnung";
import { computeTiers } from "./artikel";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";
import { getFirmaSetting } from "./stammdaten";
import { heuteBerlin, jahrBerlin } from "@/lib/utils";

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

/** Drizzle-Transaktion (für Funktionen, die innerhalb einer laufenden Transaktion arbeiten). */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Fortlaufende Belegnummer `PREFIX-JAHR-####` (FOR UPDATE auf den Zähler → keine Doppelvergabe).
 * Die laufende Nummer läuft wie in Ninox über Jahresgrenzen weiter: ein neuer Jahres-Zähler
 * startet beim höchsten vorhandenen Wert aller Jahre (inkl. Altbestand).
 * `prefix` überschreibt das Präfix (ST- für Storno/Korrektur teilt sich den RECHNUNG-Zähler).
 * Mit `tx` läuft die Vergabe in der Transaktion des Aufrufers (z. B. Buchen) — scheitert die,
 * wird auch die Nummer zurückgerollt (keine Lücke).
 */
export async function allocateNummer(
  art: ZaehlerArt,
  jahr: number,
  opts: { tx?: Tx; prefix?: string } = {},
): Promise<string> {
  const run = async (tx: Tx) => {
    const rows = await tx
      .select()
      .from(zaehler)
      .where(and(eq(zaehler.art, art), eq(zaehler.jahr, jahr)))
      .for("update");

    let stand: number;
    if (rows.length === 0) {
      const head = art === "ANGEBOT" ? angebot : art === "AUFTRAG" ? auftrag : rechnung;
      const [{ maxLfd }] = await tx
        .select({ maxLfd: sql<number>`coalesce(max(substring(${head.nummer} from '(\\d+)$')::int), 0)` })
        .from(head)
        .where(sql`${head.nummer} ~ '-\\d{4}-\\d+$'`);
      const [{ maxZ }] = await tx
        .select({ maxZ: sql<number>`coalesce(max(${zaehler.stand}), 0)` })
        .from(zaehler)
        .where(eq(zaehler.art, art));
      stand = Math.max(Number(maxLfd ?? 0), Number(maxZ ?? 0)) + 1;
      await tx.insert(zaehler).values({ art, jahr, stand });
    } else {
      stand = rows[0].stand + 1;
      await tx.update(zaehler).set({ stand }).where(and(eq(zaehler.art, art), eq(zaehler.jahr, jahr)));
    }
    return `${opts.prefix ?? PREFIX[art]}-${jahr}-${String(stand).padStart(4, "0")}`;
  };
  return opts.tx ? run(opts.tx) : db.transaction(run);
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
  const briefkopf = berechneBriefkopf({
    firma: k.firma,
    vorname: k.vorname,
    nachname: k.nachname,
    strasse: k.strasse,
    adresszusatz: k.adresszusatz,
    plz: k.plz,
    ort: k.ort,
    staatName,
    istInland: k.region === "D",
    briefkopfManuell: k.briefkopfManuell,
  });
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
  if (traeger === "auftrag") await assertAuftragPositionenAenderbar(traegerId, { art: "neu" });
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
  if (traeger === "auftrag") {
    const [alt] = await db
      .select({ einzelpreis: belegPosition.einzelpreis, rabattProzent: belegPosition.rabattProzent })
      .from(belegPosition)
      .where(eq(belegPosition.id, posId));
    const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));
    const preisOderRabatt = !!alt && (
      ("einzelpreis" in patch && num(patch.einzelpreis) !== num(alt.einzelpreis))
      || (patch.rabattProzent != null && num(patch.rabattProzent) !== num(alt.rabattProzent))
    );
    await assertAuftragPositionenAenderbar(traegerId, {
      art: "aendern", posId, anzahl: patch.anzahl, preisOderRabatt,
    });
  }
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
  if (traeger === "auftrag") await assertAuftragPositionenAenderbar(traegerId, { art: "loeschen", posId });
  await db.delete(belegPosition).where(and(eq(belegPosition.id, posId), eq(POS_COL[traeger], traegerId)));
  await renumberPositionen(traeger, traegerId);
  await recomputeSummen(traeger, traegerId);
}

export async function deleteAllePositionen(traeger: PosTraeger, traegerId: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (traeger === "auftrag") await assertAuftragPositionenAenderbar(traegerId, { art: "ganz" });
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

export type PreisMargen = { net1: number; net2: number; us: number };

/** Händlerrabatt-Margen aus den Firmenstammdaten (für `tierPreis`). */
export async function positionMargen(): Promise<PreisMargen> {
  const fs = await getFirmaSetting();
  return {
    net1: Number(fs.haendlerrabattNet1) || 0,
    net2: Number(fs.haendlerrabattNet2) || 0,
    us: Number(fs.usHaendlerrabatt) || 0,
  };
}

type ArtikelPreis = {
  vkEur: string | null; vkUs: string | null;
  bruttoFuerNetto: boolean | null; nichtRabattierfaehig: boolean | null;
};

/**
 * Einzelpreis nach Vertriebsweg (§6). Sonderrabatt hat Vorrang.
 * Die Tier-Preise (NET1/NET2/NET_US/vkEurNet) werden **live** aus `vk_eur`/`vk_us`
 * + Margen berechnet (`computeTiers`), nicht aus den gespeicherten Spalten gelesen —
 * die sind für den Import-Bestand leer.
 */
export function tierPreis(
  a: ArtikelPreis,
  vertriebsweg: string | null,
  kdWaehrung: string | null,
  sonderrabattProzent: string | null,
  margen: PreisMargen,
): number | null {
  const n = (v: string | null) => (v == null ? null : Number(v));
  const t = computeTiers(
    {
      vkEur: a.vkEur == null ? null : Number(a.vkEur),
      vkUs: a.vkUs == null ? null : Number(a.vkUs),
      bruttoFuerNetto: !!a.bruttoFuerNetto,
      nichtRabattierfaehig: !!a.nichtRabattierfaehig,
    },
    margen,
  );
  const sr = n(sonderrabattProzent);
  if (sr != null && sr !== 0) {
    const base = kdWaehrung === "USD" ? n(a.vkUs) : n(t.vkEurNet);
    return base == null ? null : Math.round(base * (1 - sr / 100) * 100) / 100;
  }
  switch (vertriebsweg) {
    case "NET1": return n(t.net1);
    case "NET2": return n(t.net2);
    case "NET_US": return n(t.netUs);
    case "VK_US": return n(a.vkUs);
    case "VK_EUR": return n(t.vkEurNet);
    default: return n(t.vkEurNet);
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
  if (traeger === "auftrag") await recomputeUmsatzerwartung(traegerId);
}

/**
 * Umsatzerwartung eines Auftrags (EUR-normierter Planungswert, ex Ninox A.GY, MIGRATION 7k):
 * - Positionen vorhanden → Summe netto des Auftrags (USD × USD→EUR-Faktor),
 * - sonst Modell gewählt → Grundpreis (netto) des Modells nach Vertriebsweg (NET1/NET2/NET_US/VK_US/VK_EUR),
 * - sonst leer.
 * Hält auch `stand_he_wert` (= Umsatzerwartung × Fortschritt) aktuell.
 */
export async function recomputeUmsatzerwartung(auftragId: string) {
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) return;
  const faktor = Number((await getFirmaSetting()).usdEurFaktor) || 0.92;
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(belegPosition)
    .where(eq(belegPosition.auftragId, auftragId));

  let wert: number | null = null;
  if (n > 0 && a.summeNetto != null) {
    wert = Number(a.summeNetto) * (a.kdWaehrung === "USD" ? faktor : 1);
  } else if (a.modellArtikelId) {
    const [m] = await db.select().from(artikel).where(eq(artikel.id, a.modellArtikelId));
    if (m) {
      const preis = tierPreis(m, a.kdVertriebsweg, a.kdWaehrung, null, await positionMargen());
      const usd = a.kdVertriebsweg === "NET_US" || a.kdVertriebsweg === "VK_US";
      if (preis != null) wert = preis * (usd ? faktor : 1);
    }
  }
  const umsatz = wert == null ? null : Math.round(wert * 100) / 100;
  const standHe = umsatz == null || a.fortschrittProzent == null
    ? null
    : Math.round(umsatz * (a.fortschrittProzent / 100) * 100) / 100;
  await db
    .update(auftrag)
    .set({ umsatzerwartung: umsatz == null ? null : String(umsatz), standHeWert: standHe == null ? null : String(standHe) })
    .where(eq(auftrag.id, auftragId));
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
  if (traeger === "auftrag") await assertAuftragPositionenAenderbar(traegerId, { art: "ganz" });

  const specs = await db
    .select({
      slotKey: specBelegung.slotKey,
      reihenfolge: specBelegung.reihenfolge,
      aufpreis: specBelegung.aufpreis,
      artikelId: specBelegung.artikelId,
      nameBelege: artikel.nameBelege,
      beschreibung: artikel.beschreibung,
      vkEur: artikel.vkEur, vkUs: artikel.vkUs,
      bruttoFuerNetto: artikel.bruttoFuerNetto, nichtRabattierfaehig: artikel.nichtRabattierfaehig,
    })
    .from(specBelegung)
    .innerJoin(artikel, eq(artikel.id, specBelegung.artikelId))
    .where(eq(SPEC_COL[traeger], traegerId));

  const [modell] = await db.select().from(artikel).where(eq(artikel.id, h.modellArtikelId));

  const vw = h.kdVertriebsweg;
  const wg = h.kdWaehrung;
  const sr = h.kdSonderrabattProzent;
  const margen = await positionMargen();
  const colourSetRow = specs.find((s) => s.slotKey === "colour_set");
  const colourAnzahl = colourSetAnzahl(colourSetRow?.nameBelege);

  const order = (k: string) => SPEC_SLOT_BY_KEY[k]?.order ?? 999;
  specs.sort((a, b) => order(a.slotKey) - order(b.slotKey) || a.reihenfolge - b.reihenfolge);

  await db.transaction(async (tx) => {
    await tx.delete(belegPosition).where(eq(POS_COL[traeger], traegerId));

    const rows: (typeof belegPosition.$inferInsert)[] = [];

    if (modell) {
      const preis = tierPreis(modell, vw, wg, sr, margen);
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
      const preis = tierPreis(s, vw, wg, sr, margen);
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

/* -------------------------------------------------------------------- Porto */

/**
 * Porto-Position nach Staat des Kunden anhängen. Enthält der Beleg einen Modell-Artikel
 * (Gitarre) → Gitarren-Porto des Staats, sonst Teile-Porto. Vorhandene Versand-Positionen
 * werden ersetzt (kein doppeltes Porto). Sonderrabatt gilt nicht fürs Porto.
 */
export async function addPorto(traeger: SpecBelegTraeger, traegerId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) throw new DomainError("NOT_FOUND", "Beleg nicht gefunden.");

  let staatId = h.kdStaatId;
  if (!staatId && h.kundeId) {
    const [k] = await db.select({ staatId: kunde.staatId }).from(kunde).where(eq(kunde.id, h.kundeId));
    staatId = k?.staatId ?? null;
  }
  if (!staatId) throw new DomainError("STATE", "Beim Kunden ist kein Staat hinterlegt.");
  const [s] = await db.select().from(staat).where(eq(staat.id, staatId));
  if (!s) throw new DomainError("NOT_FOUND", "Staat nicht gefunden.");

  const pos = await db
    .select({ id: belegPosition.id, gruppe: artikel.artikelgruppe })
    .from(belegPosition)
    .innerJoin(artikel, eq(artikel.id, belegPosition.artikelId))
    .where(eq(POS_COL[traeger], traegerId));
  const istGitarre = pos.some((p) => p.gruppe === "MODEL");

  const portoId = istGitarre ? s.portoGitarreArtikelId : s.portoTeileArtikelId;
  if (!portoId) {
    throw new DomainError(
      "STATE",
      `Für ${s.name} ist kein ${istGitarre ? "Gitarren" : "Teile"}-Porto hinterlegt (Einstellungen → Staaten).`,
    );
  }
  const [a] = await db.select().from(artikel).where(eq(artikel.id, portoId));
  if (!a) throw new DomainError("NOT_FOUND", "Porto-Artikel nicht gefunden.");

  const preis = tierPreis(a, h.kdVertriebsweg, h.kdWaehrung, null, await positionMargen()) ?? 0;
  // Alt: Porto als Position → beim Umstellen entfernen (nur wenn noch nicht berechnet)
  const alte = pos.filter((p) => p.gruppe === "VERSAND").map((p) => p.id);
  if (traeger === "auftrag") {
    for (const posId of alte) await assertAuftragPositionenAenderbar(traegerId, { art: "loeschen", posId });
  }
  const name = a.nameBelege ?? a.nameLang ?? a.nameKurz ?? "Versand";

  if (alte.length) {
    await db.delete(belegPosition).where(inArray(belegPosition.id, alte));
    await renumberPositionen(traeger, traegerId);
  }
  await setVersand(traeger, traegerId, { betrag: preis, bezeichnung: name, artikelId: a.id });
  return h.versandkosten && Number(h.versandkosten) !== 0 ? `Versand ersetzt: ${name}` : `Versand gesetzt: ${name}`;
}

/**
 * Versandkosten im Summenblock setzen (Betrag 0 = entfernen). Nicht rabattierfähig, nicht Teil der Positionen.
 * Rechnung: Aufrufer prüft, dass es ein Entwurf ist. Auftrag: gesperrt, sobald der Versand berechnet ist.
 */
export async function setVersand(
  traeger: PosTraeger,
  traegerId: string,
  v: { betrag: number; bezeichnung?: string | null; artikelId?: string | null },
) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (traeger === "auftrag" && (await versandBerechnet(traegerId))) {
    throw new DomainError("STATE", "Der Versand dieses Auftrags ist bereits berechnet und kann nicht mehr geändert werden.");
  }
  const head = HEAD[traeger];
  const leer = !v.betrag;
  await db
    .update(head)
    .set({
      versandkosten: String(Math.round(v.betrag * 100) / 100),
      versandBezeichnung: leer ? null : (v.bezeichnung?.trim() || "Versandkosten"),
      versandArtikelId: leer ? null : (v.artikelId ?? null),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(head.id, traegerId));
  await recomputeSummen(traeger, traegerId);
}

/* --------------------------------------------------------------------- Summen */

/**
 * Summe der RE-relevanten Positionen + Basis für den Gesamtrabatt. Nicht rabattierfähige
 * Artikel (u. a. alle Porto-Artikel) sind von der Rabatt-Basis ausgenommen; Freitext-
 * Positionen ohne Artikel zählen als rabattierfähig.
 */
async function positionsSummen(traeger: PosTraeger, traegerId: string) {
  const [r] = await db
    .select({
      summe: sql<string>`coalesce(sum(${belegPosition.gesamtpreis}) filter (where ${belegPosition.reRelevant}), 0)`,
      basis: sql<string>`coalesce(sum(${belegPosition.gesamtpreis}) filter (
        where ${belegPosition.reRelevant} and coalesce(${artikel.nichtRabattierfaehig}, false) = false
      ), 0)`,
    })
    .from(belegPosition)
    .leftJoin(artikel, eq(artikel.id, belegPosition.artikelId))
    .where(eq(POS_COL[traeger], traegerId));
  return { summePositionen: Number(r.summe), rabattBasis: Number(r.basis) };
}

export async function recomputeSummen(traeger: PosTraeger, traegerId: string) {
  const head = HEAD[traeger];
  const [h] = await db.select().from(head).where(eq(head.id, traegerId));
  if (!h) return;

  const { summePositionen, rabattBasis } = await positionsSummen(traeger, traegerId);
  const rabattProzent = Number(h.gesamtrabattProzent ?? 0);
  const gesamtrabattWert = h.gesamtrabattAktiv
    ? Math.round(rabattBasis * (rabattProzent / 100) * 100) / 100
    : 0;
  const versand = Number(h.versandkosten ?? 0);
  const summeNetto = Math.round((summePositionen - gesamtrabattWert + versand) * 100) / 100;

  // Rechnung: MwSt-Satz aus dem Snapshot (beim Buchen eingefroren), sonst aktueller Satz
  const snapSatz = "mwstSatz" in h ? h.mwstSatz : null;
  const mwstSatz = snapSatz != null ? Number(snapSatz) : Number((await getFirmaSetting()).mwstSatz);
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

  if (traeger === "auftrag") await recomputeUmsatzerwartung(traegerId);

  // Rechnung: Zahlbetrag = Brutto − abgezogene Anzahlungsrechnungen − (Altbestand) manuelle Anzahlung
  if (traeger === "rechnung") {
    const r = h as typeof rechnung.$inferSelect;
    const [{ abzug }] = await db
      .select({ abzug: sql<string>`coalesce(sum(${rechnungAnzahlung.brutto}), 0)` })
      .from(rechnungAnzahlung)
      .where(eq(rechnungAnzahlung.rechnungId, traegerId));
    const alt = r.anzahlungBeruecksichtigen ? Number(r.anzahlungBrutto ?? 0) : 0;
    await db.update(rechnung)
      .set({ rechnungsbetrag: String(Math.round((summeBrutto - Number(abzug) - alt) * 100) / 100) })
      .where(eq(rechnung.id, traegerId));
  }
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
  if (traeger === "auftrag" && (await abrechnungsStand(traegerId)).teilweise) {
    throw new DomainError("STATE", "Der Auftrag ist schon (teilweise) berechnet — Gesamtrabatt nicht mehr änderbar.");
  }
  const { rabattBasis } = await positionsSummen(traeger, traegerId);

  let prozent = Number(h.gesamtrabattProzent ?? 0);
  if (input.prozent != null) prozent = input.prozent;
  else if (input.wert != null && rabattBasis > 0) prozent = Math.round((input.wert * 100 / rabattBasis) * 1000) / 1000;

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

  const jahr = jahrBerlin();
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
        auftragsdatum: heuteBerlin(),
        erfasstAm: heuteBerlin(),
        erfasstVon: user.name,
        kundeId: a.kundeId,
        kdFirma: a.kdFirma, kdVorname: a.kdVorname, kdNachname: a.kdNachname,
        kdStrasse: a.kdStrasse, kdPlz: a.kdPlz, kdOrt: a.kdOrt, kdStaatId: a.kdStaatId,
        kdRegion: a.kdRegion, kdWaehrung: a.kdWaehrung, kdSprache: a.kdSprache,
        kdUstId: a.kdUstId, kdSteuerpflichtig: a.kdSteuerpflichtig,
        kdVertriebsweg: a.kdVertriebsweg, kdSonderrabattProzent: a.kdSonderrabattProzent,
        kdBriefkopf: a.kdBriefkopf,
        modellArtikelId: a.modellArtikelId,
        versandkosten: a.versandkosten, versandBezeichnung: a.versandBezeichnung, versandArtikelId: a.versandArtikelId,
        gesamtrabattAktiv: a.gesamtrabattAktiv, gesamtrabattProzent: a.gesamtrabattProzent,
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
      bruttoFuerNetto: artikel.bruttoFuerNetto, nichtRabattierfaehig: artikel.nichtRabattierfaehig,
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
