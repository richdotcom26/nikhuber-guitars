"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import {
  TODO_PRIO, TODO_PRIO_LABEL, TODO_STATUS, TODO_STATUS_LABEL,
  type TodoPrio, type TodoStatus,
} from "@/lib/todo-shared";
import { formatDate } from "@/lib/utils";
import {
  addTodoKommentarAction, createTodoAction, deleteTodoAction, markErledigtGesehenAction,
  setTodoStatusAction, todoVerlaufAction, uebernehmenTodoAction, updateTodoAction,
  type VerlaufEintrag,
} from "./actions";

interface Mitarbeiter { id: string; name: string }
type Modus = "normal" | "vertretung";

export interface TodoRow {
  id: string;
  aufgabe: string;
  prio: TodoPrio;
  status: TodoStatus;
  faelligBis: string | null;
  inArbeitSeit: string | null;
  erledigtAm: string | null;
  erledigtGesehen: boolean;
  erinnerung: boolean;
  updatedAt: string;
  empfaengerId: string | null;
  absenderId: string | null;
  aktuellBeiId: string | null;
  empfaengerName: string | null;
  absenderName: string | null;
  aktuellBeiName: string | null;
  aktuellBeiAbwesendBis: string | null;
  aktuellBeiVertretungName: string | null;
  auftragId: string | null;
  auftragNummer: string | null;
  kommentarAnzahl: number;
}

export function TodoBoard({
  rows,
  mitarbeiter,
  currentUserId,
  modus = "normal",
}: {
  rows: TodoRow[];
  mitarbeiter: Mitarbeiter[];
  modus?: Modus;
  currentUserId: string;
}) {
  const [adding, setAdding] = useState(false);
  // offene Detail-Panels hier halten -> überleben das Remount einer Zeile nach dem Kommentieren
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOffen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const vertretung = modus === "vertretung";

  return (
    <div>
      {!vertretung ? (
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
          <span className="text-sm font-medium text-neutral-600">{rows.length} Aufgaben</span>
          <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
            {adding ? "Abbrechen" : "Neue Aufgabe"}
          </Button>
        </div>
      ) : null}

      {adding ? (
        <div className="border-b border-neutral-100 bg-neutral-50 p-3">
          <TodoForm mitarbeiter={mitarbeiter} defaultEmpfaenger="" onDone={() => setAdding(false)} />
        </div>
      ) : null}

      <Table>
        <THead>
          <TR>
            <TH className="w-24">Empfänger</TH>
            <TH className="w-20">Absender</TH>
            <TH className="w-24">liegt bei</TH>
            <TH className="w-24">Fällig</TH>
            <TH className="w-32">Status</TH>
            <TH className="w-20">Prio</TH>
            <TH>Aufgabe</TH>
            <TH className="w-48 text-right">Aktion</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TodoLine
              key={`${r.id}:${r.updatedAt}`}
              row={r}
              mitarbeiter={mitarbeiter}
              currentUserId={currentUserId}
              modus={modus}
              detailOffen={offen.has(r.id)}
              onToggleDetail={() => toggle(r.id)}
            />
          ))}
          {rows.length === 0 ? (
            <TR><TD colSpan={8} className="py-6 text-center text-neutral-400">Keine Aufgaben.</TD></TR>
          ) : null}
        </TBody>
      </Table>
    </div>
  );
}

function TodoLine({
  row, mitarbeiter, currentUserId, modus, detailOffen, onToggleDetail,
}: {
  row: TodoRow;
  mitarbeiter: Mitarbeiter[];
  currentUserId: string;
  modus: Modus;
  detailOffen: boolean;
  onToggleDetail: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const anMich = row.aktuellBeiId === currentUserId;
  const [stState, stAction] = useActionState(setTodoStatusAction, IDLE);
  const [delState, delAction] = useActionState(deleteTodoAction, IDLE);
  const [ueState, ueAction] = useActionState(uebernehmenTodoAction, IDLE);
  const stForm = useRef<HTMLFormElement>(null);

  const heute = new Date().toISOString().slice(0, 10);
  const beiAbwesend = !!row.aktuellBeiAbwesendBis && row.aktuellBeiAbwesendBis >= heute
    && row.aktuellBeiId !== currentUserId;
  // von der anderen Seite erledigt, ich (Absender) habe es noch nicht quittiert
  const erledigtNeu = row.status === "ERLEDIGT" && !row.erledigtGesehen
    && row.absenderId === currentUserId;

  if (editing) {
    return (
      <TR className="bg-neutral-50">
        <TD colSpan={8} className="py-2">
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
  const beiMir = row.aktuellBeiId === currentUserId;

  return (
    <>
      <TR className={erledigtNeu ? "bg-green-50" : anMich && row.status !== "ERLEDIGT" ? "bg-brand-soft/40" : ""}>
        <TD className="text-neutral-700">
          {row.empfaengerId === currentUserId ? "ich" : row.empfaengerName ?? "–"}
        </TD>
        <TD className="text-neutral-500">
          {row.absenderId === currentUserId ? "ich" : row.absenderName ?? "–"}
        </TD>
        <TD className={beiMir ? "text-xs font-medium text-brand" : "text-xs text-neutral-500"}>
          {beiMir ? "bei mir" : row.aktuellBeiName ?? "–"}
          {beiAbwesend ? (
            <div className="text-[11px] text-amber-700">
              🌴 abwesend bis {formatDate(row.aktuellBeiAbwesendBis)}
              {row.aktuellBeiVertretungName ? ` · Vertr.: ${row.aktuellBeiVertretungName}` : ""}
            </div>
          ) : null}
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
          <button
            type="button"
            onClick={onToggleDetail}
            title="Verlauf / Kommentare öffnen"
            className="max-w-xl cursor-pointer whitespace-pre-wrap text-left text-sm text-neutral-700 hover:text-brand hover:underline"
          >
            {row.aufgabe}
          </button>
          {erledigtNeu ? (
            <div className="mt-1 text-xs font-medium text-green-700">
              ✓ erledigt{row.empfaengerName ? ` von ${row.empfaengerName}` : ""}
              {row.erledigtAm ? ` am ${formatDate(row.erledigtAm)}` : ""}
            </div>
          ) : null}
          {row.kommentarAnzahl > 0 ? (
            <div>
              <button
                type="button"
                onClick={onToggleDetail}
                title={`${row.kommentarAnzahl} Kommentar${row.kommentarAnzahl === 1 ? "" : "e"} / Rückfragen — Verlauf öffnen`}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand hover:bg-brand/20"
              >
                💬 Konversation ({row.kommentarAnzahl})
              </button>
            </div>
          ) : null}
          {row.auftragNummer ? (
            <div>
              <Link href={`/auftraege/${row.auftragId}`} className="text-xs text-blue-700 hover:underline">
                → {row.auftragNummer}
              </Link>
            </div>
          ) : null}
        </TD>
        <TD className="text-right">
          <div className="flex flex-wrap justify-end gap-1">
            {erledigtNeu ? (
              <form action={markErledigtGesehenAction} className="inline">
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-lg bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700"
                  title="Erledigung zur Kenntnis nehmen – blendet die Meldung aus"
                >
                  ✓ gesehen
                </button>
              </form>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleDetail}
              title="Verlauf, Kommentare und Rückfragen"
            >
              {detailOffen ? "▾ schließen" : `💬 Verlauf${row.kommentarAnzahl > 0 ? ` (${row.kommentarAnzahl})` : ""}`}
            </Button>
            {modus === "vertretung" ? (
              !beiMir ? (
                <form action={ueAction} className="inline">
                  <input type="hidden" name="id" value={row.id} />
                  <SubmitButton size="sm" variant="outline" pendingText="…">übernehmen</SubmitButton>
                </form>
              ) : <span className="text-xs text-brand">übernommen</span>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearb.</Button>
                {row.absenderId === currentUserId ? (
                  <form action={delAction} className="inline" onSubmit={(e) => { if (!confirm("Aufgabe löschen?")) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">×</SubmitButton>
                  </form>
                ) : null}
              </>
            )}
          </div>
          {delState && !delState.ok ? <p className="text-right text-xs text-red-600">{delState.message}</p> : null}
          {ueState && !ueState.ok ? <p className="text-right text-xs text-red-600">{ueState.message}</p> : null}
        </TD>
      </TR>
      {detailOffen ? (
        <TR>
          <TD colSpan={8} className="bg-neutral-50 p-0">
            <TodoDetail row={row} currentUserId={currentUserId} />
          </TD>
        </TR>
      ) : null}
    </>
  );
}

function TodoDetail({ row, currentUserId }: { row: TodoRow; currentUserId: string }) {
  const [verlauf, setVerlauf] = useState<VerlaufEintrag[] | null>(null);
  const [pending, start] = useTransition();
  const [state, action] = useActionState(addTodoKommentarAction, IDLE);
  const beiMir = row.aktuellBeiId === currentUserId;

  // Beim (Re-)Mount laden. Nach einem Kommentar sorgt revalidatePath für ein neues
  // row.updatedAt -> die Zeile (Key) remountet -> dieses Panel lädt frisch, Textfeld leer.
  useEffect(() => {
    start(async () => setVerlauf(await todoVerlaufAction(row.id)));
  }, [row.id]);

  return (
    <div className="space-y-3 px-3 py-3 text-sm">
      <div className="space-y-2">
        {verlauf === null && pending ? <p className="text-xs text-neutral-400">lädt …</p> : null}
        {verlauf && verlauf.length === 0 ? (
          <p className="text-xs text-neutral-400">Noch keine Einträge.</p>
        ) : null}
        {verlauf?.map((e) => (
          <div key={e.id} className="rounded-md border border-line bg-white px-2.5 py-1.5">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-ink">{e.autorName ?? "?"}</span>
              <span>{new Date(e.createdAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</span>
              {e.statusNachher ? (
                <Badge tone="blue">Status → {TODO_STATUS_LABEL[e.statusNachher as TodoStatus] ?? e.statusNachher}</Badge>
              ) : null}
              {e.weitergabeAnName ? <Badge tone="amber">→ {e.weitergabeAnName}</Badge> : null}
            </div>
            {e.text ? <p className="mt-1 whitespace-pre-wrap text-ink">{e.text}</p> : null}
          </div>
        ))}
      </div>

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={row.id} />
        <Textarea
          name="text"
          defaultValue=""
          placeholder={beiMir ? "Kommentar oder Rückfrage …" : "Kommentar …"}
          rows={2}
          className="w-full"
        />
        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm" variant="outline" pendingText="…">Kommentar</SubmitButton>
          <button
            type="submit"
            name="antworten"
            value="1"
            className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Antworten &amp; zurück an {row.absenderId === currentUserId ? (row.empfaengerName ?? "Empfänger") : (row.absenderName ?? "Absender")}
          </button>
        </div>
        {state && !state.ok ? <FormMessage state={state} /> : null}
      </form>
    </div>
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
