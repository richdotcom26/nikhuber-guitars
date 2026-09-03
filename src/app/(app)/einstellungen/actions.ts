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

/* ---- Modellgruppen ---- */

export async function saveModellgruppeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createModellgruppe, updateModellgruppe, modellgruppeSchema } =
      await import("@/lib/domain/bauplanung");
    const id = fd.get("id");
    const input = parseForm(modellgruppeSchema, fd);
    if (typeof id === "string" && id) await updateModellgruppe(id, input);
    else await createModellgruppe(input);
    revalidatePath(BASE);
    revalidatePath("/auftraege");
    revalidatePath("/bauplanung");
    return ok("Modellgruppe gespeichert.");
  });
}

export async function deleteModellgruppeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { deleteModellgruppe } = await import("@/lib/domain/bauplanung");
    await deleteModellgruppe(String(fd.get("id") ?? ""));
    revalidatePath(BASE);
    revalidatePath("/auftraege");
    revalidatePath("/bauplanung");
    return ok("Modellgruppe gelöscht.");
  });
}

/* ---- Arbeitsschritte (Vorrat) ---- */

export async function saveVorratAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createVorrat, updateVorrat, vorratSchema } = await import("@/lib/domain/arbeitsschritt");
    const id = fd.get("id");
    const input = parseForm(vorratSchema, fd);
    if (typeof id === "string" && id) await updateVorrat(id, input);
    else await createVorrat(input);
    revalidatePath(BASE);
    return ok("Arbeitsschritt gespeichert.");
  });
}

export async function deleteVorratAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { deleteVorrat } = await import("@/lib/domain/arbeitsschritt");
    await deleteVorrat(String(fd.get("id") ?? ""));
    revalidatePath(BASE);
    return ok("Arbeitsschritt gelöscht.");
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
