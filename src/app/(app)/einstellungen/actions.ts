"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  createStaat, createZahlungsbedingung, deleteZahlungsbedingung,
  firmaSettingSchema, staatSchema, updateFirmaSetting, updateStaat,
  updateZahlungsbedingung, zahlungsbedingungSchema,
} from "@/lib/domain/stammdaten";

const BASE = "/einstellungen";

export async function saveFirmaSettingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await updateFirmaSetting(parseForm(firmaSettingSchema, formData));
    revalidatePath(BASE);
    return ok("Firmendaten gespeichert.");
  });
}

export async function saveZahlungsbedingungAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = formData.get("id");
    const input = parseForm(zahlungsbedingungSchema, formData);
    if (typeof id === "string" && id) {
      await updateZahlungsbedingung(id, input);
    } else {
      await createZahlungsbedingung(input);
    }
    revalidatePath(BASE);
    return ok("Zahlungsbedingung gespeichert.");
  });
}

export async function deleteZahlungsbedingungAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    await deleteZahlungsbedingung(id);
    revalidatePath(BASE);
    return ok("Zahlungsbedingung gelöscht.");
  });
}

export async function saveStaatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = formData.get("id");
    const input = parseForm(staatSchema, formData);
    if (typeof id === "string" && id) {
      await updateStaat(id, input);
    } else {
      await createStaat(input);
    }
    revalidatePath(BASE);
    return ok("Staat gespeichert.");
  });
}

/* ---- Benutzerverwaltung (ADMIN) ---- */

export async function createBenutzerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createBenutzer, benutzerNeuSchema } = await import("@/lib/domain/benutzer");
    const res = await createBenutzer(parseForm(benutzerNeuSchema, fd));
    revalidatePath(`${BASE}?tab=benutzer`);
    return ok(res.link
      ? `Benutzer angelegt. Passwort-Link: ${res.link}`
      : "Benutzer angelegt. Passwort-Link über die Aktion Passwort-Link erzeugen.");
  });
}

export async function updateBenutzerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { updateBenutzer, benutzerPatchSchema } = await import("@/lib/domain/benutzer");
    await updateBenutzer(String(fd.get("id") ?? ""), parseForm(benutzerPatchSchema, fd));
    revalidatePath(`${BASE}?tab=benutzer`);
    return ok("Benutzer gespeichert.");
  });
}

export async function benutzerRecoveryLinkAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { benutzerRecoveryLink } = await import("@/lib/domain/benutzer");
    const link = await benutzerRecoveryLink(String(fd.get("id") ?? ""));
    return ok(`Passwort-Link (an den Benutzer weitergeben): ${link}`);
  });
}
