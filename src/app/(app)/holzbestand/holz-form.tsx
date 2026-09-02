"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  HOLZ_CNC, HOLZ_DICKE, HOLZ_GROESSE, HOLZ_PIECE, HOLZ_QUALITAET, HOLZ_VERWENDUNG,
} from "@/lib/holz-shared";
import { IDLE } from "@/lib/domain/action-state";
import { createHolzAction, updateHolzAction } from "./actions";

interface Opt { id: string; label: string }

export interface HolzFormValues {
  id?: string;
  inventarId?: string | null;
  holzartId?: string | null;
  unterart?: string | null;
  struktur?: string | null;
  qualitaet?: string | null;
  dicke?: string | null;
  groesse?: string | null;
  piece?: string | null;
  fuer?: string | null;
  cnc?: string | null;
  gewichtG?: number | null;
  besonderes?: string | null;
  bemerkung?: string | null;
  eingangAm?: string | null;
  lagerortId?: string | null;
  holzhaendlerId?: string | null;
  einkaufspreis?: string | null;
  profitMargin?: string | null;
  verkaufspreis?: string | null;
}

const OPT = <T extends readonly { value: string; label: string }[]>(list: T) => list;

export function HolzForm({
  mode,
  values,
  holzarten,
  lagerorte,
  holzhaendler,
}: {
  mode: "neu" | "edit";
  values: HolzFormValues;
  holzarten: Opt[];
  lagerorte: Opt[];
  holzhaendler: Opt[];
}) {
  const [state, action] = useActionState(mode === "neu" ? createHolzAction : updateHolzAction, IDLE);
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {mode === "edit" && values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader><CardTitle>Blank</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Inventar-ID" htmlFor="inventarId" errors={err.inventarId}
            hint={mode === "neu" ? "leer lassen = automatisch" : undefined}>
            <Input id="inventarId" name="inventarId" defaultValue={v(values.inventarId)} className="font-mono uppercase" />
          </Field>
          <Field label="Holzart" htmlFor="holzartId" errors={err.holzartId} className="sm:col-span-2">
            <Select id="holzartId" name="holzartId" defaultValue={v(values.holzartId)}>
              <option value="">–</option>
              {holzarten.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
            </Select>
          </Field>
          <Field label="Unterart" htmlFor="unterart"><Input id="unterart" name="unterart" defaultValue={v(values.unterart)} /></Field>
          <Field label="Struktur" htmlFor="struktur"><Input id="struktur" name="struktur" defaultValue={v(values.struktur)} /></Field>
          <Field label="Besonderes" htmlFor="besonderes"><Input id="besonderes" name="besonderes" defaultValue={v(values.besonderes)} /></Field>

          <Field label="Qualität" htmlFor="qualitaet">
            <Select id="qualitaet" name="qualitaet" defaultValue={v(values.qualitaet)}>
              <option value="">–</option>
              {OPT(HOLZ_QUALITAET).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Dicke" htmlFor="dicke">
            <Select id="dicke" name="dicke" defaultValue={v(values.dicke)}>
              <option value="">–</option>
              {OPT(HOLZ_DICKE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Größe" htmlFor="groesse">
            <Select id="groesse" name="groesse" defaultValue={v(values.groesse)}>
              <option value="">–</option>
              {OPT(HOLZ_GROESSE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Piece" htmlFor="piece">
            <Select id="piece" name="piece" defaultValue={v(values.piece)}>
              <option value="">–</option>
              {OPT(HOLZ_PIECE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Für" htmlFor="fuer">
            <Select id="fuer" name="fuer" defaultValue={v(values.fuer)}>
              <option value="">–</option>
              {OPT(HOLZ_VERWENDUNG).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="CNC" htmlFor="cnc">
            <Select id="cnc" name="cnc" defaultValue={v(values.cnc)}>
              <option value="">–</option>
              {OPT(HOLZ_CNC).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Gewicht (g)" htmlFor="gewichtG"><Input id="gewichtG" name="gewichtG" inputMode="numeric" defaultValue={v(values.gewichtG)} /></Field>
          <Field label="Eingang am" htmlFor="eingangAm"><Input id="eingangAm" name="eingangAm" type="date" defaultValue={v(values.eingangAm)} /></Field>
          <Field label="Lagerort" htmlFor="lagerortId">
            <Select id="lagerortId" name="lagerortId" defaultValue={v(values.lagerortId)}>
              <option value="">–</option>
              {lagerorte.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Bemerkung" htmlFor="bemerkung" className="sm:col-span-3">
            <Textarea id="bemerkung" name="bemerkung" defaultValue={v(values.bemerkung)} rows={2} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preise</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Holzhändler" htmlFor="holzhaendlerId" className="sm:col-span-3">
            <Select id="holzhaendlerId" name="holzhaendlerId" defaultValue={v(values.holzhaendlerId)}>
              <option value="">–</option>
              {holzhaendler.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
            </Select>
          </Field>
          <Field label="Einkaufspreis" htmlFor="einkaufspreis"><Input id="einkaufspreis" name="einkaufspreis" inputMode="decimal" defaultValue={v(values.einkaufspreis)} /></Field>
          <Field label="Profit Margin" htmlFor="profitMargin"><Input id="profitMargin" name="profitMargin" inputMode="decimal" defaultValue={v(values.profitMargin)} /></Field>
          <Field label="Verkaufspreis" htmlFor="verkaufspreis"><Input id="verkaufspreis" name="verkaufspreis" inputMode="decimal" defaultValue={v(values.verkaufspreis)} /></Field>
        </CardContent>
      </Card>

      <SubmitButton>{mode === "neu" ? "Anlegen" : "Speichern"}</SubmitButton>
    </form>
  );
}
