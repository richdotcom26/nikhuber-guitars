"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { formatDateTime } from "@/lib/utils";
import { anhangUrlAction } from "../_components/anhang-actions";
import { abMailVorschlagAction, sendeAbAction } from "./actions";

export interface AbStand {
  angefordertAm: string | Date | null;
  unterschriebenAm: string | Date | null;
  unterschriebenName: string | null;
  unterschriftIp: string | null;
  anhangId: string | null;
  unterschriebenAnhangId: string | null;
}

/** Auftragsbestätigung: zur elektronischen Unterschrift senden, Stand und PDFs anzeigen. */
export function AbPanel({ auftragId, stand, status }: { auftragId: string; stand: AbStand; status: string }) {
  const [offen, setOffen] = useState(false);
  const [werte, setWerte] = useState<{ an: string; cc: string; betreff: string; text: string } | null>(null);
  const [laden, start] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);
  const [state, action] = useActionState(sendeAbAction, IDLE);
  const [oeffnet, startOeffnen] = useTransition();

  const oeffnen = () => start(async () => {
    setFehler(null);
    const res = await abMailVorschlagAction(auftragId);
    if (res.ok) {
      setWerte(res.werte);
      setOffen(true);
    } else setFehler(res.message);
  });
  const pdf = (id: string) => startOeffnen(async () => { window.open(await anhangUrlAction(id), "_blank", "noopener"); });

  return (
    <div className="space-y-3 text-sm">
      {stand.unterschriebenAm ? (
        <div className="rounded-md bg-green-50 px-3 py-2 text-green-800">
          Bestätigt von <b>{stand.unterschriebenName}</b> am {formatDateTime(stand.unterschriebenAm)}
          {stand.unterschriftIp ? <span className="block text-xs">IP {stand.unterschriftIp}</span> : null}
        </div>
      ) : stand.angefordertAm ? (
        <p className="text-amber-700">Zur Unterschrift gesendet am {formatDateTime(stand.angefordertAm)} — noch nicht unterschrieben.</p>
      ) : status === "BACKORDER" ? (
        <p className="text-muted">Noch nicht gesendet. Der Auftrag wird erst mit der unterschriebenen Auftragsbestätigung angenommen.</p>
      ) : (
        <p className="text-muted">Keine elektronisch unterschriebene AB.</p>
      )}

      <div className="space-y-1">
        {stand.unterschriebenAnhangId ? (
          <button type="button" disabled={oeffnet} onClick={() => pdf(stand.unterschriebenAnhangId!)} className="block text-left font-semibold text-blue-700 hover:underline">
            Unterschriebene Auftragsbestätigung (PDF)
          </button>
        ) : null}
        {stand.anhangId ? (
          <button type="button" disabled={oeffnet} onClick={() => pdf(stand.anhangId!)} className="block text-left font-semibold text-blue-700 hover:underline">
            Gesendete Auftragsbestätigung (PDF)
          </button>
        ) : null}
      </div>

      {!stand.unterschriebenAm ? (
        offen && werte ? (
          <form action={(fd) => { action(fd); setOffen(false); }} className="space-y-3 rounded-md border border-line bg-page p-3">
            <input type="hidden" name="id" value={auftragId} />
            <Field label="An" htmlFor="ab-an"><Input id="ab-an" name="an" defaultValue={werte.an} required /></Field>
            <Field label="CC" htmlFor="ab-cc"><Input id="ab-cc" name="cc" defaultValue={werte.cc} /></Field>
            <Field label="Betreff" htmlFor="ab-betreff"><Input id="ab-betreff" name="betreff" defaultValue={werte.betreff} required /></Field>
            <Field label="Text" htmlFor="ab-text"><Textarea id="ab-text" name="text" rows={10} defaultValue={werte.text} required /></Field>
            <p className="text-xs text-muted">
              Die Auftragsbestätigung wird als PDF (mit Feld „Auftragsannahme“) angehängt; <code>{"{{link}}"}</code> wird
              durch den persönlichen Unterschrifts-Link ersetzt.
            </p>
            <div className="flex gap-2">
              <SubmitButton size="sm" pendingText="sende …">Senden</SubmitButton>
              <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant={stand.angefordertAm ? "outline" : "default"} onClick={oeffnen} disabled={laden}>
            {laden ? "…" : stand.angefordertAm ? "Erneut zur Unterschrift senden …" : "AB zur Unterschrift senden …"}
          </Button>
        )
      ) : null}
      {fehler ? <p className="text-sm text-red-600">{fehler}</p> : null}
      {state ? <FormMessage state={state} /> : null}
    </div>
  );
}
