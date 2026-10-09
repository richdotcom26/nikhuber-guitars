"use server";

import { headers } from "next/headers";
import { type ActionState, fail, ok, runAction } from "@/lib/domain/action-state";
import { abUnterschreiben } from "@/lib/domain/auftrag-ab";
import { unterschreiben } from "@/lib/domain/verleih";

/** Öffentlich (ohne Login) — Berechtigung allein über den geheimen Token im Link. */
export async function unterschreibenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (fd.get("akzeptiert") !== "on") return fail("Bitte bestätigen, dass Sie die Vereinbarung gelesen haben.");
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
    const args = [
      String(fd.get("token") ?? ""),
      String(fd.get("name") ?? ""),
      String(fd.get("unterschrift") ?? ""),
      ip,
    ] as const;
    if (fd.get("art") === "AB") await abUnterschreiben(...args);
    else await unterschreiben(...args);
    return ok("Vielen Dank!");
  });
}
