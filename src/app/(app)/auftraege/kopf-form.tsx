"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { AUFTRAGSART, PRODUKTIONSORT_VALUES } from "@/lib/auftrag-shared";
import { IDLE } from "@/lib/domain/action-state";
import { saveKopfAction } from "./actions";

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = -1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    out.push({ value, label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}` });
  }
  return out;
}

export interface KopfValues {
  id: string;
  auftragsart: string;
  prio: number | null;
  produktionsort: string | null;
  besonderes: string | null;
  spezialauftrag: string | null;
  bauplandatum: string | null;
  umsatzerwartung: string | null;
  anzahlung: string | null;
}

export function KopfForm({ v }: { v: KopfValues }) {
  const [state, action] = useActionState(saveKopfAction, IDLE);
  const [bauplan, setBauplan] = useState(v.bauplandatum ?? "");
  const months = monthOptions();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={v.id} />
      {state ? <FormMessage state={state} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Auftragsart" htmlFor="auftragsart">
          <Select id="auftragsart" name="auftragsart" defaultValue={v.auftragsart}>
            {AUFTRAGSART.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </Select>
        </Field>
        <Field label="Priorität" htmlFor="prio">
          <Input id="prio" name="prio" inputMode="numeric" defaultValue={v.prio ?? ""} />
        </Field>
        <Field label="Produktionsort" htmlFor="produktionsort">
          <Select id="produktionsort" name="produktionsort" defaultValue={v.produktionsort ?? ""}>
            <option value="">–</option>
            {PRODUKTIONSORT_VALUES.map((p) => <option key={p} value={p}>{p === "RODGAU" ? "Rodgau" : "Hamburg"}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Bauplan-Monat" hint="Schnellauswahl setzt den Monatsersten; frei wählbar über das Datumsfeld.">
        <div className="flex flex-wrap items-center gap-1.5">
          {months.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setBauplan(bauplan === m.value ? "" : m.value)}
              className={
                "rounded border px-2 py-1 text-xs " +
                (bauplan === m.value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:bg-neutral-100")
              }
            >
              {m.label}
            </button>
          ))}
          <Input
            name="bauplandatum"
            type="date"
            value={bauplan}
            onChange={(e) => setBauplan(e.target.value)}
            className="h-8 w-40"
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Umsatzerwartung (EUR-normiert)" htmlFor="umsatzerwartung">
          <Input id="umsatzerwartung" name="umsatzerwartung" inputMode="decimal" defaultValue={v.umsatzerwartung ?? ""} />
        </Field>
        <Field label="Anzahlung" htmlFor="anzahlung">
          <Input id="anzahlung" name="anzahlung" inputMode="decimal" defaultValue={v.anzahlung ?? ""} />
        </Field>
        <Field label="Besonderes" htmlFor="besonderes">
          <Input id="besonderes" name="besonderes" defaultValue={v.besonderes ?? ""} />
        </Field>
        <Field label="Spezialauftrag" htmlFor="spezialauftrag">
          <Input id="spezialauftrag" name="spezialauftrag" defaultValue={v.spezialauftrag ?? ""} />
        </Field>
      </div>

      <SubmitButton>Kopf speichern</SubmitButton>
    </form>
  );
}
