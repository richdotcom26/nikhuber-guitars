"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Select } from "@/components/ui/input";
import { type ActionState, IDLE } from "@/lib/domain/action-state";

/**
 * „Modellvorlage übernehmen" — kopiert die Default-Specs eines Modell-Artikels
 * auf den Beleg (Angebot oder Auftrag). Die eigentliche Server-Action wird von
 * der jeweiligen Detailseite hereingereicht (angebote/ bzw. auftraege/actions).
 */
export function VorlagePicker({
  id,
  hasVorlage,
  modelle,
  action,
}: {
  id: string;
  hasVorlage: boolean;
  modelle: { id: string; name: string }[];
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const [overwrite, setOverwrite] = useState(false);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="overwrite" value={String(overwrite || !hasVorlage)} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted">Modellvorlage</label>
        <Select name="modellId" defaultValue="" className="h-8 min-w-64">
          <option value="">– Modell wählen –</option>
          {modelle.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </div>
      {hasVorlage ? (
        <label className="flex items-center gap-1 text-xs text-muted">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          bestehende Specs ersetzen
        </label>
      ) : null}
      <SubmitButton size="sm" variant="outline" disabled={hasVorlage && !overwrite}>
        Vorlage übernehmen
      </SubmitButton>
      {state && !state.ok ? <FormMessage state={state} className="w-full" /> : null}
    </form>
  );
}
