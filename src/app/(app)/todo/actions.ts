"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  createTodo, deleteTodo, setTodoStatus, todoSchema, updateTodo,
} from "@/lib/domain/todo";

const BASE = "/todo";

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
