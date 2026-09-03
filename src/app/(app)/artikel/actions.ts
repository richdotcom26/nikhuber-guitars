"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  artikelSchema, createArtikel, duplicateArtikel, setArtikelAktuell, toggleArtikelInaktiv,
  updateArtikel,
} from "@/lib/domain/artikel";

export async function createArtikelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await createArtikel(parseForm(artikelSchema, fd));
    return ok("Artikel angelegt.");
  });
  if (id) {
    const isModell = fd.get("artikelgruppe") === "MODEL";
    redirect(`${isModell ? "/modelle" : "/artikel"}/${id}`);
  }
  return res;
}

export async function updateArtikelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    if (!id) return fail("Keine ID.");
    await updateArtikel(id, parseForm(artikelSchema, fd));
    revalidatePath(`/artikel/${id}`);
    revalidatePath(`/modelle/${id}`);
    revalidatePath("/artikel");
    revalidatePath("/modelle");
    return ok("Gespeichert.");
  });
}

export async function toggleInaktivAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const inaktiv = fd.get("inaktiv") === "true";
    await toggleArtikelInaktiv(id, inaktiv);
    revalidatePath(`/artikel/${id}`);
    revalidatePath(`/modelle/${id}`);
    revalidatePath("/artikel");
    revalidatePath("/modelle");
    return ok(inaktiv ? "Archiviert." : "Reaktiviert.");
  });
}

/** Plain-Form-Action (Checkbox in der Liste) — kein ActionState-Feedback nötig. */
export async function setAktuellAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await setArtikelAktuell(id, fd.get("aktuell") === "true");
  revalidatePath(`/artikel/${id}`);
  revalidatePath("/artikel");
}

export async function duplicateArtikelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  let isModell = false;
  const res = await runAction(async () => {
    const src = String(fd.get("id") ?? "");
    isModell = fd.get("isModell") === "true";
    id = await duplicateArtikel(src);
    return ok("Dupliziert.");
  });
  if (id) redirect(`${isModell ? "/modelle" : "/artikel"}/${id}`);
  return res;
}
