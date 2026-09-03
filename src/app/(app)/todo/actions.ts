"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addTodoKommentar, createTodo, deleteTodo, setTodoStatus, todoSchema, todoVerlauf, updateTodo,
} from "@/lib/domain/todo";

const BASE = "/todo";

export interface VerlaufEintrag {
  id: string;
  text: string | null;
  statusNachher: string | null;
  autorName: string | null;
  weitergabeAnName: string | null;
  createdAt: string;
}

export async function todoVerlaufAction(id: string): Promise<VerlaufEintrag[]> {
  const rows = await todoVerlauf(id);
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    statusNachher: r.statusNachher,
    autorName: r.autorName,
    weitergabeAnName: r.weitergabeAnName,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  }));
}

export async function createTodoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await createTodo(parseForm(todoSchema, fd));
    revalidatePath(BASE);
    return ok("Aufgabe angelegt.");
  });
}

export async function updateTodoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await updateTodo(String(fd.get("id") ?? ""), parseForm(todoSchema, fd));
    revalidatePath(BASE);
    return ok("Gespeichert.");
  });
}

export async function setTodoStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await setTodoStatus(String(fd.get("id") ?? ""), String(fd.get("status") ?? ""));
    revalidatePath(BASE);
    return ok("Status geändert.");
  });
}

export async function deleteTodoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteTodo(String(fd.get("id") ?? ""));
    revalidatePath(BASE);
    return ok("Gelöscht.");
  });
}

export async function addTodoKommentarAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await addTodoKommentar(String(fd.get("id") ?? ""), {
      text: String(fd.get("text") ?? ""),
      antworten: fd.get("antworten") === "1",
    });
    revalidatePath(BASE);
    return ok("Gespeichert.");
  });
}
