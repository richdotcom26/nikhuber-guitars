"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, runAction,
} from "@/lib/domain/action-state";
import { anhangUrl, deleteAnhang, setAnhangMitRechnung, uploadAnhang } from "@/lib/domain/anhang";

export async function uploadAnhangAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await uploadAnhang(fd);
    const back = String(fd.get("_revalidate") ?? "");
    if (back) revalidatePath(back);
    return ok("Datei hochgeladen.");
  });
}

export async function deleteAnhangAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteAnhang(String(fd.get("id") ?? ""));
    const back = String(fd.get("_revalidate") ?? "");
    if (back) revalidatePath(back);
    return ok("Anhang gelöscht.");
  });
}

/** Foto beim Rechnungsversand vorauswählen (an/aus). */
export async function setMitRechnungAction(id: string, an: boolean, back: string): Promise<ActionState> {
  return runAction(async () => {
    await setAnhangMitRechnung(id, an);
    if (back) revalidatePath(back);
    return ok();
  });
}

/** Signierte Download-URL holen (vom Client aufgerufen). */
export async function anhangUrlAction(id: string): Promise<string> {
  return anhangUrl(id);
}
