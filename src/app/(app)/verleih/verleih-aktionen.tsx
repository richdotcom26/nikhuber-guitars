"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { anhangUrlAction } from "../_components/anhang-actions";
import {
  deleteVerleihAction, sendeVerleihMailAction, vereinbarungAction, verleihMailVorschlagAction, zurueckAction,
} from "./actions";

/** Rückgabe eintragen (Datum, Standard heute). */
export function ZurueckForm({ id, heute }: { id: string; heute: string }) {
  const [state, action] = useActionState(zurueckAction, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label="Zurück am" htmlFor="datum">
        <Input id="datum" name="datum" type="date" defaultValue={heute} className="h-8 w-40" />
      </Field>
      <SubmitButton size="sm">Gitarre ist zurück</SubmitButton>
      {state ? <FormMessage state={state} className="w-full" /> : null}
    </form>
  );
}

/** PDF der Übergabevereinbarung (neu) erzeugen. */
export function VereinbarungButton({ id, vorhanden }: { id: string; vorhanden: boolean }) {
  const [state, action] = useActionState(vereinbarungAction, IDLE);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="outline" pendingText="erzeuge …">
        {vorhanden ? "PDF neu erzeugen" : "PDF erzeugen"}
      </SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}

/** Anhang (PDF) in neuem Tab öffnen. */
export function DokLink({ anhangId, label }: { anhangId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { window.open(await anhangUrlAction(anhangId), "_blank", "noopener"); })}
      className="text-left text-sm font-semibold text-blue-700 hover:underline"
    >
      {pending ? "öffne …" : label}
    </button>
  );
}

/** Mail-Fenster für Vereinbarung (mit Unterschrifts-Link) bzw. Rückgabe-Erinnerung. */
export function VerleihMail({
  id, art, label, disabled = false,
}: {
  id: string;
  art: "VEREINBARUNG" | "ERINNERUNG";
  label: string;
  disabled?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const [werte, setWerte] = useState<{ an: string; betreff: string; text: string } | null>(null);
  const [laden, start] = useTransition();
  const [state, action] = useActionState(sendeVerleihMailAction, IDLE);

  const oeffnen = () => start(async () => {
    setWerte(await verleihMailVorschlagAction(id, art));
    setOffen(true);
  });

  if (!offen || !werte) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="outline" onClick={oeffnen} disabled={disabled || laden}>{laden ? "…" : label}</Button>
        {state?.ok ? <FormMessage state={state} /> : null}
      </div>
    );
  }
  return (
    <form
      action={(fd) => { action(fd); setOffen(false); }}
      className="space-y-3 rounded-md border border-line bg-page p-3"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="art" value={art} />
      <Field label="An" htmlFor={`an-${art}`}>
        <Input id={`an-${art}`} name="an" defaultValue={werte.an} required />
      </Field>
      <Field label="Betreff" htmlFor={`betreff-${art}`}>
        <Input id={`betreff-${art}`} name="betreff" defaultValue={werte.betreff} required />
      </Field>
      <Field label="Text" htmlFor={`text-${art}`}>
        <Textarea id={`text-${art}`} name="text" rows={10} defaultValue={werte.text} required />
      </Field>
      {art === "VEREINBARUNG" ? (
        <p className="text-xs text-muted">
          Beim Senden wird die Vereinbarung als PDF neu erzeugt und angehängt; <code>{"{{link}}"}</code> wird durch den
          persönlichen Unterschrifts-Link ersetzt.
        </p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="sende …">Senden</SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}

export function DeleteVerleih({ id }: { id: string }) {
  const [state, action] = useActionState(deleteVerleihAction, IDLE);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Verleih-Vorgang löschen?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}
