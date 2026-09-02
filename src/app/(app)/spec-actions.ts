"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, ok, runAction } from "@/lib/domain/action-state";
import {
  nextReihenfolge, setFreitext, setSlot, type SpecTraeger,
} from "@/lib/domain/specs";
import type { SpecSection } from "@/lib/specs/slots";

const PATH: Record<SpecTraeger, (id: string) => string> = {
  modell: (id) => `/modelle/${id}`,
  angebot: (id) => `/angebote/${id}`,
  auftrag: (id) => `/auftraege/${id}`,
};

export async function setSlotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const traeger = String(formData.get("traeger")) as SpecTraeger;
    const traegerId = String(formData.get("traegerId"));
    const slotKey = String(formData.get("slotKey"));
    const reihenfolge = Number(formData.get("reihenfolge") ?? 0);
    const artikelIdRaw = formData.get("artikelId");
    const artikelId = typeof artikelIdRaw === "string" && artikelIdRaw ? artikelIdRaw : null;
    const aufpreis = formData.get("aufpreis") === "on" || formData.get("aufpreis") === "true";

    await setSlot(traeger, traegerId, slotKey, reihenfolge, artikelId, aufpreis);
    revalidatePath(PATH[traeger](traegerId));
    return ok(artikelId ? "Spec gespeichert." : "Spec entfernt.");
  });
}

export async function addMultiSlotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const traeger = String(formData.get("traeger")) as SpecTraeger;
    const traegerId = String(formData.get("traegerId"));
    const slotKey = String(formData.get("slotKey"));
    const artikelId = String(formData.get("artikelId") ?? "");
    if (!artikelId) return ok("Kein Artikel gewählt.");
    const rf = await nextReihenfolge(traeger, traegerId, slotKey);
    await setSlot(traeger, traegerId, slotKey, rf, artikelId, false);
    revalidatePath(PATH[traeger](traegerId));
    return ok("Spec hinzugefügt.");
  });
}

export async function setFreitextAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const traeger = String(formData.get("traeger")) as SpecTraeger;
    const traegerId = String(formData.get("traegerId"));
    const section = String(formData.get("section")) as SpecSection;
    const text = String(formData.get("text") ?? "");
    await setFreitext(traeger, traegerId, section, text);
    revalidatePath(PATH[traeger](traegerId));
    return ok("Freitext gespeichert.");
  });
}
