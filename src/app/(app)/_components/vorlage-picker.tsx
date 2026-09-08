"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Select } from "@/components/ui/input";
import { type ActionState, IDLE } from "@/lib/domain/action-state";

/**
 * „Modellvorlage übernehmen" — stempelt die Default-Specs eines Modell-Artikels
 * auf den Beleg (Angebot oder Auftrag): alle Slot-Belegungen werden ersetzt und
 * die vier Freitext-Abschnitte mit denen des Modells überschrieben.
 *
 * Ist schon eine Vorlage gesetzt oder stehen bereits Specs am Beleg, wird vor
 * dem Übernehmen einmal rückgefragt. Die eigentliche Server-Action reicht die
 * jeweilige Detailseite herein (angebote/ bzw. auftraege/actions).
 */
export function VorlagePicker({
  id,
  hasVorlage,
  hasSpecs = false,
  currentModellId = null,
  modelle,
  action,
}: {
  id: string;
  hasVorlage: boolean;
  hasSpecs?: boolean;
  /** Aktuell am Beleg gesetzte Modellvorlage (Artikel-ID) — für die Anzeige „Übernommene Vorlage". */
  currentModellId?: string | null;
  /** `name` = Dropdown-Label, `nameLang` = Anzeige im Feld „Übernommene Vorlage". */
  modelle: { id: string; name: string; nameLang?: string | null }[];
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [modellId, setModellId] = useState("");

  const needsConfirm = hasVorlage || hasSpecs;
  const currentModell = currentModellId ? modelle.find((m) => m.id === currentModellId) : undefined;
  const currentName = currentModellId
    ? (currentModell?.nameLang || currentModell?.name || "unbekannt")
    : null;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!modellId) {
          e.preventDefault();
          return;
        }
        if (
          needsConfirm &&
          !window.confirm(
            "Modellvorlage übernehmen? Alle Specs-Felder und Freitexte in diesem Beleg werden dabei überschrieben.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="overwrite" value="true" />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted">Modellvorlage</label>
        <Select
          name="modellId"
          value={modellId}
          onChange={(e) => setModellId(e.target.value)}
          className="h-8 min-w-64"
        >
          <option value="">– Modell wählen –</option>
          {modelle.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending || !modellId}>
        {pending ? "Übernehme …" : "Vorlage übernehmen"}
      </Button>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted">Übernommene Vorlage</label>
        <div
          className="flex h-8 min-w-48 items-center rounded-lg border border-field-border bg-field px-2.5 text-sm text-ink"
          title={currentName ?? undefined}
        >
          {currentName ?? <span className="text-muted">– keine –</span>}
        </div>
      </div>
      {state ? <FormMessage state={state} className="w-full" /> : null}
    </form>
  );
}
