"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addPosition, deletePosition, getArtikelForPosition, tierPreis, updatePosition,
} from "@/lib/domain/belege";
import {
  anzahlungSchema, gutschrift, recordZahlung, rechnungKopfSchema, setAnzahlung,
  stornoRechnung, teilGutschrift, updateRechnungKopf, zahlungSchema,
} from "@/lib/domain/rechnung";

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

export async function stornoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let neuId: string | null = null;
  const res = await runAction(async () => {
    neuId = await stornoRechnung(String(fd.get("id") ?? ""));
    return ok("Stornorechnung erstellt.");
  });
  if (neuId) redirect(`/rechnungen/${neuId}`);
  return res;
}

export async function gutschriftAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let neuId: string | null = null;
  const teil = fd.get("teil") === "true";
  const res = await runAction(async () => {
    const id = String(fd.get("id") ?? "");
    neuId = teil ? await teilGutschrift(id) : await gutschrift(id);
    return ok("Gutschrift erstellt.");
  });
  if (neuId) redirect(`/rechnungen/${neuId}`);
  return res;
}

/* ---- Positionen (nur wenn nicht beim Steuerbüro gebucht — Guard in UI + hier) ---- */

export async function addPositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const artikelId = String(fd.get("artikelId") ?? "") || null;
    const freitext = String(fd.get("freitext") ?? "").trim();
    const anzahl = Number(String(fd.get("anzahl") ?? "1").replace(",", ".")) || 1;
    const einzelpreisRaw = String(fd.get("einzelpreis") ?? "").replace(",", ".").trim();
    let name = freitext || null;
    let beschreibung: string | null = null;
    let einzelpreis: number | null = einzelpreisRaw ? Number(einzelpreisRaw) : null;
    if (artikelId) {
      const a = await getArtikelForPosition(artikelId);
      if (a) {
        name = freitext || a.name;
        beschreibung = a.beschreibung ?? null;
        if (einzelpreis == null) {
          einzelpreis = tierPreis(a, fd.get("vertriebsweg") as string | null, fd.get("waehrung") as string | null, null);
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
    if (g("anzahl") != null) patch.anzahl = Number(g("anzahl")!.replace(",", ".")) || 0;
    if (g("einzelpreis") != null) {
      const s = g("einzelpreis")!.replace(",", ".").trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(g("rabattProzent")!.replace(",", ".")) || 0;
    if (fd.has("reRelevant")) patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
    await updatePosition("rechnung", id, posId, patch);
    rev(id);
    return ok("Position gespeichert.");
  });
}

export async function deletePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await deletePosition("rechnung", id, String(fd.get("posId") ?? ""));
    rev(id);
    return ok("Position gelöscht.");
  });
}

export async function noGenerateAction(...args: [ActionState, FormData]): Promise<ActionState> {
  void args;
  return fail("Rechnungspositionen werden aus dem Auftrag übernommen, nicht generiert.");
}
