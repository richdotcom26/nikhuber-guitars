"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { AUFTRAGSART, BESONDERES, PRODUKTIONSORT_VALUES, SPEZIALAUFTRAG_VALUES } from "@/lib/auftrag-shared";
import { IDLE } from "@/lib/domain/action-state";
import { saveKopfAction } from "./actions";
import { formatBetrag } from "@/lib/utils";

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
  lieferdatum: string | null;
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
          <Select id="prio" name="prio" defaultValue={v.prio != null ? String(v.prio) : ""}>
            <option value="">– keine –</option>
            <option value="1">★ (1)</option>
            <option value="2">★★ (2)</option>
            <option value="3">★★★ (3)</option>
          </Select>
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
                (bauplan === m.value ? "border-button bg-button text-primary-fg" : "border-neutral-300 hover:bg-neutral-100")
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
          <Input
            id="umsatzerwartung"
            value={v.umsatzerwartung == null ? "–" : formatBetrag(v.umsatzerwartung)}
            readOnly
            tabIndex={-1}
            className="cursor-default bg-page text-muted"
            title="Wird berechnet: Summe netto der Positionen, sonst Grundpreis (netto) des Modells; USD in EUR umgerechnet."
          />
        </Field>
        <Field label="Lieferdatum" htmlFor="lieferdatum" hint="Erscheint auf Lieferschein und Rechnung.">
          <Input id="lieferdatum" name="lieferdatum" type="date" defaultValue={v.lieferdatum ?? ""} />
        </Field>
        <Field label="Besonderes" htmlFor="besonderes">
          <BesonderesSelect wert={v.besonderes} />
        </Field>
        <Field label="Spezialauftrag" htmlFor="spezialauftrag">
          <Select id="spezialauftrag" name="spezialauftrag" defaultValue={v.spezialauftrag ?? ""}>
            <option value="">(leer)</option>
            {SPEZIALAUFTRAG_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>

      <SubmitButton>Kopf speichern</SubmitButton>
    </form>
  );
}

/** Auswahl „Besonderes" in den Ninox-Farben (Promotion = Lachsrot mit Stern, Verleih = Rot mit Pfeil). */
function BesonderesSelect({ wert }: { wert: string | null }) {
  const [v, setV] = useState(wert ?? "");
  const b = BESONDERES.find((x) => x.value === v);
  return (
    <Select
      id="besonderes"
      name="besonderes"
      value={v}
      onChange={(e) => setV(e.target.value)}
      style={b ? { background: b.bg, color: b.fg, fontWeight: 600 } : undefined}
    >
      <option value="" style={{ background: "#fff", color: "#111" }}>(leer)</option>
      {BESONDERES.map((x) => (
        <option key={x.value} value={x.value} style={{ background: x.bg, color: x.fg }}>
          {x.symbol} {x.value}
        </option>
      ))}
    </Select>
  );
}
