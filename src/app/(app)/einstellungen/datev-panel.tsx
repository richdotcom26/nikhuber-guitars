"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { saveDatevKonfigAction } from "./actions";

export interface DatevKonfig {
  datevBeraterNr: string | null;
  datevMandantNr: string | null;
  datevSachkontenlaenge: number;
  datevWjBeginnMonat: number;
  datevDebitor: string;
  datevKontoInland: string;
  datevKontoEu: string;
  datevKontoDrittland: string;
  datevKontoAnzahlung: string;
  datevEmpfaenger: string;
}

export function DatevPanel({ s }: { s: DatevKonfig }) {
  const [state, action] = useActionState(saveDatevKonfigAction, IDLE);
  const feld = (name: string, label: string, wert: string | number | null, hint?: string) => (
    <Field label={label} htmlFor={name} hint={hint}>
      <Input id={name} name={name} defaultValue={wert ?? ""} className="h-9" />
    </Field>
  );
  return (
    <Card>
      <CardHeader><CardTitle>DATEV-Export (Rechnungsausgang)</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state ? <FormMessage state={state} /> : null}
          <p className="text-sm text-muted">
            Werte bitte mit dem Steuerbüro abstimmen. Vorgaben entsprechen SKR03 (Inland 8400, EU-Lieferung 8125,
            Ausfuhr 8120, erhaltene Anzahlungen 1718, Sammeldebitor 10000).
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {feld("beraterNr", "Beraternummer", s.datevBeraterNr)}
            {feld("mandantNr", "Mandantennummer", s.datevMandantNr)}
            {feld("sachkontenlaenge", "Sachkontenlänge", s.datevSachkontenlaenge)}
            {feld("wjBeginnMonat", "WJ-Beginn (Monat)", s.datevWjBeginnMonat)}
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {feld("debitor", "Debitor (Sammel)", s.datevDebitor)}
            {feld("kontoInland", "Erlöse Inland 19 %", s.datevKontoInland)}
            {feld("kontoEu", "Erlöse EU (ig. Lief.)", s.datevKontoEu)}
            {feld("kontoDrittland", "Erlöse Drittland", s.datevKontoDrittland)}
            {feld("kontoAnzahlung", "Anzahlungen", s.datevKontoAnzahlung)}
          </div>
          {feld("empfaenger", "Empfänger (E-Mail, mehrere mit Komma)", s.datevEmpfaenger)}
          <SubmitButton>Speichern</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
