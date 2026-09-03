"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { formatDate } from "@/lib/utils";
import { setAbwesenheitAction } from "./actions";

interface Mitarbeiter { id: string; name: string }

/** Nach dem Speichern remountet die Komponente über den `key` (Datum:Vertretung) der Seite. */
export function TodoAbwesenheit({
  abwesendBis,
  vertretungId,
  vertretungName,
  mitarbeiter,
}: {
  abwesendBis: string | null;
  vertretungId: string | null;
  vertretungName: string | null;
  mitarbeiter: Mitarbeiter[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(setAbwesenheitAction, IDLE);

  const aktiv = abwesendBis && abwesendBis >= new Date().toISOString().slice(0, 10);

  const INFO =
    "Trägst du dich als abwesend ein, kann die gewählte Vertretung bis zum Enddatum deine "
    + "offenen Aufgaben sehen, kommentieren, den Status ändern und – bei Bedarf – dauerhaft an "
    + "sich übernehmen. Alle Beteiligten sehen an der Aufgabe einen Abwesenheits-Hinweis. "
    + "Enddatum leer lassen beendet die Abwesenheit.";

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {aktiv ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-amber-800">
            🌴 Abwesend bis {formatDate(abwesendBis)} · Vertretung: {vertretungName ?? "–"}
          </span>
        ) : (
          <span className="text-neutral-500">Nicht als abwesend eingetragen.</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          {aktiv ? "ändern" : "Abwesenheit eintragen"}
        </Button>
        <span
          tabIndex={0}
          title={INFO}
          aria-label={INFO}
          className="cursor-help select-none rounded-full border border-neutral-300 px-1.5 text-xs text-neutral-500"
        >
          i
        </span>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-neutral-50 p-3 text-sm">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Abwesend bis
        <Input type="date" name="abwesendBis" defaultValue={abwesendBis ?? ""} className="h-8" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Vertretung
        <Select name="vertretungId" defaultValue={vertretungId ?? ""} className="h-8 w-44">
          <option value="">–</option>
          {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </label>
      <SubmitButton size="sm">Speichern</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
      <p className="w-full max-w-xl text-xs text-neutral-500">{INFO}</p>
      {state && !state.ok ? <FormMessage state={state} className="w-full" /> : null}
    </form>
  );
}
