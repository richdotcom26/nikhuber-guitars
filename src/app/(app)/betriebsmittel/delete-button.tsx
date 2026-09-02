"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { deleteBetriebsmittelAction } from "./actions";

export function DeleteBetriebsmittelButton({ id }: { id: string }) {
  const [state, action] = useActionState(deleteBetriebsmittelAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Betriebsmittel wirklich löschen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="outline" className="text-red-600" pendingText="…">Löschen</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} className="mt-2" /> : null}
    </form>
  );
}
