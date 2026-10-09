"use client";

import { useActionState, useRef } from "react";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { setKundeAction } from "./actions";

/**
 * Kunde übernehmen. Ist schon ein Kunde eingetragen → Rückfrage „überschreiben?“;
 * gibt es Artikel-Positionen → Rückfrage „Preise nach Währung/Preisstaffel des neuen Kunden neu berechnen?“.
 */
export function SetKundeButton({
  angebotId, kundeId, kundeName, bisher, positionen,
}: { angebotId: string; kundeId: string; kundeName: string; bisher: string | null; positionen: number }) {
  const [state, action] = useActionState(setKundeAction, IDLE);
  const neuPreise = useRef<HTMLInputElement>(null);
  return (
    <form
      action={action}
      className="inline"
      onSubmit={(e) => {
        if (bisher && !confirm(`Bisherigen Kunden „${bisher}“ durch „${kundeName}“ ersetzen?`)) {
          e.preventDefault();
          return;
        }
        if (neuPreise.current) {
          neuPreise.current.value = bisher && positionen > 0 && confirm(
            `Preise der ${positionen} Position(en) neu berechnen (Währung / Preisstaffel von „${kundeName}“)?\n\n` +
            "OK = neu berechnen · Abbrechen = bisherige Preise behalten",
          ) ? "1" : "";
        }
      }}
    >
      <input type="hidden" name="id" value={angebotId} />
      <input type="hidden" name="kundeId" value={kundeId} />
      <input type="hidden" name="neuPreise" ref={neuPreise} defaultValue="" />
      <SubmitButton size="sm" variant="outline" pendingText="…">Übernehmen</SubmitButton>
      {state && !state.ok ? <span className="ml-2 text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
