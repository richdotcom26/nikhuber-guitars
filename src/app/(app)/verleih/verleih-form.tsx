"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { formatBetrag } from "@/lib/utils";
import { ZUBEHOER_STANDARD } from "@/lib/verleih-shared";
import { createVerleihAction, updateVerleihAction } from "./actions";

export interface GitarreOpt { id: string; label: string; wert: string | null }

export interface VerleihFormValues {
  id?: string;
  auftragId: string;
  kundeId: string;
  versendetAm: string | null;
  verfuegbarBis: string | null;
  zurueckAm: string | null;
  zweck: string | null;
  zubehoer: string | null;
  wert: string | null;
  bemerkung: string | null;
}

export function VerleihForm({
  values, gitarren, kundeName,
}: {
  values: VerleihFormValues;
  gitarren: GitarreOpt[];
  kundeName: string;
}) {
  const neu = !values.id;
  const [state, action] = useActionState(neu ? createVerleihAction : updateVerleihAction, IDLE);
  const err = (state && !state.ok && state.fieldErrors) || {};
  return (
    <form action={action} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="kundeId" value={values.kundeId} />
      {state ? <FormMessage state={state} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Gitarre" htmlFor="auftragId" errors={err.auftragId}>
          <Select id="auftragId" name="auftragId" defaultValue={values.auftragId} required>
            <option value="">– wählen –</option>
            {gitarren.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </Select>
        </Field>
        <Field label="Kontakt (Empfänger)" htmlFor="kunde">
          <Input id="kunde" value={kundeName} readOnly tabIndex={-1} className="cursor-default bg-page" />
        </Field>
        <Field label="Versendet am" htmlFor="versendetAm" errors={err.versendetAm}>
          <Input id="versendetAm" name="versendetAm" type="date" defaultValue={values.versendetAm ?? ""} />
        </Field>
        <Field label="Zur Verfügung bis (Rückgabe spätestens)" htmlFor="verfuegbarBis" errors={err.verfuegbarBis}>
          <Input id="verfuegbarBis" name="verfuegbarBis" type="date" defaultValue={values.verfuegbarBis ?? ""} />
        </Field>
        {neu ? <input type="hidden" name="zurueckAm" value="" /> : (
          <Field label="Zurück am" htmlFor="zurueckAm" errors={err.zurueckAm}>
            <Input id="zurueckAm" name="zurueckAm" type="date" defaultValue={values.zurueckAm ?? ""} />
          </Field>
        )}
        <Field label="Zweck" htmlFor="zweck" errors={err.zweck}>
          <Input id="zweck" name="zweck" defaultValue={values.zweck ?? ""} placeholder="z. B. Test, Messe, Endorsement" />
        </Field>
        <Field label="Zubehör" htmlFor="zubehoer" errors={err.zubehoer}>
          <Input id="zubehoer" name="zubehoer" defaultValue={values.zubehoer ?? ZUBEHOER_STANDARD} placeholder="mit Komma trennen, z. B. Koffer, Gurt" />
        </Field>
        <Field label="Wert (EUR, für Haftung)" htmlFor="wert" errors={err.wert}>
          <Input id="wert" name="wert" inputMode="decimal" defaultValue={formatBetrag(values.wert)} />
        </Field>
      </div>
      <Field label="Bemerkung" htmlFor="bemerkung" errors={err.bemerkung}>
        <Textarea id="bemerkung" name="bemerkung" rows={2} defaultValue={values.bemerkung ?? ""} />
      </Field>
      <SubmitButton>{neu ? "Verleih anlegen" : "Speichern"}</SubmitButton>
    </form>
  );
}
