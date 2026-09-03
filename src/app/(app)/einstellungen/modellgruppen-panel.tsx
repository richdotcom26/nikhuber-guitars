"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import { kontrastText } from "@/lib/utils";
import { deleteModellgruppeAction, saveModellgruppeAction } from "./actions";

interface ModellgruppeRow {
  id: string;
  name: string;
  farbe: string | null;
  minMengeMonat: number | null;
  maxMengeMonat: number | null;
  anzahlModelle: number;
  updatedAt: string | Date;
}

export function ModellgruppenPanel({ rows }: { rows: ModellgruppeRow[] }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(n));
  }, [rows, q]);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Modellgruppen ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Name"
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
              <TH className="w-40">Farbe</TH>
              <TH>Name</TH>
              <TH className="w-24 text-right">Min/Monat</TH>
              <TH className="w-24 text-right">Max/Monat</TH>
              <TH className="w-16 text-right">Modelle</TH>
              <TH className="w-32 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <EditRow onDone={() => setAdding(false)} /> : null}
            {filtered.map((r) => (
              <ViewOrEdit key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
            ))}
            {filtered.length === 0 && !adding ? (
              <TR><TD colSpan={6} className="py-4 text-center text-neutral-400">Kein Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
        <p className="mt-3 text-xs text-neutral-400">
          Farben erscheinen als Chip in der Auftragsliste. Eine Modellgruppe lässt sich nur löschen,
          wenn ihr kein Modell mehr zugewiesen ist (Zuordnung je Modell im Bereich Modelle).
        </p>
      </CardContent>
    </Card>
  );
}

function ViewOrEdit({ row }: { row: ModellgruppeRow }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteModellgruppeAction, IDLE);

  if (editing) return <EditRow row={row} onDone={() => setEditing(false)} />;

  return (
    <TR>
      <TD>
        <span
          className="inline-block rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: row.farbe ?? "#e5e7eb", color: kontrastText(row.farbe) }}
        >
          {row.farbe ?? "—"}
        </span>
      </TD>
      <TD className="font-medium">{row.name}</TD>
      <TD className="text-right tabular-nums text-neutral-500">{row.minMengeMonat ?? "–"}</TD>
      <TD className="text-right tabular-nums text-neutral-500">{row.maxMengeMonat ?? "–"}</TD>
      <TD className="text-right tabular-nums text-neutral-500">{row.anzahlModelle}</TD>
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

function EditRow({ row, onDone }: { row?: ModellgruppeRow; onDone: () => void }) {
  const [state, action] = useActionState(saveModellgruppeAction, IDLE);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <TR className="bg-neutral-50">
      <TD colSpan={6} className="py-2">
        <form
          action={action}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[3rem_1fr_6rem_6rem_auto] sm:items-center"
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <input
            type="color"
            name="farbe"
            defaultValue={row?.farbe ?? "#cccccc"}
            className="h-8 w-12 cursor-pointer rounded border border-line bg-white"
            aria-label="Farbe"
          />
          <Input name="name" placeholder="Name" defaultValue={row?.name ?? ""} required className="h-8" />
          <Input
            name="minMengeMonat"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={row?.minMengeMonat ?? ""}
            className="h-8"
          />
          <Input
            name="maxMengeMonat"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={row?.maxMengeMonat ?? ""}
            className="h-8"
          />
          <div className="flex gap-1">
            <SubmitButton size="sm">Speichern</SubmitButton>
            <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
          </div>
          <FormMessage state={state && !state.ok ? state : null} className="sm:col-span-5" />
        </form>
      </TD>
    </TR>
  );
}
