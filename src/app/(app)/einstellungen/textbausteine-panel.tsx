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
import { deleteTextbausteinAction, saveTextbausteinAction, uebersetzeTextbausteinAction } from "./actions";
import { MAHN_PLATZHALTER } from "@/lib/mail-vorlage-shared";

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
  { value: "AUFTRAG", label: "Auftrag (allgemeine Mail)" },
  { value: "VERLEIH_VEREINBARUNG", label: "Verleih: Vereinbarung / Unterschrift" },
  { value: "VERLEIH_ERINNERUNG", label: "Verleih: Rückgabe-Erinnerung" },
  { value: "MAHNUNG_1", label: "Mahnwesen: 1. Zahlungserinnerung" },
  { value: "MAHNUNG_2", label: "Mahnwesen: 2. Zahlungserinnerung" },
  { value: "MAHNUNG_3", label: "Mahnwesen: Letzte Mahnung" },
];

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
          <p>
            Mahn-Bausteine:{" "}
            {MAHN_PLATZHALTER.map((p, i) => (
              <span key={p.key} title={p.label}>
                {i > 0 ? " · " : ""}<code className="rounded bg-field px-1 text-ink">{`{{${p.key}}}`}</code>
              </span>
            ))}
          </p>
        </CardContent>
      </Card>

      {adding ? <BausteinForm onDone={() => setAdding(false)} /> : null}
      {BELEGARTEN.filter((b) => rows.some((r) => r.belegart === b.value)).map((b) => {
        const de = rows.filter((r) => r.belegart === b.value && r.sprache === "DE").sort(stdZuerst);
        const en = rows.filter((r) => r.belegart === b.value && r.sprache === "EN").sort(stdZuerst);
        const n = Math.max(de.length, en.length);
        return (
          <Card key={b.value}>
            <CardHeader><CardTitle>{b.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
                <div className="hidden text-xs font-semibold text-muted md:block">Deutsch</div>
                <div className="hidden text-xs font-semibold text-muted md:block">English</div>
                {Array.from({ length: n }, (_, i) => (
                  <Paar key={i} de={de[i]} en={en[i]} belegart={b.value} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const stdZuerst = (a: Row, b: Row) => Number(b.istStandard) - Number(a.istStandard) || (a.name ?? "").localeCompare(b.name ?? "");

/** Eine Zeile: deutscher Baustein links, englischer rechts (fehlt er: „aus Deutsch übersetzen“). */
function Paar({ de, en, belegart }: { de?: Row; en?: Row; belegart: string }) {
  const [vorlage, setVorlage] = useState<Partial<Row> | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uebersetzen() {
    if (!de) return;
    if (en && !confirm("Es gibt schon einen englischen Baustein. Übersetzung als neuen Baustein vorbereiten?")) return;
    setBusy(true);
    setFehler(null);
    const r = await uebersetzeTextbausteinAction({ name: de.name ?? "", betreff: de.betreff ?? "", text: de.text ?? "" });
    setBusy(false);
    if (!r.ok) { setFehler(r.message); return; }
    setVorlage({ belegart, sprache: "EN", name: r.name, betreff: r.betreff, text: r.text, istStandard: !en });
  }

  return (
    <>
      <div>
        {de ? (
          <BausteinView
            key={`${de.id}:${new Date(de.updatedAt).getTime()}`}
            row={de}
            extra={(
              <Button size="sm" variant="ghost" onClick={uebersetzen} disabled={busy} title="Mit DeepL ins Englische übersetzen">
                {busy ? "übersetzt …" : "→ EN"}
              </Button>
            )}
          />
        ) : <Leer />}
        {fehler ? <p className="mt-1 text-xs text-red-600">{fehler}</p> : null}
      </div>
      <div>
        {vorlage ? (
          <BausteinForm row={vorlage as Row} neu onDone={() => setVorlage(null)} />
        ) : en ? (
          <BausteinView key={`${en.id}:${new Date(en.updatedAt).getTime()}`} row={en} />
        ) : <Leer />}
      </div>
    </>
  );
}

function Leer() {
  return <div className="rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted">–</div>;
}

function BausteinView({ row, extra }: { row: Row; extra?: React.ReactNode }) {
  const [offen, setOffen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [delState, delAction] = useActionState(deleteTextbausteinAction, IDLE);
  if (editing) return <BausteinForm row={row} onDone={() => setEditing(false)} />;
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button type="button" onClick={() => setOffen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium hover:text-brand">
          <span className="text-xs text-muted">{offen ? "▾" : "▸"}</span>
          <span className="truncate">{row.name ?? "(ohne Namen)"}</span>
          {row.istStandard ? <Badge tone="green">Standard</Badge> : null}
        </button>
        {extra}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
        <form action={delAction} onSubmit={(e) => { if (!confirm("Textbaustein löschen?")) e.preventDefault(); }}>
          <input type="hidden" name="id" value={row.id} />
          <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
        </form>
      </div>
      {delState && !delState.ok ? <div className="px-3"><FormMessage state={delState} /></div> : null}
      {offen ? (
        <div className="space-y-1 border-t border-line px-3 py-2 text-sm">
          <div><span className="text-muted">Betreff:</span> {row.betreff}</div>
          <pre className="whitespace-pre-wrap rounded-md bg-field px-3 py-2 font-sans text-ink">{row.text}</pre>
        </div>
      ) : null}
    </div>
  );
}

function BausteinForm({ row, neu, onDone }: { row?: Row; neu?: boolean; onDone: () => void }) {
  const [state, action] = useActionState(saveTextbausteinAction, IDLE);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <Card>
      <CardContent className="pt-5">
        <form action={action} className="space-y-3">
          {row && !neu ? <input type="hidden" name="id" value={row.id} /> : null}
          {state && !state.ok ? <FormMessage state={state} /> : null}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_12rem_6rem]">
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
