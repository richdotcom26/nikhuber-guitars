"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { createRechnungAction } from "./actions";

export function CreateRechnungButton({ auftragId, label = "Rechnungsentwurf erstellen" }: { auftragId: string; label?: string }) {
  const [state, action] = useActionState(createRechnungAction, IDLE);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={auftragId} />
      <SubmitButton pendingText="…">{label}</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}
