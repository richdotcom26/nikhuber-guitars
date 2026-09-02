"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  betriebsmittelSchema, deleteBetriebsmittel, saveBetriebsmittel, setBetriebsmittelMenge,
} from "@/lib/domain/betriebsmittel";

const BASE = "/betriebsmittel";

export async function createBetriebsmittelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await saveBetriebsmittel(null, parseForm(betriebsmittelSchema, fd));
    return ok("Betriebsmittel angelegt.");
  });
  if (id) redirect(`${BASE}/${id}`);
  return res;
}

export async function updateBetriebsmittelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await saveBetriebsmittel(id, parseForm(betriebsmittelSchema, fd));
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return ok("Gespeichert.");
  });
}

export async function setMengeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const menge = Number(String(fd.get("menge") ?? "").replace(",", "."));
    await setBetriebsmittelMenge(id, menge);
    revalidatePath(BASE);
    return ok("Menge aktualisiert.");
  });
}

export async function deleteBetriebsmittelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const res = await runAction(async () => {
    await deleteBetriebsmittel(id);
    return ok("Gelöscht.");
  });
  if (res?.ok) {
    revalidatePath(BASE);
    redirect(BASE);
  }
  return res;
}
