"use client";

import { useActionState, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { TICKET_PRIO, TICKET_TYP } from "@/lib/ticket-shared";
import { createTicketAction, updateTicketAction } from "./actions";

export interface TicketFormValues {
  id?: string;
  typ?: string | null;
  titel?: string | null;
  beschreibung?: string | null;
  prioritaet?: string | null;
  zugewiesenAnId?: string | null;
  aufwandMinuten?: number | null;
}

export function TicketForm({
  mode,
  values,
  benutzer,
  currentUserId,
}: {
  mode: "neu" | "edit";
  values: TicketFormValues;
  benutzer: { id: string; name: string }[];
  /** Voreinstellung „Bearbeiter" bei neuen Tickets = angemeldeter Benutzer. */
  currentUserId?: string;
}) {
  const [state, action] = useActionState(
    mode === "neu" ? createTicketAction : updateTicketAction,
    IDLE,
  );
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  // Ungespeicherte Änderungen: beim Verlassen (Zurück, Menü, Tab schließen) nachfragen
  const [geaendert, setGeaendert] = useState(false);
  const [gespeichertBei, setGespeichertBei] = useState(state);
  if (state !== gespeichertBei) {
    setGespeichertBei(state);
    if (state?.ok) setGeaendert(false);
  }
  useEffect(() => {
    if (!geaendert) return;
    const frage = "Es gibt ungespeicherte Änderungen am Ticket. Seite trotzdem verlassen?";
    const klick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (a && !a.getAttribute("href")!.startsWith("#") && !confirm(frage)) { e.preventDefault(); e.stopPropagation(); }
    };
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    document.addEventListener("click", klick, true);
    window.addEventListener("beforeunload", unload);
    return () => { document.removeEventListener("click", klick, true); window.removeEventListener("beforeunload", unload); };
  }, [geaendert]);
  const bearbeiterDefault = values.zugewiesenAnId ?? (mode === "neu" ? currentUserId : null) ?? "";

  return (
    <form action={action} onInput={() => setGeaendert(true)} onChange={() => setGeaendert(true)} className="max-w-2xl space-y-5">
      {mode === "edit" && values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "neu" ? "Neues Ticket" : "Ticket bearbeiten"}</CardTitle>
          {/* Speichern prominent oben (zusätzlich unten) */}
          <div className="flex items-center gap-2">
            {geaendert ? <span className="text-xs font-medium text-amber-700">ungespeichert</span> : null}
            <SubmitButton size="sm">{mode === "neu" ? "Ticket anlegen" : "Speichern"}</SubmitButton>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Titel" htmlFor="titel" errors={err.titel} className="sm:col-span-2">
            <Input id="titel" name="titel" defaultValue={v(values.titel)} required
              placeholder="Kurze, sprechende Zusammenfassung" />
          </Field>
          <Field label="Typ" htmlFor="typ" errors={err.typ}>
            <Select id="typ" name="typ" defaultValue={v(values.typ) || "BUG"}>
              {TICKET_TYP.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Priorität" htmlFor="prioritaet" errors={err.prioritaet}>
            <Select id="prioritaet" name="prioritaet" defaultValue={v(values.prioritaet) || "MITTEL"}>
              {TICKET_PRIO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Beschreibung" htmlFor="beschreibung" className="sm:col-span-2">
            <Textarea id="beschreibung" name="beschreibung" defaultValue={v(values.beschreibung)} rows={5}
              placeholder="Was ist passiert / was wird gewünscht? Schritte, erwartetes vs. tatsächliches Verhalten …" />
          </Field>
          <Field label="Bearbeiter" htmlFor="zugewiesenAnId">
            <Select id="zugewiesenAnId" name="zugewiesenAnId" defaultValue={bearbeiterDefault}>
              <option value="">– nicht zugewiesen –</option>
              {benutzer.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {/* Aufwand erst beim Bearbeiten — beim Anlegen ist noch nichts umgesetzt */}
          {mode === "neu" ? null : (
            <Field label="Aufwand (Minuten)" htmlFor="aufwandMinuten" errors={err.aufwandMinuten}
              hint="Zeit, die die Umsetzung gekostet hat">
              <Input id="aufwandMinuten" name="aufwandMinuten" inputMode="numeric"
                defaultValue={v(values.aufwandMinuten)} placeholder="z. B. 90" />
            </Field>
          )}
        </CardContent>
      </Card>

      <SubmitButton>{mode === "neu" ? "Ticket anlegen" : "Speichern"}</SubmitButton>
    </form>
  );
}
