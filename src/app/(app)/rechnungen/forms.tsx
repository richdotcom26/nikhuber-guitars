"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { BANK_VALUES, ZAHLUNGSSTATUS_VALUES } from "@/lib/rechnung-shared";
import { IDLE } from "@/lib/domain/action-state";
import {
  korrekturAction, saveAnzahlungAction, saveKopfAction, saveZahlungAction, stornoAction,
} from "./actions";
import { formatBetrag, formatMoney } from "@/lib/utils";

/* ---------------------------------------------------------------------- Kopf */

/**
 * Entwurf: Lieferdatum, Bemerkung, Report-Monat (Rechnungsdatum + Nummer kommen beim Buchen).
 * Gebucht: Inhalt gesperrt — nur Report-Monat und „beim Steuerbüro gebucht".
 */
export function KopfForm({
  id, entwurf, rechnungsdatum, lieferdatum, reportMonat, bemerkungRechnung, gebuchtBeimSteuerbuero,
}: {
  id: string;
  entwurf: boolean;
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
        <Field label="Rechnungsdatum" hint={entwurf ? "wird beim Buchen gesetzt" : undefined}>
          <Input value={rechnungsdatum ?? ""} type={rechnungsdatum ? "date" : "text"} placeholder="– beim Buchen –" disabled readOnly />
        </Field>
        <Field label="Lieferdatum" htmlFor="lieferdatum">
          <Input id="lieferdatum" name="lieferdatum" type="date" defaultValue={lieferdatum ?? ""} disabled={!entwurf} />
        </Field>
        <Field label="Report-Monat" htmlFor="reportMonat" hint="YYYY-MM">
          <Input id="reportMonat" name="reportMonat" placeholder="2026-09" defaultValue={reportMonat ?? ""} />
        </Field>
      </div>
      <Field label="Bemerkung (steht auf der Rechnung)" htmlFor="bemerkungRechnung">
        <Textarea id="bemerkungRechnung" name="bemerkungRechnung" defaultValue={bemerkungRechnung ?? ""} rows={2} disabled={!entwurf} />
      </Field>
      {entwurf ? null : (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gebuchtBeimSteuerbuero" defaultChecked={gebuchtBeimSteuerbuero} />
          beim Steuerbüro gebucht
        </label>
      )}
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

/* ------------------------------------------------------------------- Zahlung */

export function ZahlungForm({
  id, zahlungsdatum, zahlbetrag, zahlungAnBank, zahlungsstatus, abzugProzent,
  rechnungsbetrag, differenzZahlung, waehrung = "EUR",
}: {
  id: string;
  zahlungsdatum: string | null;
  zahlbetrag: string | null;
  zahlungAnBank: string | null;
  zahlungsstatus: string | null;
  abzugProzent: string | null;
  rechnungsbetrag: string | null;
  differenzZahlung: string | null;
  waehrung?: "EUR" | "USD";
}) {
  const [state, action] = useActionState(saveZahlungAction, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state ? <FormMessage state={state} /> : null}
      <p className="text-xs text-neutral-500">
        Rechnungsbetrag (Brutto − Anzahlung): <b>{formatMoney(rechnungsbetrag, waehrung)}</b>
        {differenzZahlung != null ? <> · Differenz Zahlung: <b>{formatMoney(differenzZahlung, waehrung)}</b></> : null}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Zahlungsdatum" htmlFor="zahlungsdatum">
          <Input id="zahlungsdatum" name="zahlungsdatum" type="date" defaultValue={zahlungsdatum ?? ""} />
        </Field>
        <Field label="Tatsächl. Zahlbetrag" htmlFor="zahlbetrag">
          <Input id="zahlbetrag" name="zahlbetrag" inputMode="decimal" defaultValue={formatBetrag(zahlbetrag)} />
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
  id, beruecksichtigen, brutto, datum, gesperrt = false,
}: {
  id: string;
  beruecksichtigen: boolean;
  brutto: string | null;
  datum: string | null;
  gesperrt?: boolean;
}) {
  const [state, action] = useActionState(saveAnzahlungAction, IDLE);
  return (
    <form action={action}>
      <fieldset disabled={gesperrt} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-1 text-xs text-neutral-500">
        <input type="checkbox" name="anzahlungBeruecksichtigen" defaultChecked={beruecksichtigen} />
        Anzahlung berücksichtigen
      </label>
      <Field label="Anzahlung brutto" htmlFor="anzahlungBrutto">
        <Input id="anzahlungBrutto" name="anzahlungBrutto" inputMode="decimal" defaultValue={formatBetrag(brutto)} className="h-8 w-28" />
      </Field>
      <Field label="Datum" htmlFor="anzahlungDatum">
        <Input id="anzahlungDatum" name="anzahlungDatum" type="date" defaultValue={datum ?? ""} className="h-8 w-40" />
      </Field>
      {gesperrt ? null : <SubmitButton size="sm" variant="outline">OK</SubmitButton>}
      {state && !state.ok ? <FormMessage state={state} className="w-full" /> : null}
      </fieldset>
    </form>
  );
}

/* ---------------------------------------------------- Storno / Rechnungskorrektur */

/** Für gebuchte Rechnungen: Storno (sofort gebucht) oder Rechnungskorrektur (Entwurf). */
export function KorrekturButtons({ id }: { id: string }) {
  const [frage, setFrage] = useState<null | "storno" | "korrektur">(null);
  const [stState, stAction] = useActionState(stornoAction, IDLE);
  const [koState, koAction] = useActionState(korrekturAction, IDLE);

  if (!frage) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setFrage("storno")}>Stornieren</Button>
        <Button variant="outline" size="sm" onClick={() => setFrage("korrektur")}>Rechnungskorrektur</Button>
      </div>
    );
  }

  const text = frage === "storno"
    ? "Stornorechnung buchen? Sie ist eine vollständige negative Kopie mit eigener ST-Nummer; diese Rechnung wird als „storniert“ gekennzeichnet. Danach ggf. eine neue Rechnung erstellen."
    : "Rechnungskorrektur anlegen? Es entsteht ein Entwurf mit allen Positionen negativ — nicht betroffene Positionen löschen bzw. Mengen anpassen, dann buchen (ST-Nummer).";

  return (
    <form
      action={frage === "storno" ? stAction : koAction}
      className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-3 py-2"
    >
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-neutral-700">{text}</span>
      <SubmitButton size="sm" pendingText="…">{frage === "storno" ? "Ja, stornieren" : "Ja, Entwurf anlegen"}</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setFrage(null)}>Abbrechen</Button>
      {stState && !stState.ok ? <span className="w-full text-xs text-red-600">{stState.message}</span> : null}
      {koState && !koState.ok ? <span className="w-full text-xs text-red-600">{koState.message}</span> : null}
    </form>
  );
}
