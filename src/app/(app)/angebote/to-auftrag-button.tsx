"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { angebotToAuftragAction } from "./actions";

export function ToAuftragButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action] = useActionState(angebotToAuftragAction, IDLE);

  if (!confirm) {
    return (
      <Button variant="outline" onClick={() => setConfirm(true)} disabled={disabled}>
        Auftrag erstellen
      </Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-neutral-600">Angebot in Auftrag übernehmen?</span>
      <SubmitButton size="sm" pendingText="…">Ja, erstellen</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Abbrechen</Button>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
