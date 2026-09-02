"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import { saveStaatAction } from "./actions";

interface StaatRow {
  id: string;
  kuerzel: string | null;
  name: string;
  region: "D" | "EU" | "WELT" | "ASIEN" | "USA";
  defaultSprache: "DE" | "EN" | null;
  defaultWaehrung: "EUR" | "USD" | null;
  defaultZahlungsbedingungId: string | null;
  updatedAt: string | Date;
}
interface ZbRow { id: string; bezeichnung: string }

const REGIONEN = ["D", "EU", "WELT", "ASIEN", "USA"] as const;

export function StaatenPanel({
  rows,
  zahlungsbedingungen,
}: {
  rows: StaatRow[];
  zahlungsbedingungen: ZbRow[];
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const zbName = useMemo(
    () => new Map(zahlungsbedingungen.map((z) => [z.id, z.bezeichnung])),
    [zahlungsbedingungen],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(n) || (r.kuerzel ?? "").toLowerCase().includes(n),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staaten ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Name / Kürzel"
            className="h-8 w-52"
          />
          <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
            {adding ? "Abbrechen" : "Neu"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH className="w-16">Kürzel</TH>
              <TH>Name</TH>
              <TH className="w-24">Region</TH>
              <TH className="w-20">Sprache</TH>
              <TH className="w-20">Währung</TH>
              <TH>Zahlungsbedingung (Default)</TH>
              <TH className="w-28 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? (
              <StaatEditRow zbs={zahlungsbedingungen} onDone={() => setAdding(false)} />
            ) : null}
            {filtered.map((r) => (
              // Key mit updatedAt: nach dem Speichern remountet die Zeile im Ansichtsmodus.
              <StaatViewOrEdit
                key={`${r.id}:${new Date(r.updatedAt).getTime()}`}
                row={r}
                zbs={zahlungsbedingungen}
                zbName={zbName}
              />
            ))}
            {filtered.length === 0 && !adding ? (
              <TR><TD colSpan={7} className="py-4 text-center text-neutral-400">Kein Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StaatViewOrEdit({
  row,
  zbs,
  zbName,
}: {
  row: StaatRow;
  zbs: ZbRow[];
  zbName: Map<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) return <StaatEditRow row={row} zbs={zbs} onDone={() => setEditing(false)} />;
  return (
    <TR>
      <TD className="font-mono text-xs">{row.kuerzel ?? "–"}</TD>
      <TD>{row.name}</TD>
      <TD>{row.region}</TD>
      <TD>{row.defaultSprache ?? "–"}</TD>
      <TD>{row.defaultWaehrung ?? "–"}</TD>
      <TD className="text-neutral-500">
        {row.defaultZahlungsbedingungId ? zbName.get(row.defaultZahlungsbedingungId) ?? "–" : "–"}
      </TD>
      <TD className="text-right">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
      </TD>
    </TR>
  );
}

function StaatEditRow({
  row,
  zbs,
  onDone,
}: {
  row?: StaatRow;
  zbs: ZbRow[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveStaatAction, IDLE);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <TR className="bg-neutral-50">
      <TD colSpan={7} className="py-2">
        <form
          action={action}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[5rem_1fr_7rem_6rem_6rem_1fr_auto] sm:items-center"
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Input name="kuerzel" placeholder="DE" defaultValue={row?.kuerzel ?? ""} className="h-8" />
          <Input name="name" placeholder="Name" defaultValue={row?.name ?? ""} required className="h-8" />
          <Select name="region" defaultValue={row?.region ?? "EU"} className="h-8">
            {REGIONEN.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select name="defaultSprache" defaultValue={row?.defaultSprache ?? ""} className="h-8">
            <option value="">–</option>
            <option value="DE">DE</option>
            <option value="EN">EN</option>
          </Select>
          <Select name="defaultWaehrung" defaultValue={row?.defaultWaehrung ?? ""} className="h-8">
            <option value="">–</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </Select>
          <Select
            name="defaultZahlungsbedingungId"
            defaultValue={row?.defaultZahlungsbedingungId ?? ""}
            className="h-8"
          >
            <option value="">–</option>
            {zbs.map((z) => <option key={z.id} value={z.id}>{z.bezeichnung}</option>)}
          </Select>
          <div className="flex gap-1">
            <SubmitButton size="sm">Speichern</SubmitButton>
            <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
          </div>
          <FormMessage
            state={state && !state.ok ? state : null}
            className="sm:col-span-7"
          />
        </form>
      </TD>
    </TR>
  );
}
