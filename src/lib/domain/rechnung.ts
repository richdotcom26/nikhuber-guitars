import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  artikel, auftrag, belegPosition, rechnung, seriennummer,
} from "@/lib/db/schema";
import {
  RG_BELEGART_VALUES, RG_STATUS_VALUES, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import { allocateNummer, kdSnapshot, recomputeSummen } from "./belege";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

export {
  RG_BELEGART_LABEL, RG_STATUS, RG_STATUS_LABEL,
} from "@/lib/rechnung-shared";

/* ---------------------------------------------------------------------- liste */

export async function listRechnungen(
  params: { q?: string; status?: string; belegart?: string; page?: number } = {},
) {
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);
  const filters = [];
  if (params.status && (RG_STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(rechnung.status, params.status as RgStatus));
  }
  if (params.belegart && (RG_BELEGART_VALUES as readonly string[]).includes(params.belegart)) {
    filters.push(eq(rechnung.belegart, params.belegart as RgBelegart));
  }
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(ilike(rechnung.nummer, like), ilike(rechnung.kdFirma, like), ilike(rechnung.kdNachname, like))!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: rechnung.id,
      nummer: rechnung.nummer,
      belegart: rechnung.belegart,
      status: rechnung.status,
      rechnungsdatum: rechnung.rechnungsdatum,
      zahlungsdatum: rechnung.zahlungsdatum,
      kdFirma: rechnung.kdFirma,
      kdVorname: rechnung.kdVorname,
      kdNachname: rechnung.kdNachname,
      kdWaehrung: rechnung.kdWaehrung,
      summeBrutto: rechnung.summeBrutto,
      zahlungsstatus: rechnung.zahlungsstatus,
    })
    .from(rechnung)
    .where(where)
    .orderBy(desc(rechnung.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(rechnung).where(where);
  return { rows, total: count, page, pageCount: Math.max(Math.ceil(count / pageSize), 1) };
}

/* --------------------------------------------------------------------- detail */

export async function getRechnung(id: string) {
  const row = await db.query.rechnung.findFirst({ where: eq(rechnung.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");

  let auftragInfo: { id: string; nummer: string; modellName: string | null; serNr: string | null } | null = null;
  if (row.auftragId) {
    const [a] = await db
      .select({
        id: auftrag.id,
        nummer: auftrag.nummer,
        modellName: artikel.nameBelege,
        serAnzeige: seriennummer.anzeige,
      })
      .from(auftrag)
      .leftJoin(artikel, eq(auftrag.modellArtikelId, artikel.id))
      .leftJoin(seriennummer, eq(auftrag.seriennummerId, seriennummer.id))
      .where(eq(auftrag.id, row.auftragId));
    if (a) auftragInfo = { id: a.id, nummer: a.nummer, modellName: a.modellName, serNr: a.serAnzeige };
  }

  let referenz: { id: string; nummer: string } | null = null;
  if (row.referenzRechnungId) {
    const [r] = await db
      .select({ id: rechnung.id, nummer: rechnung.nummer })
      .from(rechnung)
      .where(eq(rechnung.id, row.referenzRechnungId));
    referenz = r ?? null;
  }
  return { rechnung: row, auftragInfo, referenz };
}

/* ------------------------------------------------------- Erstellen aus Auftrag */

export async function createRechnungFromAuftrag(auftragId: string): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [a] = await db.select().from(auftrag).where(eq(auftrag.id, auftragId));
  if (!a) throw new DomainError("NOT_FOUND", "Auftrag nicht gefunden.");

  const jahr = new Date().getFullYear();
  const nummer = await allocateNummer("RECHNUNG", jahr);
  const snap = a.kundeId ? await kdSnapshot(a.kundeId) : {};
  const positionen = await db
    .select()
    .from(belegPosition)
    .where(and(eq(belegPosition.auftragId, auftragId), eq(belegPosition.reRelevant, true)));

  const id = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(rechnung)
      .values({
        nummer,
        belegart: "RECHNUNG",
        status: "OFFEN",
        rechnungsdatum: new Date().toISOString().slice(0, 10),
        auftragId,
        ...snap,
        modellArtikelId: a.modellArtikelId,
        gesamtrabattProzent: a.gesamtrabattProzent,
        gesamtrabattAktiv: a.gesamtrabattAktiv,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: rechnung.id });

    if (positionen.length) {
      await tx.insert(belegPosition).values(
        positionen.map((p) => ({
          rechnungId: neu.id,
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
          createdBy: user.id,
          updatedBy: user.id,
        })),
      );
    }
    return neu.id;
  });

  await recomputeSummen("rechnung", id);
  return id;
}

/* --------------------------------------------------- Storno / Gutschrift (7cc) */

async function negierteKopie(
  quelleId: string,
  belegart: RgBelegart,
  nummerPrefix: string,
  opts: { status: RgStatus; teilgutschrift?: boolean; positionen: "negiert" | "keine" },
): Promise<string> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [orig] = await db.select().from(rechnung).where(eq(rechnung.id, quelleId));
  if (!orig) throw new DomainError("NOT_FOUND", "Original-Rechnung nicht gefunden.");
  if (orig.belegart !== "RECHNUNG") {
    throw new DomainError("STATE", "Nur zu einer echten Rechnung möglich.");
  }

  const positionen = opts.positionen === "negiert"
    ? await db.select().from(belegPosition).where(eq(belegPosition.rechnungId, quelleId))
    : [];

  const neuId = await db.transaction(async (tx) => {
    const [neu] = await tx
      .insert(rechnung)
      .values({
        nummer: `${nummerPrefix}${orig.nummer}`,
        belegart,
        status: opts.status,
        teilgutschrift: opts.teilgutschrift ?? false,
        rechnungsdatum: opts.teilgutschrift ? new Date().toISOString().slice(0, 10) : orig.rechnungsdatum,
        auftragId: orig.auftragId,
        referenzRechnungId: orig.id,
        modellArtikelId: orig.modellArtikelId,
        kundeId: orig.kundeId,
        kdFirma: orig.kdFirma, kdVorname: orig.kdVorname, kdNachname: orig.kdNachname,
        kdStrasse: orig.kdStrasse, kdPlz: orig.kdPlz, kdOrt: orig.kdOrt, kdStaatId: orig.kdStaatId,
        kdRegion: orig.kdRegion, kdWaehrung: orig.kdWaehrung, kdSprache: orig.kdSprache,
        kdUstId: orig.kdUstId, kdSteuerpflichtig: orig.kdSteuerpflichtig,
        kdVertriebsweg: orig.kdVertriebsweg, kdSonderrabattProzent: orig.kdSonderrabattProzent,
        kdBriefkopf: orig.kdBriefkopf,
        bemerkungRechnung: `${belegart === "STORNORECHNUNG" ? "Storno" : "Gutschrift"} zu Rechnung ${orig.nummer}`,
        createdBy: user.id, updatedBy: user.id,
      })
      .returning({ id: rechnung.id });

    if (positionen.length) {
      await tx.insert(belegPosition).values(
        positionen.map((p) => ({
          rechnungId: neu.id,
          posNr: p.posNr,
          artikelId: p.artikelId,
          artikelName: p.artikelName,
          artikelBeschreibung: p.artikelBeschreibung,
          anzahl: p.anzahl,
          einzelpreis: p.einzelpreis == null ? null : String(-Number(p.einzelpreis)),
          rabattProzent: p.rabattProzent,
          reRelevant: true,
          herkunftSlotKey: p.herkunftSlotKey,
          createdBy: user.id, updatedBy: user.id,
        })),
      );
    }

    if (belegart === "STORNORECHNUNG") {
      await tx
        .update(rechnung)
        .set({ status: "RG_STORNIERT", updatedAt: new Date(), updatedBy: user.id })
        .where(eq(rechnung.id, orig.id));
    }
    return neu.id;
  });

  await recomputeSummen("rechnung", neuId);
  return neuId;
}

export function stornoRechnung(id: string) {
  return negierteKopie(id, "STORNORECHNUNG", "S", { status: "STORNORECHNUNG", positionen: "negiert" });
}
export function gutschrift(id: string) {
  return negierteKopie(id, "GUTSCHRIFT", "GS", { status: "GUTSCHRIFT", positionen: "negiert" });
}
export function teilGutschrift(id: string) {
  return negierteKopie(id, "GUTSCHRIFT", "TGS", { status: "GUTSCHRIFT", teilgutschrift: true, positionen: "keine" });
}

/* ------------------------------------------------------------------ Kopf-Form */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
);
const boolFlag = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const rechnungKopfSchema = z.object({
  status: z.enum(RG_STATUS_VALUES),
  rechnungsdatum: dateOrNull,
  lieferdatum: dateOrNull,
  reportMonat: nullableText,
  bemerkungRechnung: nullableText,
  gebuchtBeimSteuerbuero: boolFlag,
});
export type RechnungKopfInput = z.infer<typeof rechnungKopfSchema>;

export async function updateRechnungKopf(id: string, input: RechnungKopfInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(rechnung)
    .set({ ...input, updatedAt: new Date(), updatedBy: user.id })
    .where(eq(rechnung.id, id))
    .returning({ id: rechnung.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
}

/* --------------------------------------------------------------------- Zahlung */

const decimalOrNull = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    return typeof v === "string" ? v.replace(",", ".").trim() : v;
  },
  z.coerce.number().transform((n) => n.toString()).nullable(),
);

export const zahlungSchema = z.object({
  zahlungsdatum: dateOrNull,
  zahlbetrag: decimalOrNull,
  zahlungAnBank: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["VVB", "CHASE", "PAYPAL"]).nullable()),
  zahlungsstatus: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["ANGEZAHLT", "TEILZAHLUNG", "BEZAHLT", "ANGEMAHNT"]).nullable(),
  ),
  abzugProzent: decimalOrNull,
});
export type ZahlungInput = z.infer<typeof zahlungSchema>;

export async function recordZahlung(id: string, input: ZahlungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");

  const brutto = Number(r.summeBrutto ?? 0);
  const anzahlung = r.anzahlungBeruecksichtigen ? Number(r.anzahlungBrutto ?? 0) : 0;
  const rechnungsbetrag = Math.round((brutto - anzahlung) * 100) / 100;
  const zahlbetrag = input.zahlbetrag == null ? null : Number(input.zahlbetrag);
  const differenz = zahlbetrag == null ? null : Math.round((zahlbetrag - rechnungsbetrag) * 100) / 100;

  await db
    .update(rechnung)
    .set({
      ...input,
      rechnungsbetrag: String(rechnungsbetrag),
      differenzZahlung: differenz == null ? null : String(differenz),
      status: input.zahlungsstatus === "BEZAHLT" ? "BEZAHLT" : r.status,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(rechnung.id, id));
}

export const anzahlungSchema = z.object({
  anzahlungBeruecksichtigen: boolFlag,
  anzahlungBrutto: decimalOrNull,
  anzahlungDatum: dateOrNull,
});
export type AnzahlungInput = z.infer<typeof anzahlungSchema>;

export async function setAnzahlung(id: string, input: AnzahlungInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const [r] = await db.select().from(rechnung).where(eq(rechnung.id, id));
  if (!r) throw new DomainError("NOT_FOUND", "Rechnung nicht gefunden.");
  const brutto = Number(r.summeBrutto ?? 0);
  const anzahlung = input.anzahlungBeruecksichtigen ? Number(input.anzahlungBrutto ?? 0) : 0;
  await db
    .update(rechnung)
    .set({
      ...input,
      rechnungsbetrag: String(Math.round((brutto - anzahlung) * 100) / 100),
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(rechnung.id, id));
}

/** Positionen einer Rechnung (für Panel). */
export async function listRechnungPositionen(id: string) {
  return db
    .select()
    .from(belegPosition)
    .where(eq(belegPosition.rechnungId, id))
    .orderBy(sql`${belegPosition.posNr} is null`, asc(belegPosition.posNr), asc(belegPosition.createdAt));
}
