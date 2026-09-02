import { z } from "zod";
import { DomainError, isDomainError } from "./errors";

/**
 * Rückgabewert jeder Server Action. Passt zu `useActionState` in Client-Formularen.
 * `ok:true`  -> optional `message` (Erfolgshinweis)
 * `ok:false` -> `message` (Fehlertext) + optional `fieldErrors` (pro Feld)
 */
export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }
  | null;

export const IDLE: ActionState = null;

/** Erfolg. */
export function ok(message?: string): ActionState {
  return { ok: true, message };
}

/** Fehler. */
export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionState {
  return { ok: false, message, fieldErrors };
}

/**
 * Standard-Hülle für Server Actions: fängt `DomainError` und Zod-Fehler ab und
 * übersetzt sie in `ActionState`. Alles andere wird geloggt und generisch gemeldet.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof z.ZodError) {
      return fail("Bitte Eingaben prüfen.", z.flattenError(e).fieldErrors as Record<string, string[]>);
    }
    if (isDomainError(e)) {
      return fail(e.message, e.fieldErrors);
    }
    console.error("[action] unerwarteter Fehler:", e);
    return fail("Unerwarteter Fehler. Bitte erneut versuchen.");
  }
}

/** Zod-Schema gegen FormData prüfen; wirft `DomainError('VALIDATION')` mit fieldErrors. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new DomainError(
      "VALIDATION",
      "Bitte Eingaben prüfen.",
      z.flattenError(result.error).fieldErrors as Record<string, string[]>,
    );
  }
  return result.data;
}
