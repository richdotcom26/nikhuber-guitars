"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  ansprechpartnerSchema, createKunde, deleteAnsprechpartner, deleteLieferadresse,
  kundeSchema, lieferadresseSchema, rederiveKunde, saveAnsprechpartner, saveLieferadresse,
  softDeleteKunde, updateKunde,
} from "@/lib/domain/adressen";

export async function createKundeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let newId: string | null = null;
  const res = await runAction(async () => {
    newId = await createKunde(parseForm(kundeSchema, formData));
    return ok("Kunde angelegt.");
  });
  if (newId) redirect(`/adressen/${newId}`);
  return res;
}

export async function updateKundeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    if (!id) return fail("Keine ID.");
    await updateKunde(id, parseForm(kundeSchema, formData));
    revalidatePath(`/adressen/${id}`);
    revalidatePath("/adressen");
    return ok("Gespeichert.");
  });
}

export async function rederiveKundeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    await rederiveKunde(id);
    revalidatePath(`/adressen/${id}`);
    return ok("Preis / Steuer / Sprache aus Staat übernommen.");
  });
}

export async function deleteKundeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const res = await runAction(async () => {
    await softDeleteKunde(id);
    return ok("Kunde gelöscht.");
  });
  if (res?.ok) {
    revalidatePath("/adressen");
    redirect("/adressen");
  }
  return res;
}

/* ---- Ansprechpartner ---- */

export async function saveAnsprechpartnerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const kundeId = String(formData.get("kundeId") ?? "");
    const id = formData.get("id");
    await saveAnsprechpartner(
      kundeId,
      typeof id === "string" && id ? id : null,
      parseForm(ansprechpartnerSchema, formData),
    );
    revalidatePath(`/adressen/${kundeId}`);
    return ok("Ansprechpartner gespeichert.");
  });
}

export async function deleteAnsprechpartnerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const kundeId = String(formData.get("kundeId") ?? "");
    await deleteAnsprechpartner(kundeId, String(formData.get("id") ?? ""));
    revalidatePath(`/adressen/${kundeId}`);
    return ok("Ansprechpartner gelöscht.");
  });
}

/* ---- Lieferadresse ---- */

export async function saveLieferadresseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const kundeId = String(formData.get("kundeId") ?? "");
    const id = formData.get("id");
    await saveLieferadresse(
      kundeId,
      typeof id === "string" && id ? id : null,
      parseForm(lieferadresseSchema, formData),
    );
    revalidatePath(`/adressen/${kundeId}`);
    return ok("Lieferadresse gespeichert.");
  });
}

export async function deleteLieferadresseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const kundeId = String(formData.get("kundeId") ?? "");
    await deleteLieferadresse(kundeId, String(formData.get("id") ?? ""));
    revalidatePath(`/adressen/${kundeId}`);
    return ok("Lieferadresse gelöscht.");
  });
}
