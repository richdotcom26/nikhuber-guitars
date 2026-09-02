"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import {
  benutzerRecoveryLinkAction, createBenutzerAction, updateBenutzerAction,
} from "./actions";

const ROLLEN = ["ADMIN", "BUERO", "WERKSTATT"] as const;

export interface BenutzerRow {
  id: string;
  email: string;
  name: string;
  rolle: "ADMIN" | "BUERO" | "WERKSTATT";
  aktiv: boolean;
  kannTodo: boolean;
  kannWerkstatt: boolean;
  initialen: string | null;
  hatLogin: boolean;
  istIch: boolean;
  updatedAt: string | Date;
}

export function BenutzerPanel({ rows }: { rows: BenutzerRow[] }) {
  const [adding, setAdding] = useState(false);
  const [addState, addAction] = useActionState(createBenutzerAction, IDLE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benutzer ({rows.length})</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
          {adding ? "Abbrechen" : "Neuer Benutzer"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding ? (
          <form action={addAction} className="grid grid-cols-1 gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-3">
            <Input name="email" type="email" placeholder="E-Mail" required className="h-8" />
            <Input name="name" placeholder="Name" required className="h-8" />
            <Select name="rolle" defaultValue="WERKSTATT" className="h-8">
              {ROLLEN.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="kannWerkstatt" defaultChecked /> Werkstatt</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="kannTodo" defaultChecked /> ToDo-Empfänger</label>
            <div className="flex items-center gap-2 sm:col-span-3">
              <SubmitButton size="sm">Anlegen &amp; Einladung erzeugen</SubmitButton>
              <span className="text-xs text-neutral-400">Der Benutzer bekommt keinen Passwort-Mailversand — der Link erscheint hier zum Weitergeben.</span>
            </div>
            {addState ? <FormMessage state={addState} className="sm:col-span-3 break-all" /> : null}
          </form>
        ) : null}

        <Table>
          <THead>
            <TR>
              <TH>Name / E-Mail</TH>
              <TH className="w-24">Rolle</TH>
              <TH className="w-20 text-center">Aktiv</TH>
              <TH className="w-28 text-center">Fähigkeiten</TH>
              <TH className="w-24 text-center">Login</TH>
              <TH className="w-40 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <BenutzerLine key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BenutzerLine({ row }: { row: BenutzerRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(updateBenutzerAction, IDLE);
  const [linkState, linkAction] = useActionState(benutzerRecoveryLinkAction, IDLE);
  // Erfolg -> Parent remountet die Zeile via key={id:updatedAt}, editing fällt auf false zurück.

  if (editing && !(state?.ok)) {
    return (
      <TR className="bg-neutral-50">
        <TD colSpan={6} className="py-2">
          <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input type="hidden" name="id" value={row.id} />
            <div className="text-sm sm:col-span-4">
              <span className="font-medium">{row.name}</span> · {row.email}
            </div>
            <Input name="name" defaultValue={row.name} required className="h-8" />
            <Select name="rolle" defaultValue={row.rolle} className="h-8">
              {ROLLEN.map((rr) => <option key={rr} value={rr}>{rr}</option>)}
            </Select>
            <Input name="initialen" defaultValue={row.initialen ?? ""} placeholder="Kürzel" className="h-8" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="aktiv" defaultChecked={row.aktiv} /> aktiv</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="kannWerkstatt" defaultChecked={row.kannWerkstatt} /> Werkstatt</label>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="kannTodo" defaultChecked={row.kannTodo} /> ToDo</label>
            <div className="flex gap-1 sm:col-span-4">
              <SubmitButton size="sm">Speichern</SubmitButton>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
            </div>
            {state && !state.ok ? <FormMessage state={state} className="sm:col-span-4" /> : null}
          </form>
        </TD>
      </TR>
    );
  }

  return (
    <TR className={row.aktiv ? "" : "opacity-50"}>
      <TD>
        <div className="font-medium">{row.name}{row.istIch ? <span className="ml-1 text-xs text-neutral-400">(ich)</span> : null}</div>
        <div className="text-xs text-neutral-500">{row.email}</div>
      </TD>
      <TD><Badge tone={row.rolle === "ADMIN" ? "violet" : "neutral"}>{row.rolle}</Badge></TD>
      <TD className="text-center">{row.aktiv ? "✓" : "–"}</TD>
      <TD className="text-center text-xs text-neutral-500">
        {[row.kannWerkstatt ? "Werkstatt" : null, row.kannTodo ? "ToDo" : null].filter(Boolean).join(" · ") || "–"}
      </TD>
      <TD className="text-center">
        {row.hatLogin ? <Badge tone="green">Konto</Badge> : <Badge tone="amber">kein Konto</Badge>}
      </TD>
      <TD className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
          {row.hatLogin ? (
            <form action={linkAction} className="inline">
              <input type="hidden" name="id" value={row.id} />
              <SubmitButton size="sm" variant="ghost" pendingText="…">Passwort-Link</SubmitButton>
            </form>
          ) : null}
        </div>
        {linkState ? <FormMessage state={linkState} className="mt-1 break-all text-left" /> : null}
      </TD>
    </TR>
  );
}
