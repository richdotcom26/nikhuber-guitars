"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addKommentar, createTicket, deleteTicket, setTicketStatus, ticketSchema, updateTicket,
} from "@/lib/domain/ticket";

const BASE = "/tickets";
const rev = (id?: string) => {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
};

export async function createTicketAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    id = await createTicket(parseForm(ticketSchema, fd));
    return ok("Ticket angelegt.");
  });
  if (id) redirect(`${BASE}/${id}`);
  return res;
}

export async function updateTicketAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateTicket(id, parseForm(ticketSchema, fd));
    rev(id);
    return ok("Gespeichert.");
  });
}

export async function setTicketStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await setTicketStatus(id, String(fd.get("status") ?? ""));
    rev(id);
    return ok("Status geändert.");
  });
}

export async function addKommentarAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const istRueckfrage = fd.get("istRueckfrage") === "on" || fd.get("istRueckfrage") === "true";
    await addKommentar(id, String(fd.get("text") ?? ""), istRueckfrage);
    rev(id);
    return ok(istRueckfrage ? "Rückfrage gestellt." : "Kommentar gespeichert.");
  });
}

export async function deleteTicketAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const res = await runAction(async () => {
    await deleteTicket(id);
    return ok("Gelöscht.");
  });
  if (res?.ok) {
    revalidatePath(BASE);
    redirect(BASE);
  }
  return res;
}
