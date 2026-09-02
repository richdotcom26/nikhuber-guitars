"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { setMengeAction } from "./actions";

/** Schnelle Mengenkorrektur direkt in der Liste (Inventur). */
export function MengeInline({
  id,
  menge,
  einheit,
}: {
  id: string;
  menge: string;
  einheit: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(setMengeAction, IDLE);
  const anzeige = `${Number(menge).toLocaleString("de-DE")}${einheit ? ` ${einheit}` : ""}`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tabular-nums hover:underline"
        title="Menge korrigieren"
      >
        {anzeige}
      </button>
    );
  }
  return (
    <form
      action={action}
      className="flex items-center gap-1"
      onSubmit={() => setTimeout(() => setOpen(false), 300)}
    >
      <input type="hidden" name="id" value={id} />
      <Input
        name="menge"
        defaultValue={menge}
        inputMode="decimal"
        autoFocus
        className="h-7 w-20 text-right"
      />
      <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
