"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, ok, runAction } from "@/lib/domain/action-state";
import { sendeMahnungen } from "@/lib/domain/mahnung";

export type MahnState = ActionState & { ergebnis?: { nummer: string | null; ok: boolean; info: string }[] };

export async function sendeMahnungenAction(_p: MahnState, fd: FormData): Promise<MahnState> {
  let ergebnis: MahnState["ergebnis"];
  const res = await runAction(async () => {
    const ids = fd.getAll("ids").map(String).filter(Boolean);
    ergebnis = await sendeMahnungen(ids);
    revalidatePath("/rechnungen/mahnungen");
    revalidatePath("/rechnungen");
    const n = ergebnis.filter((e) => e.ok).length;
    return ok(`${n} von ${ergebnis.length} Mahnung(en) gesendet.`);
  });
  return (res ? { ...res, ergebnis } : res) as MahnState;
}
