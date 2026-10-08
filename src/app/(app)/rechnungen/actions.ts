"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addPosition, deleteAllePositionen, deletePosition, getArtikelForPosition, positionMargen,
  tierPreis, updatePosition, setVersand,
} from "@/lib/domain/belege";
import {
  anzahlungSchema, assertPositionArtikel, assertRechnungEditierbar, buchen, createRechnungOhneAuftrag,
  deleteEntwurf, korrekturEntwurf, positionenAusAuftrag, recordZahlung, rechnungKopfSchema, setAnzahlung,
  stornieren, updateRechnungKopf, zahlungSchema,
} from "@/lib/domain/rechnung";
import { rechnungMailSchema, sendeRechnungMail } from "@/lib/domain/rechnung-mail";
import { dezimal } from "@/lib/utils";
import { anzahlungenUebernehmen, entferneAbzug } from "@/lib/domain/anzahlung";

/** Entwurf buchen: Nummer, Datum, Sperre, E-Rechnung — in einer Transaktion. */
export async function buchenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const { nummer } = await buchen(id);
    rev(id);
    return ok(`Gebucht als ${nummer}.`);
  });
}

/** Entwurf löschen (hat noch keine Nummer). */
export async function deleteEntwurfAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let weg = false;
  const res = await runAction(async () => {
    await deleteEntwurf(String(fd.get("id") ?? ""));
    revalidatePath("/rechnungen");
    weg = true;
    return ok("Entwurf gelöscht.");
  });
  if (weg) redirect("/rechnungen");
  return res;
}

/** Mail mit Rechnungs-PDF (+ Fotos) senden; bei Erfolg zurück zur Rechnung. */
export async function sendeRechnungMailAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let zurueck: string | null = null;
  const res = await runAction(async () => {
    const input = rechnungMailSchema.parse({
      id: fd.get("id"),
      an: fd.get("an") ?? "",
      cc: fd.get("cc") ?? "",
      betreff: fd.get("betreff") ?? "",
      text: fd.get("text") ?? "",
      bildIds: fd.getAll("bildId").map(String),
    });
    const r = await sendeRechnungMail(input);
    rev(input.id);
    revalidatePath("/mailversand");
    if (!r.ok) return fail(r.message);
    zurueck = `/rechnungen/${input.id}?mail=ok`;
    return ok(r.message);
  });
  if (zurueck) redirect(zurueck);
  return res;
}

export async function createRechnungOhneAuftragAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    const kundeId = String(fd.get("kundeId") ?? "");
    if (!kundeId) return fail("Kein Kunde gewählt.");
    id = await createRechnungOhneAuftrag(kundeId);
    revalidatePath("/rechnungen");
    return ok("Rechnungsentwurf angelegt.");
  });
  if (id) redirect(`/rechnungen/${id}?tab=positionen`);
  return res;
}

function rev(id: string) {
  revalidatePath(`/rechnungen/${id}`);
  revalidatePath("/rechnungen");
}

export async function saveKopfAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateRechnungKopf(id, parseForm(rechnungKopfSchema, fd));
    rev(id);
    return ok("Gespeichert.");
  });
}

export async function saveZahlungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await recordZahlung(id, parseForm(zahlungSchema, fd));
    rev(id);
    return ok("Zahlung erfasst.");
  });
}

export async function saveAnzahlungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await setAnzahlung(id, parseForm(anzahlungSchema, fd));
    rev(id);
    return ok("Anzahlung gesetzt.");
  });
}

/** Stornorechnung: vollständige negative Kopie, sofort gebucht (ST-Nummer). */
export async function stornoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let neuId: string | null = null;
  const res = await runAction(async () => {
    const id = String(fd.get("id") ?? "");
    neuId = await stornieren(id);
    rev(id);
    return ok("Stornorechnung gebucht.");
  });
  if (neuId) redirect(`/rechnungen/${neuId}`);
  return res;
}

/** Rechnungskorrektur als Entwurf (Positionen anpassen, dann buchen). */
export async function korrekturAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let neuId: string | null = null;
  const res = await runAction(async () => {
    neuId = await korrekturEntwurf(String(fd.get("id") ?? ""));
    revalidatePath("/rechnungen");
    return ok("Korrektur-Entwurf angelegt.");
  });
  if (neuId) redirect(`/rechnungen/${neuId}?tab=positionen`);
  return res;
}

/* ---- Positionen (nur im Entwurf — Guard im Service) ---- */

export async function addPositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const artikelId = String(fd.get("artikelId") ?? "") || null;
    const freitext = String(fd.get("freitext") ?? "").trim();
    const anzahl = Number(dezimal(String(fd.get("anzahl") ?? "1"))) || 1;
    const einzelpreisRaw = dezimal(String(fd.get("einzelpreis") ?? "")).trim();
    let name = freitext || null;
    let beschreibung: string | null = null;
    let einzelpreis: number | null = einzelpreisRaw ? Number(einzelpreisRaw) : null;
    await assertPositionArtikel(id, artikelId);
    if (artikelId) {
      const a = await getArtikelForPosition(artikelId);
      if (a) {
        name = freitext || a.name;
        beschreibung = a.beschreibung ?? null;
        if (einzelpreis == null) {
          einzelpreis = tierPreis(
            a,
            fd.get("vertriebsweg") as string | null,
            fd.get("waehrung") as string | null,
            null,
            await positionMargen(),
          );
        }
      }
    }
    await addPosition("rechnung", id, {
      artikelId, artikelName: name, artikelBeschreibung: beschreibung, anzahl, einzelpreis, reRelevant: true,
    });
    rev(id);
    return ok("Position hinzugefügt.");
  });
}

export async function updatePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const posId = String(fd.get("posId") ?? "");
    const patch: Record<string, unknown> = {};
    const g = (k: string) => { const v = fd.get(k); return typeof v === "string" ? v : null; };
    if (g("anzahl") != null) patch.anzahl = Number(dezimal(g("anzahl")!)) || 0;
    if (g("einzelpreis") != null) {
      const s = dezimal(g("einzelpreis")!).trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(dezimal(g("rabattProzent")!)) || 0;
    // Zeilenformular enthält die Checkbox immer; nicht angehakt = wird nicht mitgesendet
    patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
    await assertRechnungEditierbar(id);
    await updatePosition("rechnung", id, posId, patch);
    rev(id);
    return ok("Position gespeichert.");
  });
}

export async function deletePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await assertRechnungEditierbar(id);
    await deletePosition("rechnung", id, String(fd.get("posId") ?? ""));
    rev(id);
    return ok("Position gelöscht.");
  });
}

export async function deleteAllePositionenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await assertRechnungEditierbar(id);
    await deleteAllePositionen("rechnung", id);
    rev(id);
    return ok("Alle Positionen gelöscht.");
  });
}

export async function positionenAusAuftragAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const n = await positionenAusAuftrag(id);
    rev(id);
    return ok(`${n} Positionen aus dem Auftrag übernommen.`);
  });
}

/** Versandkosten im Summenblock setzen (0 = entfernen). */
export async function setVersandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const betrag = Number(dezimal(String(fd.get("betrag") ?? "0")) || 0);
    if (!Number.isFinite(betrag)) return fail("Ungültiger Betrag.");
    await assertRechnungEditierbar(id);
    await setVersand("rechnung", id, { betrag, bezeichnung: String(fd.get("bezeichnung") ?? "") || null });
    rev(id);
    return ok(betrag ? "Versand gespeichert." : "Versand entfernt.");
  });
}

/** Entwurf: freie Anzahlungsrechnungen des Auftrags als Abzug übernehmen. */
export async function anzahlungenUebernehmenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const n = await anzahlungenUebernehmen(id);
    rev(id);
    return ok(n ? `${n} Anzahlung(en) übernommen.` : "Keine weiteren gebuchten Anzahlungen zu diesem Auftrag.");
  });
}

/** Entwurf: einen Anzahlungsabzug entfernen. */
export async function entferneAbzugAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await entferneAbzug(id, String(fd.get("abzugId") ?? ""));
    rev(id);
    return ok("Abzug entfernt.");
  });
}
