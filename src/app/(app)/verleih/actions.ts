"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, fail, ok, parseForm, runAction } from "@/lib/domain/action-state";
import {
  createVerleih, deleteVerleih, erzeugeVereinbarung, sendeVerleihMail, setZurueck, updateVerleih,
  verleihMailSchema, verleihMailVorschlag, verleihSchema, type VerleihMailArt,
} from "@/lib/domain/verleih";

function rev(id?: string) {
  revalidatePath("/verleih");
  if (id) revalidatePath(`/verleih/${id}`);
}

export async function createVerleihAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await createVerleih(parseForm(verleihSchema, fd));
    rev();
    return ok("Verleih angelegt.");
  });
  if (res?.ok && id) redirect(`/verleih/${id}`);
  return res;
}

export async function updateVerleihAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateVerleih(id, parseForm(verleihSchema, fd));
    rev(id);
    return ok("Gespeichert.");
  });
}

export async function zurueckAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const datum = String(fd.get("datum") ?? "") || null;
    await setZurueck(id, datum);
    rev(id);
    return ok("Rückgabe eingetragen.");
  });
}

export async function deleteVerleihAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async () => {
    await deleteVerleih(String(fd.get("id") ?? ""));
    rev();
    return ok();
  });
  if (res?.ok) redirect("/verleih");
  return res;
}

export async function vereinbarungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await erzeugeVereinbarung(id);
    rev(id);
    return ok("Übergabevereinbarung erzeugt.");
  });
}

/** Vorschlag (Empfänger/Betreff/Text) für das Mail-Fenster. */
export async function verleihMailVorschlagAction(id: string, art: VerleihMailArt) {
  return verleihMailVorschlag(id, art);
}

export async function sendeVerleihMailAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const input = parseForm(verleihMailSchema, fd);
    const res = await sendeVerleihMail(input);
    rev(input.id);
    return res.ok ? ok(res.message) : fail(res.message);
  });
}
