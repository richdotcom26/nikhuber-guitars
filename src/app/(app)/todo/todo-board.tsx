"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import {
  TODO_PRIO, TODO_PRIO_LABEL, TODO_STATUS, type TodoPrio, type TodoStatus,
} from "@/lib/todo-shared";
import { formatDate } from "@/lib/utils";
import {
  createTodoAction, deleteTodoAction, setTodoStatusAction, updateTodoAction,
} from "./actions";

interface Mitarbeiter { id: string; name: string }

export interface TodoRow {
  id: string;
  aufgabe: string;
  prio: TodoPrio;
  status: TodoStatus;
  faelligBis: string | null;
  inArbeitSeit: string | null;
  erledigtAm: string | null;
  erinnerung: boolean;
  updatedAt: string;
  empfaengerId: string | null;
  absenderId: string | null;
  empfaengerName: string | null;
  absenderName: string | null;
  auftragId: string | null;
  auftragNummer: string | null;
}

export function TodoBoard({
  rows,
  mitarbeiter,
  currentUserId,
}: {
  rows: TodoRow[];
  mitarbeiter: Mitarbeiter[];
  currentUserId: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <span className="text-sm font-medium text-neutral-600">{rows.length} Aufgaben</span>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          {adding ? "Abbrechen" : "Neue Aufgabe"}
        </Button>
      </div>

      {adding ? (
        <div className="border-b border-neutral-100 bg-neutral-50 p-3">
          <TodoForm mitarbeiter={mitarbeiter} defaultEmpfaenger="" onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <Table>
        <THead>
          <TR>
            <TH className="w-28">Empfänger</TH>
            <TH className="w-24">Absender</TH>
            <TH className="w-28">Fällig</TH>
            <TH className="w-32">Status</TH>
            <TH className="w-24">Prio</TH>
            <TH>Aufgabe</TH>
            <TH className="w-24 text-right">Aktion</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TodoLine key={`${r.id}:${r.updatedAt}`} row={r} mitarbeiter={mitarbeiter} currentUserId={currentUserId} />
          ))}
          {rows.length === 0 ? (
            <TR><TD colSpan={7} className="py-6 text-center text-neutral-400">Keine Aufgaben.</TD></TR>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}

function TodoLine({
  row, mitarbeiter, currentUserId,
}: {
  row: TodoRow;
  mitarbeiter: Mitarbeiter[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState(false);
  const anMich = row.empfaengerId === currentUserId;
  const [stState, stAction] = useActionState(setTodoStatusAction, IDLE);
  const [delState, delAction] = useActionState(deleteTodoAction, IDLE);
  const stForm = useRef<HTMLFormElement>(null);

  if (editing) {
    return (
      <TR className="bg-neutral-50">
        <TD colSpan={7} className="py-2">
          <TodoForm
            row={row}
            mitarbeiter={mitarbeiter}
            defaultEmpfaenger={row.empfaengerId ?? ""}
            onDone={() => setEditing(false)}
          />
        </TD>
      </TR>
    );
  }

  const faellig = row.faelligBis;
  const ueberfaellig = faellig && row.status !== "ERLEDIGT" && faellig < new Date().toISOString().slice(0, 10);

  return (
    <TR className={anMich && row.status !== "ERLEDIGT" ? "bg-brand-soft/40" : ""}>
      <TD className="text-neutral-700">
        {row.empfaengerName ?? "–"}
        {anMich ? <span className="ml-1 text-xs text-brand">(ich)</span> : null}
      </TD>
      <TD className="text-neutral-500">
        {row.absenderId === currentUserId ? "ich" : row.absenderName ?? "–"}
      </TD>
      <TD className={ueberfaellig ? "font-medium text-red-600" : "text-neutral-500"}>
        {faellig ? formatDate(faellig) : "–"}
      </TD>
      <TD>
        <form ref={stForm} action={stAction}>
          <input type="hidden" name="id" value={row.id} />
          <Select
            name="status"
            defaultValue={row.status}
            className="h-7 w-32 text-xs"
            onChange={() => stForm.current?.requestSubmit()}
          >
            {TODO_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </form>
        {stState && !stState.ok ? <p className="text-xs text-red-600">{stState.message}</p> : null}
      </TD>
      <TD>
        <Badge tone={row.prio === "DRINGEND" ? "red" : "neutral"}>{TODO_PRIO_LABEL[row.prio]}</Badge>
      </TD>
      <TD>
        <div className="max-w-xl whitespace-pre-wrap text-sm text-neutral-700">{row.aufgabe}</div>
        {row.auftragNummer ? (
          <Link href={`/auftraege/${row.auftragId}`} className="text-xs text-blue-700 hover:underline">
            → {row.auftragNummer}
          </Link>
        ) : null}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearb.</Button>
          {row.absenderId === currentUserId ? (
            <form action={delAction} className="inline" onSubmit={(e) => { if (!confirm("Aufgabe löschen?")) e.preventDefault(); }}>
              <input type="hidden" name="id" value={row.id} />
              <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">×</SubmitButton>
            </form>
          ) : null}
        </div>
        {delState && !delState.ok ? <p className="text-right text-xs text-red-600">{delState.message}</p> : null}
      </TD>
    </TR>
  );
}

function TodoForm({
  row,
  mitarbeiter,
  defaultEmpfaenger,
  onDone,
}: {
  row?: TodoRow;
  mitarbeiter: Mitarbeiter[];
  defaultEmpfaenger: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(row ? updateTodoAction : createTodoAction, IDLE);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);

  return (
    <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      {row?.auftragId ? <input type="hidden" name="auftragId" value={row.auftragId} /> : null}
      <Textarea
        name="aufgabe"
        placeholder="Aufgabe …"
        defaultValue={row?.aufgabe ?? ""}
        required
        rows={2}
        className="sm:col-span-4"
      />
      <label className="flex flex-col gap-1 text-xs text-neutral-600">
        Empfänger
        <Select name="empfaengerId" defaultValue={defaultEmpfaenger} className="h-8">
          <option value="">–</option>
          {mitarbeiter.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-600">
        Priorität
        <Select name="prio" defaultValue={row?.prio ?? "GELEGENTLICH"} className="h-8">
          {TODO_PRIO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-neutral-600">
        Fällig bis
        <Input type="date" name="faelligBis" defaultValue={row?.faelligBis ?? ""} className="h-8" />
      </label>
      <div className="flex items-end gap-1">
        <SubmitButton size="sm">{row ? "Speichern" : "Anlegen"}</SubmitButton>
        <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
      </div>
      {state && !state.ok ? <FormMessage state={state} className="sm:col-span-4" /> : null}
    </form>
  );
}
