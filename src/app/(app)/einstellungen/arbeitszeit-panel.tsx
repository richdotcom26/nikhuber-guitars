"use client";

import { useActionState, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import { deleteArbeitstagAction, saveArbeitstagAction } from "./actions";

export interface ArbeitstagRow {
  tag: string;
  beginn: string | null;
  ende: string | null;
  minuten: number;
  zusatzMinuten: number;
  quelle: string | null;
  beschreibung: string | null;
  updatedAt: string;
}

const COLS = 7;

/** Minuten → „7:05 h". */
function hm(min: number): string {
  if (!min) return "–";
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h`;
}
const uhr = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "–";
const datum = (tag: string) =>
  new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${tag}T00:00:00Z`));

export function ArbeitszeitPanel({ rows }: { rows: ArbeitstagRow[] }) {
  const [neu, setNeu] = useState(false);
  const claude = rows.reduce((s, r) => s + r.minuten, 0);
  const zusatz = rows.reduce((s, r) => s + r.zusatzMinuten, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kennzahl label="Gesamt" wert={hm(claude + zusatz)} sub={`an ${rows.length} Arbeitstagen`} />
        <Kennzahl label="Gemeinsam mit Claude" wert={hm(claude)} sub="aus Sitzungsprotokollen + Git" />
        <Kennzahl label="Manuell nachgetragen" wert={hm(zusatz)} sub="z. B. Tests, Einrichtung" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Arbeitszeit-Protokoll ({rows.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setNeu((v) => !v)}>
            {neu ? "Abbrechen" : "Tag nachtragen"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted">
            Wird nach jeder Claude-Antwort automatisch aktualisiert. Arbeitstag endet um 4:00 Uhr; Pausen über 30 Minuten
            zählen nicht; je Arbeitsblock +10 Minuten fürs Testen im Frontend. „Git (geschätzt)“ = Sitzungsprotokoll nicht mehr vorhanden, Zeit aus Commits geschätzt.
          </p>
          <Table>
            <THead>
              <TR>
                <TH className="w-32">Tag</TH>
                <TH className="w-28">Beginn – Ende</TH>
                <TH className="w-20 text-right">Claude</TH>
                <TH className="w-20 text-right">Manuell</TH>
                <TH className="w-20 text-right">Gesamt</TH>
                <TH>Was wurde gemacht</TH>
                <TH className="w-24 text-right">Aktion</TH>
              </TR>
            </THead>
            <TBody>
              {neu ? <EditRow onDone={() => setNeu(false)} /> : null}
              {rows.map((r) => <ViewRow key={`${r.tag}:${r.updatedAt}`} r={r} />)}
              {rows.length === 0 && !neu ? (
                <TR><TD colSpan={COLS} className="py-4 text-center text-muted">Noch keine Einträge.</TD></TR>
              ) : null}
            </TBody>
          </Table>
          <div className="flex justify-end gap-6 border-t border-line pt-2 text-sm">
            <span className="text-muted">Summe Claude <b className="text-ink tabular-nums">{hm(claude)}</b></span>
            <span className="text-muted">Manuell <b className="text-ink tabular-nums">{hm(zusatz)}</b></span>
            <span className="text-muted">Gesamt <b className="text-navy tabular-nums">{hm(claude + zusatz)}</b></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kennzahl({ label, wert, sub }: { label: string; wert: string; sub: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted">{label}</div>
        <div className="text-2xl font-semibold tabular-nums text-navy">{wert}</div>
        <div className="text-xs text-muted">{sub}</div>
      </CardContent>
    </Card>
  );
}

function ViewRow({ r }: { r: ArbeitstagRow }) {
  const [edit, setEdit] = useState(false);
  const [delState, delAction] = useActionState(deleteArbeitstagAction, IDLE);
  if (edit) return <EditRow r={r} onDone={() => setEdit(false)} />;
  return (
    <TR>
      <TD className="whitespace-nowrap">{datum(r.tag)}</TD>
      <TD className="whitespace-nowrap tabular-nums text-muted">{r.beginn ? `${uhr(r.beginn)} – ${uhr(r.ende)}` : "–"}</TD>
      <TD className="text-right tabular-nums">{hm(r.minuten)}</TD>
      <TD className="text-right tabular-nums text-muted">{hm(r.zusatzMinuten)}</TD>
      <TD className="text-right font-medium tabular-nums">{hm(r.minuten + r.zusatzMinuten)}</TD>
      <TD className="whitespace-pre-line text-sm">
        {r.beschreibung ?? <span className="text-muted">–</span>}
        {r.quelle ? (
          <div className="mt-1">
            <Badge tone={r.quelle.startsWith("Git") ? "amber" : r.quelle === "manuell" ? "neutral" : "blue"}>{r.quelle}</Badge>
          </div>
        ) : null}
        {delState && !delState.ok ? <FormMessage state={delState} /> : null}
      </TD>
      <TD className="text-right">
        <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Bearbeiten</Button>
        {r.minuten === 0 ? (
          <form action={delAction} onSubmit={(e) => { if (!confirm("Eintrag löschen?")) e.preventDefault(); }}>
            <input type="hidden" name="tag" value={r.tag} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
          </form>
        ) : null}
      </TD>
    </TR>
  );
}

function EditRow({ r, onDone }: { r?: ArbeitstagRow; onDone: () => void }) {
  const [state, action] = useActionState(saveArbeitstagAction, IDLE);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  const zusatz = r?.zusatzMinuten ? `${Math.floor(r.zusatzMinuten / 60)}:${String(r.zusatzMinuten % 60).padStart(2, "0")}` : "";

  return (
    <TR className="bg-brand-soft/40">
      <TD colSpan={COLS} className="py-2">
        <form action={action} className="grid gap-2 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-start">
          {r ? <input type="hidden" name="tag" value={r.tag} /> : null}
          <Input type="date" name={r ? undefined : "tag"} defaultValue={r?.tag} disabled={!!r} required={!r} className="h-9" />
          <Input name="zusatz" defaultValue={zusatz} placeholder="Manuell h:mm" title="Zusätzliche Zeit ohne Claude, z. B. 1:30 oder 1,5" className="h-9" />
          <Textarea name="beschreibung" defaultValue={r?.beschreibung ?? ""} rows={3} placeholder="Was wurde gemacht?" />
          <div className="flex gap-1">
            <SubmitButton size="sm">Speichern</SubmitButton>
            <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
          </div>
          {state && !state.ok ? <FormMessage state={state} className="sm:col-span-4" /> : null}
        </form>
      </TD>
    </TR>
  );
}
