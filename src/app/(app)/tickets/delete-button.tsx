"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { deleteTicketAction } from "./actions";

export function DeleteTicketButton({ id }: { id: string }) {
  const [state, action] = useActionState(deleteTicketAction, IDLE);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Ticket wirklich löschen? Kommentare gehen mit verloren.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="outline" className="text-red-600" pendingText="…">Löschen</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} className="mt-2" /> : null}
    </form>
  );
}
