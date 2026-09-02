"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { BM_KATEGORIE, EINHEIT } from "@/lib/betriebsmittel-shared";
import { IDLE } from "@/lib/domain/action-state";
import { createBetriebsmittelAction, updateBetriebsmittelAction } from "./actions";

export interface BetriebsmittelFormValues {
  id?: string;
  bezeichnung?: string | null;
  artikelnummer?: string | null;
  hersteller?: string | null;
  lieferant?: string | null;
  produktkategorie?: string | null;
  einheit?: string | null;
  menge?: string | null;
  einkaufspreis?: string | null;
  anmerkungen?: string | null;
}

export function BetriebsmittelForm({
  mode,
  values,
}: {
  mode: "neu" | "edit";
  values: BetriebsmittelFormValues;
}) {
  const [state, action] = useActionState(
    mode === "neu" ? createBetriebsmittelAction : updateBetriebsmittelAction,
    IDLE,
  );
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form action={action} className="max-w-2xl space-y-5">
      {mode === "edit" && values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader><CardTitle>Betriebsmittel</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bezeichnung" htmlFor="bezeichnung" errors={err.bezeichnung} className="sm:col-span-2">
            <Input id="bezeichnung" name="bezeichnung" defaultValue={v(values.bezeichnung)} required />
          </Field>
          <Field label="Artikelnummer" htmlFor="artikelnummer">
            <Input id="artikelnummer" name="artikelnummer" defaultValue={v(values.artikelnummer)} />
          </Field>
          <Field label="Produktkategorie" htmlFor="produktkategorie" errors={err.produktkategorie}>
            <Select id="produktkategorie" name="produktkategorie" defaultValue={v(values.produktkategorie)}>
              <option value="">–</option>
              {BM_KATEGORIE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Hersteller" htmlFor="hersteller">
            <Input id="hersteller" name="hersteller" defaultValue={v(values.hersteller)} />
          </Field>
          <Field label="Lieferant" htmlFor="lieferant">
            <Input id="lieferant" name="lieferant" defaultValue={v(values.lieferant)} />
          </Field>
          <Field label="Menge" htmlFor="menge" errors={err.menge}>
            <Input id="menge" name="menge" inputMode="decimal" defaultValue={v(values.menge)} />
          </Field>
          <Field label="Einheit" htmlFor="einheit" errors={err.einheit}>
            <Select id="einheit" name="einheit" defaultValue={v(values.einheit)}>
              <option value="">–</option>
              {EINHEIT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Einkaufspreis (€)" htmlFor="einkaufspreis" errors={err.einkaufspreis}>
            <Input id="einkaufspreis" name="einkaufspreis" inputMode="decimal" defaultValue={v(values.einkaufspreis)} />
          </Field>
          <Field label="Anmerkungen" htmlFor="anmerkungen" className="sm:col-span-2">
            <Textarea id="anmerkungen" name="anmerkungen" defaultValue={v(values.anmerkungen)} rows={2} />
          </Field>
        </CardContent>
      </Card>

      <SubmitButton>{mode === "neu" ? "Anlegen" : "Speichern"}</SubmitButton>
    </form>
  );
}
