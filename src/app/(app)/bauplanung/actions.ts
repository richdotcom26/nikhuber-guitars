"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, runAction,
} from "@/lib/domain/action-state";
import { setBauplanMonat, setModellgruppeBand } from "@/lib/domain/bauplanung";

const BASE = "/bauplanung";

export async function setBauplanMonatAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const raw = String(fd.get("monat") ?? "").trim();
    await setBauplanMonat(id, raw || null);
    revalidatePath(BASE);
    revalidatePath(`/auftraege/${id}`);
    return ok(raw ? `Auftrag → ${raw}.` : "Bauplan-Monat entfernt.");
  });
}

export async function setBandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const min = String(fd.get("min") ?? "").trim();
    const max = String(fd.get("max") ?? "").trim();
    await setModellgruppeBand(id, min ? Number(min) : null, max ? Number(max) : null);
    revalidatePath(BASE);
    return ok("Kapazitätsband gespeichert.");
  });
}
