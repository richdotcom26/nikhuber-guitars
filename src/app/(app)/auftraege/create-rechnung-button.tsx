"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { createRechnungAction } from "./actions";

export function CreateRechnungButton({
  auftragId, label = "Rechnungsentwurf erstellen", hinweise = [],
}: {
  auftragId: string;
  label?: string;
  /** Fehlende Angaben (Kunde, Versandkosten, Modell) — vor dem Erstellen nachfragen. */
  hinweise?: string[];
}) {
  const [state, action] = useActionState(createRechnungAction, IDLE);
  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        const text = `Bitte prüfen:\n\n• ${hinweise.join("\n• ")}\n\nRechnungsentwurf trotzdem erstellen?`;
        if (hinweise.length && !confirm(text)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={auftragId} />
      <SubmitButton pendingText="…">{label}</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}
