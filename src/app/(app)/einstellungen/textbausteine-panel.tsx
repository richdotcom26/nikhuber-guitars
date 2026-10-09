"use client";

import { useActionState, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { MAIL_PLATZHALTER } from "@/lib/mail-vorlage-shared";
import { VERLEIH_PLATZHALTER } from "@/lib/verleih-shared";
import { deleteTextbausteinAction, saveTextbausteinAction } from "./actions";

interface Row {
  id: string;
  belegart: string;
  sprache: string;
  name: string | null;
  istStandard: boolean;
  betreff: string | null;
  text: string | null;
  updatedAt: string | Date;
}

const BELEGARTEN = [
  { value: "RECHNUNG", label: "Rechnung" },
  { value: "ANGEBOT", label: "Angebot" },
  { value: "AUFTRAGSBESTAETIGUNG", label: "Auftragsbestätigung" },
  { value: "VERLEIH_VEREINBARUNG", label: "Verleih: Vereinbarung / Unterschrift" },
  { value: "VERLEIH_ERINNERUNG", label: "Verleih: Rückgabe-Erinnerung" },
];
const artLabel = (v: string) => BELEGARTEN.find((b) => b.value === v)?.label ?? v;

export function TextbausteinePanel({ rows }: { rows: Row[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Textbausteine für E-Mails ({rows.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
            {adding ? "Abbrechen" : "Neu"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted">
          <p>
            Je Belegart und Sprache kann ein Baustein <b className="text-ink">Standard</b> sein — er wird im
            Mail-Fenster automatisch passend zur Kundensprache vorausgewählt. Andere Bausteine lassen sich dort auswählen.
          </p>
          <p>
            Platzhalter:{" "}
            {MAIL_PLATZHALTER.map((p, i) => (
              <span key={p.key} title={p.label}>
                {i > 0 ? " · " : ""}<code className="rounded bg-field px-1 text-ink">{`{{${p.key}}}`}</code>
              </span>
            ))}
          </p>
          <p>
            Verleih-Bausteine:{" "}
            {VERLEIH_PLATZHALTER.map((p, i) => (
              <span key={p.key} title={p.label}>
                {i > 0 ? " · " : ""}<code className="rounded bg-field px-1 text-ink">{`{{${p.key}}}`}</code>
              </span>
            ))}
            {" "}— <code className="rounded bg-field px-1 text-ink">{"{{link}}"}</code> = Link zur elektronischen Unterschrift.
          </p>
        </CardContent>
      </Card>

      {adding ? <BausteinForm onDone={() => setAdding(false)} /> : null}
      {rows.map((r) => (
        <BausteinView key={`${r.id}:${new Date(r.updatedAt).getTime()}`} row={r} />
      ))}
    </div>
  );
}

function BausteinView({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteTextbausteinAction, IDLE);
  if (editing) return <BausteinForm row={row} onDone={() => setEditing(false)} />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {row.name ?? "(ohne Namen)"}
          <Badge tone="neutral">{artLabel(row.belegart)}</Badge>
          <Badge tone="blue">{row.sprache}</Badge>
          {row.istStandard ? <Badge tone="green">Standard</Badge> : null}
        </CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
          <form action={delAction} onSubmit={(e) => { if (!confirm("Textbaustein löschen?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {delState && !delState.ok ? <FormMessage state={delState} /> : null}
        <div><span className="text-muted">Betreff:</span> {row.betreff}</div>
        <pre className="whitespace-pre-wrap rounded-md bg-field px-3 py-2 font-sans text-ink">{row.text}</pre>
      </CardContent>
    </Card>
  );
}

function BausteinForm({ row, onDone }: { row?: Row; onDone: () => void }) {
  const [state, action] = useActionState(saveTextbausteinAction, IDLE);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="space-y-3">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          {state && !state.ok ? <FormMessage state={state} /> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem_6rem]">
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" defaultValue={row?.name ?? ""} required />
            </Field>
            <Field label="Belegart" htmlFor="belegart">
              <Select id="belegart" name="belegart" defaultValue={row?.belegart ?? "RECHNUNG"}>
                {BELEGARTEN.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </Select>
            </Field>
            <Field label="Sprache" htmlFor="sprache">
              <Select id="sprache" name="sprache" defaultValue={row?.sprache ?? "DE"}>
                <option value="DE">DE</option>
                <option value="EN">EN</option>
              </Select>
            </Field>
          </div>
          <Field label="Betreff" htmlFor="betreff">
            <Input id="betreff" name="betreff" defaultValue={row?.betreff ?? ""} required />
          </Field>
          <Field label="Text" htmlFor="text" hint="Klartext; Zeilenumbrüche bleiben erhalten. Platzhalter wie {{briefanrede}} werden beim Versand ersetzt.">
            <Textarea id="text" name="text" rows={10} defaultValue={row?.text ?? ""} required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="istStandard" defaultChecked={row?.istStandard ?? false} />
            Standard für diese Belegart und Sprache
          </label>
          <div className="flex gap-2">
            <SubmitButton>Speichern</SubmitButton>
            <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
