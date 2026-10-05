"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { createRechnungOhneAuftragAction } from "../actions";

export function CreateRechnungButton({ kundeId }: { kundeId: string }) {
  const [state, action] = useActionState(createRechnungOhneAuftragAction, IDLE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="kundeId" value={kundeId} />
      <SubmitButton size="sm" pendingText="Anlegen …">Rechnung anlegen</SubmitButton>
      {state && !state.ok ? <span className="ml-2 text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
