"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { deleteKundeAction } from "./actions";

export function DeleteKundeButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action] = useActionState(deleteKundeAction, IDLE);

  if (!confirm) {
    return (
      <Button variant="outline" className="text-red-600" onClick={() => setConfirm(true)}>
        Kontakt löschen
      </Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-neutral-600">Wirklich löschen?</span>
      <SubmitButton variant="destructive" size="sm" pendingText="Löschen …">Ja, löschen</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Abbrechen</Button>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
