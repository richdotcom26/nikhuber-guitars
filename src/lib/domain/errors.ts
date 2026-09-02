/**
 * Domänen-Fehler. Der Service-Layer wirft `DomainError`; Server Actions fangen ihn
 * und liefern ihn als `ActionState` an die UI zurück (siehe `action-state.ts`).
 */
export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "STATE";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: DomainErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
