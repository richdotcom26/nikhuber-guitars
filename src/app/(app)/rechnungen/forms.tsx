"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { BANK_VALUES, RG_STATUS, ZAHLUNGSSTATUS_VALUES } from "@/lib/rechnung-shared";
import { IDLE } from "@/lib/domain/action-state";
import {
  gutschriftAction, saveAnzahlungAction, saveKopfAction, saveZahlungAction, stornoAction,
} from "./actions";

/* ---------------------------------------------------------------------- Kopf */

export function KopfForm({
  id, status, rechnungsdatum, lieferdatum, reportMonat, bemerkungRechnung, gebuchtBeimSteuerbuero,
}: {
  id: string;
  status: string;
  rechnungsdatum: string | null;
  lieferdatum: string | null;
  reportMonat: string | null;
  bemerkungRechnung: string | null;
  gebuchtBeimSteuerbuero: boolean;
}) {
  const [state, action] = useActionState(saveKopfAction, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state ? <FormMessage state={state} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status}>
            {RG_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Rechnungsdatum" htmlFor="rechnungsdatum">
          <Input id="rechnungsdatum" name="rechnungsdatum" type="date" defaultValue={rechnungsdatum ?? ""} />
        </Field>
        <Field label="Lieferdatum" htmlFor="lieferdatum">
          <Input id="lieferdatum" name="lieferdatum" type="date" defaultValue={lieferdatum ?? ""} />
        </Field>
        <Field label="Report-Monat" htmlFor="reportMonat" hint="YYYY-MM">
          <Input id="reportMonat" name="reportMonat" placeholder="2026-09" defaultValue={reportMonat ?? ""} />
        </Field>
      </div>
      <Field label="Bemerkung" htmlFor="bemerkungRechnung">
        <Textarea id="bemerkungRechnung" name="bemerkungRechnung" defaultValue={bemerkungRechnung ?? ""} rows={2} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="gebuchtBeimSteuerbuero" defaultChecked={gebuchtBeimSteuerbuero} />
        beim Steuerbüro gebucht (sperrt Positionsänderungen)
      </label>
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

/* ------------------------------------------------------------------- Zahlung */

export function ZahlungForm({
  id, zahlungsdatum, zahlbetrag, zahlungAnBank, zahlungsstatus, abzugProzent,
  rechnungsbetrag, differenzZahlung,
}: {
  id: string;
  zahlungsdatum: string | null;
  zahlbetrag: string | null;
  zahlungAnBank: string | null;
  zahlungsstatus: string | null;
  abzugProzent: string | null;
  rechnungsbetrag: string | null;
  differenzZahlung: string | null;
}) {
  const [state, action] = useActionState(saveZahlungAction, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state ? <FormMessage state={state} /> : null}
      <p className="text-xs text-neutral-500">
        Rechnungsbetrag (Brutto − Anzahlung): <b>{rechnungsbetrag ?? "–"}</b>
        {differenzZahlung != null ? <> · Differenz Zahlung: <b>{differenzZahlung}</b></> : null}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Zahlungsdatum" htmlFor="zahlungsdatum">
          <Input id="zahlungsdatum" name="zahlungsdatum" type="date" defaultValue={zahlungsdatum ?? ""} />
        </Field>
        <Field label="Tatsächl. Zahlbetrag" htmlFor="zahlbetrag">
          <Input id="zahlbetrag" name="zahlbetrag" inputMode="decimal" defaultValue={zahlbetrag ?? ""} />
        </Field>
        <Field label="Abzug %" htmlFor="abzugProzent">
          <Input id="abzugProzent" name="abzugProzent" inputMode="decimal" defaultValue={abzugProzent ?? ""} />
        </Field>
        <Field label="Zahlung an Bank" htmlFor="zahlungAnBank">
          <Select id="zahlungAnBank" name="zahlungAnBank" defaultValue={zahlungAnBank ?? ""}>
            <option value="">–</option>
            {BANK_VALUES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="Zahlungsstatus" htmlFor="zahlungsstatus">
          <Select id="zahlungsstatus" name="zahlungsstatus" defaultValue={zahlungsstatus ?? ""}>
            <option value="">–</option>
            {ZAHLUNGSSTATUS_VALUES.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        </Field>
      </div>
      <SubmitButton>Zahlung erfassen</SubmitButton>
    </form>
  );
}

/* ------------------------------------------------------------------ Anzahlung */

export function AnzahlungForm({
  id, beruecksichtigen, brutto, datum,
}: {
  id: string;
  beruecksichtigen: boolean;
  brutto: string | null;
  datum: string | null;
}) {
  const [state, action] = useActionState(saveAnzahlungAction, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-1 text-xs text-neutral-500">
        <input type="checkbox" name="anzahlungBeruecksichtigen" defaultChecked={beruecksichtigen} />
        Anzahlung berücksichtigen
      </label>
      <Field label="Anzahlung brutto" htmlFor="anzahlungBrutto">
        <Input id="anzahlungBrutto" name="anzahlungBrutto" inputMode="decimal" defaultValue={brutto ?? ""} className="h-8 w-28" />
      </Field>
      <Field label="Datum" htmlFor="anzahlungDatum">
        <Input id="anzahlungDatum" name="anzahlungDatum" type="date" defaultValue={datum ?? ""} className="h-8 w-40" />
      </Field>
      <SubmitButton size="sm" variant="outline">OK</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} className="w-full" /> : null}
    </form>
  );
}

/* ---------------------------------------------------------- Storno / Gutschrift */

export function StornoGutschriftButtons({ id, isRechnung }: { id: string; isRechnung: boolean }) {
  const [confirm, setConfirm] = useState<null | "storno" | "gs" | "tgs">(null);
  const [stState, stAction] = useActionState(stornoAction, IDLE);
  const [gsState, gsAction] = useActionState(gutschriftAction, IDLE);

  if (!isRechnung) return null;

  if (!confirm) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setConfirm("storno")}>Stornorechnung</Button>
        <Button variant="outline" size="sm" onClick={() => setConfirm("gs")}>Gutschrift</Button>
        <Button variant="outline" size="sm" onClick={() => setConfirm("tgs")}>Teil-Gutschrift</Button>
      </div>
    );
  }

  const label =
    confirm === "storno" ? "Stornorechnung erstellen (Original wird storniert)?"
    : confirm === "gs" ? "Volle Gutschrift erstellen?"
    : "Leere Teil-Gutschrift erstellen?";

  return (
    <form
      action={confirm === "storno" ? stAction : gsAction}
      className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-3 py-2"
    >
      <input type="hidden" name="id" value={id} />
      {confirm !== "storno" ? <input type="hidden" name="teil" value={confirm === "tgs" ? "true" : "false"} /> : null}
      <span className="text-sm text-neutral-700">{label}</span>
      <SubmitButton size="sm" pendingText="…">Ja</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Abbrechen</Button>
      {stState && !stState.ok ? <span className="text-xs text-red-600">{stState.message}</span> : null}
      {gsState && !gsState.ok ? <span className="text-xs text-red-600">{gsState.message}</span> : null}
    </form>
  );
}
