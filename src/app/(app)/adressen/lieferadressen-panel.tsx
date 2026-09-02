"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type ActionState, IDLE } from "@/lib/domain/action-state";
import { deleteLieferadresseAction, saveLieferadresseAction } from "./actions";

export interface LieferadresseRow {
  id: string;
  nr: number | null;
  firma: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
  updatedAt: string | Date;
}

export function LieferadressenPanel({
  kundeId,
  rows,
}: {
  kundeId: string;
  rows: LieferadresseRow[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weitere Lieferadressen ({rows.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          {adding ? "Abbrechen" : "Neu"}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH className="w-12">Nr</TH>
              <TH>Empfänger</TH>
              <TH>Adresse</TH>
              <TH className="w-28 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <NewRow kundeId={kundeId} onDone={() => setAdding(false)} /> : null}
            {rows.map((r) => (
              <ExistingRow key={`${r.id}:${new Date(r.updatedAt).getTime()}`} kundeId={kundeId} row={r} />
            ))}
            {rows.length === 0 && !adding ? (
              <TR><TD colSpan={4} className="py-4 text-center text-neutral-400">Keine weiteren Lieferadressen.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewRow({ kundeId, onDone }: { kundeId: string; onDone: () => void }) {
  const [state, action] = useActionState(saveLieferadresseAction, IDLE);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <TR>
      <TD colSpan={4} className="py-2">
        <RowForm kundeId={kundeId} action={action} state={state} />
      </TD>
    </TR>
  );
}

function ExistingRow({ kundeId, row }: { kundeId: string; row: LieferadresseRow }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteLieferadresseAction, IDLE);
  const [saveState, saveAction] = useActionState(saveLieferadresseAction, IDLE);

  if (editing) {
    return (
      <TR>
        <TD colSpan={4} className="py-2">
          <RowForm kundeId={kundeId} action={saveAction} state={saveState} row={row}
            onCancel={() => setEditing(false)} />
        </TD>
      </TR>
    );
  }
  const empf = [row.firma, [row.vorname, row.nachname].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "–";
  const adr = [row.strasse, [row.plz, row.ort].filter(Boolean).join(" "), row.land].filter(Boolean).join(", ") || "–";
  return (
    <TR>
      <TD className="tabular-nums">{row.nr ?? "–"}</TD>
      <TD className="font-medium">{empf}</TD>
      <TD className="text-neutral-500">{adr}</TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
          <form action={delAction} className="inline">
            <input type="hidden" name="kundeId" value={kundeId} />
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
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
  kundeId,
  action,
  state,
  row,
  onCancel,
}: {
  kundeId: string;
  action: (fd: FormData) => void;
  state: ActionState;
  row?: LieferadresseRow;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <input type="hidden" name="kundeId" value={kundeId} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <Input name="nr" inputMode="numeric" placeholder="Nr" defaultValue={row?.nr ?? ""} className="h-8" />
      <Input name="firma" placeholder="Firma" defaultValue={row?.firma ?? ""} className="h-8" />
      <div className="flex gap-2">
        <Input name="vorname" placeholder="Vorname" defaultValue={row?.vorname ?? ""} className="h-8" />
        <Input name="nachname" placeholder="Nachname" defaultValue={row?.nachname ?? ""} className="h-8" />
      </div>
      <Input name="strasse" placeholder="Straße" defaultValue={row?.strasse ?? ""} className="h-8" />
      <Input name="plz" placeholder="PLZ" defaultValue={row?.plz ?? ""} className="h-8" />
      <Input name="ort" placeholder="Ort" defaultValue={row?.ort ?? ""} className="h-8" />
      <Input name="land" placeholder="Land" defaultValue={row?.land ?? ""} className="h-8" />
      <div className="flex gap-2 sm:col-span-3">
        <SubmitButton size="sm">Speichern</SubmitButton>
        {onCancel ? <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button> : null}
        <FormMessage state={state && !state.ok ? state : null} className="w-full" />
      </div>
    </form>
  );
}
