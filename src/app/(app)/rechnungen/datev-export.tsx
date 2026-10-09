"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Select } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { datevSendenAction } from "./actions";

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Knopf „DATEV-Export“: Monat wählen → herunterladen oder ans Steuerbüro mailen. */
export function DatevExport({ jahre, vorJahr, vorMonat, empfaenger }: {
  jahre: number[]; vorJahr: number; vorMonat: number; empfaenger: string;
}) {
  const [offen, setOffen] = useState(false);
  const [jahr, setJahr] = useState(vorJahr);
  const [monat, setMonat] = useState(vorMonat);
  const [state, action] = useActionState(datevSendenAction, IDLE);
  return (
    <>
      <Button variant="outline" onClick={() => setOffen(true)}>DATEV-Export</Button>
      {offen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOffen(false)}>
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              if (!confirm(`DATEV-Export ${MONATE[monat - 1]} ${jahr} an ${empfaenger} senden?`)) e.preventDefault();
            }}
            className="w-full max-w-md space-y-3 rounded-xl bg-surface p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold text-navy">DATEV-Export Rechnungsausgang</h2>
            {state ? <FormMessage state={state} /> : null}
            <div className="flex gap-2">
              <Select name="monat" value={monat} onChange={(e) => setMonat(Number(e.target.value))} className="h-9">
                {MONATE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
              <Select name="jahr" value={jahr} onChange={(e) => setJahr(Number(e.target.value))} className="h-9 w-28">
                {jahre.map((j) => <option key={j} value={j}>{j}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="pdfs" defaultChecked /> Rechnungs-PDFs (ZUGFeRD) mitsenden
            </label>
            <p className="text-xs text-muted">Empfänger: {empfaenger} (Einstellungen → DATEV)</p>
            <div className="flex flex-wrap justify-end gap-2">
              <a
                href={`/api/datev?jahr=${jahr}&monat=${monat}`}
                className="inline-flex h-9 items-center rounded-md border border-line px-3.5 text-sm hover:bg-brand-soft"
              >
                Nur herunterladen
              </a>
              <SubmitButton pendingText="sendet …">An Steuerbüro senden</SubmitButton>
              <Button variant="ghost" onClick={() => setOffen(false)}>Schließen</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
