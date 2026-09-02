"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import {
  deleteLagerortAction, saveHolzartAction, saveLagerortAction,
} from "./actions";

/* ------------------------------------------------------------------- Holzarten */

export interface HolzartRow {
  id: string;
  holz: string;
  botanischerName: string | null;
  herkunft: string | null;
  holzdichte: string | null;
  species: string | null;
  genus: string | null;
  info: string | null;
  updatedAt: string | Date;
}

export function HolzartenPanel({ rows }: { rows: HolzartRow[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Holzarten ({rows.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>{adding ? "Abbrechen" : "Neu"}</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH>Holz</TH><TH>Botanischer Name</TH><TH>Herkunft</TH>
              <TH className="w-24 text-right">Dichte</TH><TH className="w-24 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <HolzartRowEdit onDone={() => setAdding(false)} /> : null}
            {rows.map((r) => (
              <HolzartView key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HolzartView({ row }: { row: HolzartRow }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <HolzartRowEdit row={row} onDone={() => setEditing(false)} />;
  return (
    <TR>
      <TD className="font-medium">{row.holz}</TD>
      <TD className="text-neutral-500">{row.botanischerName ?? "–"}</TD>
      <TD className="text-neutral-500">{row.herkunft ?? "–"}</TD>
      <TD className="text-right tabular-nums">{row.holzdichte ?? "–"}</TD>
      <TD className="text-right">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
      </TD>
    </TR>
  );
}

function HolzartRowEdit({ row, onDone }: { row?: HolzartRow; onDone: () => void }) {
  const [state, action] = useActionState(saveHolzartAction, IDLE);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <TR className="bg-neutral-50">
      <TD colSpan={5} className="py-2">
        <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Input name="holz" placeholder="Holz" defaultValue={row?.holz ?? ""} required className="h-8" />
          <Input name="botanischerName" placeholder="Botanischer Name" defaultValue={row?.botanischerName ?? ""} className="h-8" />
          <Input name="herkunft" placeholder="Herkunft" defaultValue={row?.herkunft ?? ""} className="h-8" />
          <Input name="holzdichte" placeholder="Dichte" inputMode="decimal" defaultValue={row?.holzdichte ?? ""} className="h-8" />
          <Input name="species" placeholder="Species" defaultValue={row?.species ?? ""} className="h-8" />
          <Input name="genus" placeholder="Genus" defaultValue={row?.genus ?? ""} className="h-8" />
          <Input name="info" placeholder="Info" defaultValue={row?.info ?? ""} className="h-8 sm:col-span-3" />
          <div className="flex gap-1 sm:col-span-3">
            <SubmitButton size="sm">Speichern</SubmitButton>
            <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
            <FormMessage state={state && !state.ok ? state : null} className="w-full" />
          </div>
        </form>
      </TD>
    </TR>
  );
}

/* ------------------------------------------------------------------ Lagerorte */

export interface LagerortRow {
  id: string;
  code: string;
  bezeichnung: string | null;
  updatedAt: string | Date;
}

export function LagerortePanel({ rows }: { rows: LagerortRow[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Lagerorte ({rows.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>{adding ? "Abbrechen" : "Neu"}</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <THead><TR><TH className="w-32">Code</TH><TH>Bezeichnung</TH><TH className="w-28 text-right">Aktion</TH></TR></THead>
          <TBody>
            {adding ? <LagerortRowEdit onDone={() => setAdding(false)} /> : null}
            {rows.map((r) => (
              <LagerortView key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
            ))}
            {rows.length === 0 && !adding ? (
              <TR><TD colSpan={3} className="py-3 text-center text-neutral-400">Keine Lagerorte.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LagerortView({ row }: { row: LagerortRow }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteLagerortAction, IDLE);
  if (editing) return <LagerortRowEdit row={row} onDone={() => setEditing(false)} />;
  return (
    <TR>
      <TD className="font-mono">{row.code}</TD>
      <TD className="text-neutral-500">{row.bezeichnung ?? "–"}</TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
          <form action={delAction} className="inline">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
          </form>
        </div>
        {delState && !delState.ok ? <p className="text-right text-xs text-red-600">{delState.message}</p> : null}
      </TD>
    </TR>
  );
}

function LagerortRowEdit({ row, onDone }: { row?: LagerortRow; onDone: () => void }) {
  const [state, action] = useActionState(saveLagerortAction, IDLE);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <TR className="bg-neutral-50">
      <TD colSpan={3} className="py-2">
        <form action={action} className="flex flex-wrap items-center gap-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Input name="code" placeholder="Code" defaultValue={row?.code ?? ""} required className="h-8 w-32" />
          <Input name="bezeichnung" placeholder="Bezeichnung" defaultValue={row?.bezeichnung ?? ""} className="h-8 w-64" />
          <SubmitButton size="sm">Speichern</SubmitButton>
          <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
          <FormMessage state={state && !state.ok ? state : null} className="w-full" />
        </form>
      </TD>
    </TR>
  );
}
