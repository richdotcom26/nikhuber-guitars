"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionState, fail, ok, runAction } from "@/lib/domain/action-state";
import { belegMailSchema, sendeBelegMail } from "@/lib/domain/beleg-mail";

/** Allgemeine Kunden-Mail aus Angebot/Auftrag senden; danach zurück zum Beleg. */
export async function sendeBelegMailAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let zurueck: string | null = null;
  const res = await runAction(async () => {
    const input = belegMailSchema.parse({
      art: fd.get("art"),
      id: fd.get("id"),
      an: fd.get("an") ?? "",
      cc: fd.get("cc") ?? "",
      betreff: fd.get("betreff") ?? "",
      text: fd.get("text") ?? "",
      anhangIds: fd.getAll("anhangId").map(String),
    });
    const r = await sendeBelegMail(input);
    const pfad = input.art === "angebot" ? `/angebote/${input.id}` : `/auftraege/${input.id}`;
    revalidatePath(pfad);
    revalidatePath("/mailversand");
    if (!r.ok) return fail(r.message);
    zurueck = pfad;
    return ok(r.message);
  });
  if (zurueck) redirect(zurueck);
  return res;
}
