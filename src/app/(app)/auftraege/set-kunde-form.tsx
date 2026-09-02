"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { setKundeAction } from "./actions";

export function SetKundeButton({ auftragId, kundeId }: { auftragId: string; kundeId: string }) {
  const [state, action] = useActionState(setKundeAction, IDLE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={auftragId} />
      <input type="hidden" name="kundeId" value={kundeId} />
      <SubmitButton size="sm" variant="outline" pendingText="…">Übernehmen</SubmitButton>
      {state && !state.ok ? <span className="ml-2 text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
