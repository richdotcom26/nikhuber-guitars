"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  createMailversand, deleteMailversand, mailversandSchema, sendeMailversand, setMailStatus,
} from "@/lib/domain/mailversand";

const BASE = "/mailversand";

export async function createMailversandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await createMailversand(parseForm(mailversandSchema, fd));
    return ok("Eintrag angelegt.");
  });
  if (id) redirect(`${BASE}/${id}`);
  return res;
}

export async function setMailStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await setMailStatus(id, String(fd.get("status") ?? ""));
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return ok("Status geändert.");
  });
}

export async function sendeMailAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const res = await sendeMailversand(id);
    revalidatePath(`${BASE}/${id}`);
    revalidatePath(BASE);
    return res.ok ? ok(res.message) : fail(res.message);
  });
}

export async function deleteMailversandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const res = await runAction(async () => {
    await deleteMailversand(id);
    return ok("Gelöscht.");
  });
  if (res?.ok) {
    revalidatePath(BASE);
    redirect(BASE);
  }
  return res;
}
