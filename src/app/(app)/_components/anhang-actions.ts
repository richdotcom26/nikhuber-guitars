"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, runAction,
} from "@/lib/domain/action-state";
import { anhangUrl, deleteAnhang, uploadAnhang } from "@/lib/domain/anhang";

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

/** Signierte Download-URL holen (vom Client aufgerufen). */
export async function anhangUrlAction(id: string): Promise<string> {
  return anhangUrl(id);
}
