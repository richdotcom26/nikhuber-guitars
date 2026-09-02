"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type ActionState, IDLE } from "@/lib/domain/action-state";
import { deleteAnsprechpartnerAction, saveAnsprechpartnerAction } from "./actions";

export interface AnsprechpartnerRow {
  id: string;
  anrede: string | null;
  vorname: string | null;
  nachname: string | null;
  briefanredeIndividuell: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  telefax: string | null;
  position: string | null;
  primaereEmail: boolean;
  fuerBriefkopf: boolean;
  updatedAt: string | Date;
}

const POSITIONEN = [
  { v: "", l: "–" },
  { v: "ALLGEMEIN", l: "Allgemein" },
  { v: "MITARBEITER", l: "Mitarbeiter" },
  { v: "RECHNUNGSKONTAKT", l: "Rechnungskontakt" },
];
const ANREDEN = ["", "HERR", "FRAU", "MR", "MRS"];

export function AnsprechpartnerPanel({
  kundeId,
  rows,
}: {
  kundeId: string;
  rows: AnsprechpartnerRow[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ansprechpartner ({rows.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          {adding ? "Abbrechen" : "Neu"}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Position</TH>
              <TH>E-Mail</TH>
              <TH>Telefon</TH>
              <TH className="w-16">prim.</TH>
              <TH className="w-28 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <NewRow kundeId={kundeId} onDone={() => setAdding(false)} /> : null}
            {rows.map((r) => (
              <ExistingRow key={`${r.id}:${new Date(r.updatedAt).getTime()}`} kundeId={kundeId} row={r} />
            ))}
            {rows.length === 0 && !adding ? (
              <TR><TD colSpan={6} className="py-4 text-center text-neutral-400">Keine Ansprechpartner.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NewRow({ kundeId, onDone }: { kundeId: string; onDone: () => void }) {
  const [state, action] = useActionState(saveAnsprechpartnerAction, IDLE);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <TR>
      <TD colSpan={6} className="py-2">
        <RowForm kundeId={kundeId} action={action} state={state} />
      </TD>
    </TR>
  );
}

function ExistingRow({ kundeId, row }: { kundeId: string; row: AnsprechpartnerRow }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteAnsprechpartnerAction, IDLE);
  const [saveState, saveAction] = useActionState(saveAnsprechpartnerAction, IDLE);

  if (editing) {
    return (
      <TR>
        <TD colSpan={6} className="py-2">
          <RowForm kundeId={kundeId} action={saveAction} state={saveState} row={row}
            onCancel={() => setEditing(false)} />
        </TD>
      </TR>
    );
  }
  const name = [row.vorname, row.nachname].filter(Boolean).join(" ") || "–";
  return (
    <TR>
      <TD className="font-medium">{name}</TD>
      <TD className="text-neutral-500">
        {POSITIONEN.find((p) => p.v === (row.position ?? ""))?.l ?? "–"}
      </TD>
      <TD className="text-neutral-500">{row.email ?? "–"}</TD>
      <TD className="text-neutral-500">{row.telefon ?? row.mobil ?? "–"}</TD>
      <TD>{row.primaereEmail ? "✓" : ""}</TD>
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
  row?: AnsprechpartnerRow;
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input type="hidden" name="kundeId" value={kundeId} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <div className="flex gap-2">
        <Select name="anrede" defaultValue={row?.anrede ?? ""} className="h-8 w-24">
          {ANREDEN.map((a) => <option key={a} value={a}>{a || "–"}</option>)}
        </Select>
        <Input name="vorname" placeholder="Vorname" defaultValue={row?.vorname ?? ""} className="h-8" />
        <Input name="nachname" placeholder="Nachname" defaultValue={row?.nachname ?? ""} className="h-8" />
      </div>
      <Select name="position" defaultValue={row?.position ?? ""} className="h-8">
        {POSITIONEN.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
      </Select>
      <Input name="email" type="email" placeholder="E-Mail" defaultValue={row?.email ?? ""} className="h-8" />
      <Input name="telefon" placeholder="Telefon" defaultValue={row?.telefon ?? ""} className="h-8" />
      <Input name="mobil" placeholder="Mobil" defaultValue={row?.mobil ?? ""} className="h-8" />
      <Input name="briefanredeIndividuell" placeholder="Briefanrede (individuell)"
        defaultValue={row?.briefanredeIndividuell ?? ""} className="h-8" />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="primaereEmail" defaultChecked={row?.primaereEmail ?? false} />
        Primärer E-Mail-Empfänger (AB / Rechnung)
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" name="fuerBriefkopf" defaultChecked={row?.fuerBriefkopf ?? false} />
        Für Briefkopf
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton size="sm">Speichern</SubmitButton>
        {onCancel ? <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button> : null}
        <FormMessage state={state && !state.ok ? state : null} className="w-full" />
      </div>
    </form>
  );
}
