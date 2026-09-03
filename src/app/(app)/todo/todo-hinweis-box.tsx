"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { setTodoHinweisAction } from "./actions";

/**
 * Hinweis: Nach erfolgreichem Speichern revalidiert die Seite und montiert diese
 * Komponente über den `key` (Zeitstempel) neu — dabei fällt `editing` auf false zurück.
 */
export function TodoHinweisBox({
  hinweis,
  stand,
  canEdit,
}: {
  hinweis: string | null;
  stand: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(setTodoHinweisAction, IDLE);

  if (!hinweis && !editing) {
    if (!canEdit) return null;
    return (
      <div className="mb-4">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Aushang für alle einblenden
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <form
        action={action}
        className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3"
      >
        <label className="mb-1 block text-xs font-medium text-amber-800">
          Aushang oben im ToDo-Reiter (für alle sichtbar)
        </label>
        <Textarea
          name="text"
          defaultValue={hinweis ?? ""}
          rows={3}
          placeholder="Nachricht an alle Mitarbeiter … (leer lassen = ausblenden)"
          className="w-full bg-white"
        />
        <div className="mt-2 flex gap-2">
          <SubmitButton size="sm">Speichern</SubmitButton>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
        </div>
        {state && !state.ok ? <FormMessage state={state} className="mt-1" /> : null}
      </form>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <span aria-hidden className="mt-0.5 text-lg leading-none">📌</span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm font-medium text-amber-900">{hinweis}</p>
        {stand ? (
          <p className="mt-1 text-xs text-amber-700">
            Stand {new Date(stand).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        ) : null}
      </div>
      {canEdit ? (
        <Button size="sm" variant="ghost" className="shrink-0 text-amber-800" onClick={() => setEditing(true)}>
          bearbeiten
        </Button>
      ) : null}
    </div>
  );
}
