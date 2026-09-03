"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import { kontrastText } from "@/lib/utils";
import { deleteVorratAction, saveVorratAction } from "./actions";

interface VorratRow {
  id: string;
  nr: number;
  workstep: string;
  workstepEn: string | null;
  reihenfolge: number;
  typ: string | null;
  farbe: string | null;
  anzahlVerwendet: number;
}

const TYP_LABEL: Record<string, string> = { WERKSTATT: "Werkstatt", OFFICE: "Office" };

export function ArbeitsschrittePanel({ rows }: { rows: VorratRow[] }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) => r.workstep.toLowerCase().includes(n) || (r.workstepEn ?? "").toLowerCase().includes(n),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arbeitsschritte ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Bezeichnung"
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
              <TH className="w-12 text-right">Nr</TH>
              <TH className="w-16 text-right">Order</TH>
              <TH className="w-24">Bereich</TH>
              <TH className="w-16">Farbe</TH>
              <TH>Bezeichnung</TH>
              <TH>Englisch</TH>
              <TH className="w-16 text-right">verw.</TH>
              <TH className="w-32 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? <EditRow onDone={() => setAdding(false)} /> : null}
            {filtered.map((r) => (
              <ViewOrEdit key={`${r.id}:${r.reihenfolge}:${r.workstep}`} row={r} />
            ))}
            {filtered.length === 0 && !adding ? (
              <TR><TD colSpan={8} className="py-4 text-center text-neutral-400">Kein Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
        <p className="mt-3 text-xs text-neutral-400">
          Die Spalte „Order“ bestimmt die Reihenfolge im Auftrag. Die Nummer ist ein fester Schlüssel
          und wird automatisch vergeben. Schritte, die fest in der Fertigungslogik verankert sind
          (Montage, Kiste packen, Cites, Fish&amp;Wildlife, Rechnung, Ausfuhrantrag, Versendet,
          Reparatur), lassen sich umbenennen und einfärben, aber nicht löschen. Löschen geht nur,
          solange der Schritt keinem Auftrag zugeordnet ist.
        </p>
      </CardContent>
    </Card>
  );
}

function ViewOrEdit({ row }: { row: VorratRow }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteVorratAction, IDLE);

  if (editing) return <EditRow row={row} onDone={() => setEditing(false)} />;

  return (
    <TR>
      <TD className="text-right tabular-nums text-neutral-400">{row.nr}</TD>
      <TD className="text-right tabular-nums">{row.reihenfolge}</TD>
      <TD className="text-muted">{row.typ ? TYP_LABEL[row.typ] ?? row.typ : "–"}</TD>
      <TD>
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[11px]"
          style={{ background: row.farbe ?? "#e5e7eb", color: kontrastText(row.farbe) }}
        >
          {row.farbe ?? "–"}
        </span>
      </TD>
      <TD className="font-medium">{row.workstep}</TD>
      <TD className="text-muted">{row.workstepEn ?? "–"}</TD>
      <TD className="text-right tabular-nums text-muted">{row.anzahlVerwendet}</TD>
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

function EditRow({ row, onDone }: { row?: VorratRow; onDone: () => void }) {
  const [state, action] = useActionState(saveVorratAction, IDLE);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <TR className="bg-neutral-50">
      <TD colSpan={8} className="py-2">
        <form
          action={action}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[4rem_6rem_3rem_1fr_1fr_auto] sm:items-center"
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <Input
            name="reihenfolge"
            type="number"
            min={0}
            placeholder="Order"
            defaultValue={row?.reihenfolge ?? ""}
            required
            className="h-8"
          />
          <Select name="typ" defaultValue={row?.typ ?? ""} className="h-8">
            <option value="">–</option>
            <option value="WERKSTATT">Werkstatt</option>
            <option value="OFFICE">Office</option>
          </Select>
          <input
            type="color"
            name="farbe"
            defaultValue={row?.farbe ?? "#cccccc"}
            className="h-8 w-12 cursor-pointer rounded border border-line bg-white"
            aria-label="Farbe"
          />
          <Input name="workstep" placeholder="Bezeichnung" defaultValue={row?.workstep ?? ""} required className="h-8" />
          <Input name="workstepEn" placeholder="Englisch" defaultValue={row?.workstepEn ?? ""} className="h-8" />
          <div className="flex gap-1">
            <SubmitButton size="sm">Speichern</SubmitButton>
            <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
          </div>
          <FormMessage state={state && !state.ok ? state : null} className="sm:col-span-6" />
        </form>
      </TD>
    </TR>
  );
}
