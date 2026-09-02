"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  createHolz, deleteHolz, deleteHolzStruktur, deleteHolzUnterart, deleteLagerort,
  holzartSchema, holzSchema, holzStrukturSchema, holzUnterartSchema, lagerortSchema,
  reserviereHolz, saveHolzart, saveHolzStruktur, saveHolzUnterart, saveLagerort,
  setHolzStatus, updateHolz,
} from "@/lib/domain/holz";

const BASE = "/holzbestand";

export async function createHolzAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await createHolz(parseForm(holzSchema, fd));
    return ok("Holz-Datensatz angelegt.");
  });
  if (id) redirect(`${BASE}/${id}`);
  return res;
}

export async function updateHolzAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateHolz(id, parseForm(holzSchema, fd));
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return ok("Gespeichert.");
  });
}

export async function setStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await setHolzStatus(id, String(fd.get("status") ?? ""));
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return ok("Status geändert.");
  });
}

export async function reserviereAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const auftragId = String(fd.get("auftragId") ?? "") || null;
    await reserviereHolz(id, auftragId);
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return ok(auftragId ? "Reserviert." : "Reservierung aufgehoben.");
  });
}

export async function deleteHolzAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const res = await runAction(async () => {
    await deleteHolz(id);
    return ok("Gelöscht.");
  });
  if (res?.ok) {
    revalidatePath(BASE);
    redirect(BASE);
  }
  return res;
}

/* ---- Holzarten ---- */

export async function saveHolzartAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = fd.get("id");
    await saveHolzart(typeof id === "string" && id ? id : null, parseForm(holzartSchema, fd));
    revalidatePath(`${BASE}?tab=holzarten`);
    return ok("Holzart gespeichert.");
  });
}

/* ---- Holz-Unterart ---- */

export async function saveHolzUnterartAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = fd.get("id");
    await saveHolzUnterart(typeof id === "string" && id ? id : null, parseForm(holzUnterartSchema, fd));
    revalidatePath(`${BASE}?tab=unterarten`);
    return ok("Unterart gespeichert.");
  });
}
export async function deleteHolzUnterartAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteHolzUnterart(String(fd.get("id") ?? ""));
    revalidatePath(`${BASE}?tab=unterarten`);
    return ok("Unterart gelöscht.");
  });
}

/* ---- Holz-Struktur ---- */

export async function saveHolzStrukturAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = fd.get("id");
    await saveHolzStruktur(typeof id === "string" && id ? id : null, parseForm(holzStrukturSchema, fd));
    revalidatePath(`${BASE}?tab=strukturen`);
    return ok("Struktur gespeichert.");
  });
}
export async function deleteHolzStrukturAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteHolzStruktur(String(fd.get("id") ?? ""));
    revalidatePath(`${BASE}?tab=strukturen`);
    return ok("Struktur gelöscht.");
  });
}

/* ---- Lagerorte ---- */

export async function saveLagerortAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = fd.get("id");
    await saveLagerort(typeof id === "string" && id ? id : null, parseForm(lagerortSchema, fd));
    revalidatePath(`${BASE}?tab=lagerorte`);
    return ok("Lagerort gespeichert.");
  });
}

export async function deleteLagerortAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteLagerort(String(fd.get("id") ?? ""));
    revalidatePath(`${BASE}?tab=lagerorte`);
    return ok("Lagerort gelöscht.");
  });
}
