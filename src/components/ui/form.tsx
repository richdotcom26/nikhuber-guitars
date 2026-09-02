"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/domain/action-state";
import { Button, type ButtonProps } from "./button";

/** Submit-Button, der während des Action-Laufs automatisch `disabled` + Ladetext zeigt. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingText ?? "Speichern …") : children}
    </Button>
  );
}

/** Erfolgs-/Fehlerhinweis aus `useActionState`. */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800",
        className,
      )}
    >
      {state.ok ? (state.message ?? "Gespeichert.") : state.message}
    </p>
  );
}
