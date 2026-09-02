"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type ActionState, IDLE } from "@/lib/domain/action-state";
import { deleteZahlungsbedingungAction, saveZahlungsbedingungAction } from "./actions";

interface Row {
  id: string;
  bezeichnung: string;
  bezeichnungEn: string | null;
  updatedAt: string | Date;
}

export function ZahlungenPanel({ rows }: { rows: Row[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Zahlungsbedingungen</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          {adding ? "Abbrechen" : "Neu"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <THead>
            <TR>
              <TH className="w-1/2">Bezeichnung (DE)</TH>
              <TH className="w-1/2">Bezeichnung (EN)</TH>
              <TH className="w-32 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <NewRow onDone={() => setAdding(false)} /> : null}
            {rows.map((r) => (
              // Key enthält updatedAt: nach erfolgreichem Speichern wechselt der Key
              // -> die Zeile wird frisch gemountet und fällt in den Ansichtsmodus zurück.
              <ExistingRow key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
            ))}
            {rows.length === 0 && !adding ? (
              <TR><TD colSpan={3} className="py-4 text-center text-neutral-400">Keine Einträge.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewRow({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState(saveZahlungsbedingungAction, IDLE);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <TR>
      <TD colSpan={3} className="py-2">
        <RowForm action={action} state={state} />
      </TD>
    </TR>
  );
}

function ExistingRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction] = useActionState(saveZahlungsbedingungAction, IDLE);
  const [delState, delAction] = useActionState(deleteZahlungsbedingungAction, IDLE);

  if (editing) {
    return (
      <TR>
        <TD colSpan={3} className="py-2">
          <RowForm
            action={saveAction}
            state={saveState}
            row={row}
            onCancel={() => setEditing(false)}
          />
        </TD>
      </TR>
    );
  }

  return (
    <TR>
      <TD>{row.bezeichnung}</TD>
      <TD className="text-neutral-500">{row.bezeichnungEn ?? "–"}</TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
          <form action={delAction} className="inline">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">
              Löschen
            </SubmitButton>
          </form>
        </div>
        {delState && !delState.ok ? (
          <p className="mt-1 text-right text-xs text-red-600">{delState.message}</p>
        ) : null}
      </TD>
    </TR>
  );
}

function RowForm({
  action,
  state,
  row,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: ActionState;
  row?: Row;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Input
        name="bezeichnung"
        placeholder="Bezeichnung (DE)"
        defaultValue={row?.bezeichnung ?? ""}
        required
        className="w-56"
      />
      <Input
        name="bezeichnungEn"
        placeholder="Bezeichnung (EN)"
        defaultValue={row?.bezeichnungEn ?? ""}
        className="w-56"
      />
      <SubmitButton size="sm">Speichern</SubmitButton>
      {onCancel ? (
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      ) : null}
      <FormMessage state={state && !state.ok ? state : null} className="w-full" />
    </form>
  );
}
