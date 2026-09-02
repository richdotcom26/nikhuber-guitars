"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import type { getFirmaSetting } from "@/lib/domain/stammdaten";
import { saveFirmaSettingAction } from "./actions";

type Setting = Awaited<ReturnType<typeof getFirmaSetting>>;

export function FirmaForm({ setting }: { setting: Setting }) {
  const [state, action] = useActionState(saveFirmaSettingAction, IDLE);
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader><CardTitle>Firmenanschrift</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Firma" htmlFor="firma" errors={err.firma} className="sm:col-span-2">
            <Input id="firma" name="firma" defaultValue={v(setting.firma)} required />
          </Field>
          <Field label="Straße" htmlFor="strasse" errors={err.strasse} className="sm:col-span-2">
            <Input id="strasse" name="strasse" defaultValue={v(setting.strasse)} />
          </Field>
          <Field label="PLZ" htmlFor="plz" errors={err.plz}>
            <Input id="plz" name="plz" defaultValue={v(setting.plz)} />
          </Field>
          <Field label="Ort" htmlFor="ort" errors={err.ort}>
            <Input id="ort" name="ort" defaultValue={v(setting.ort)} />
          </Field>
          <Field label="Land" htmlFor="land" errors={err.land}>
            <Input id="land" name="land" defaultValue={v(setting.land)} />
          </Field>
          <Field label="Steuernummer" htmlFor="steuerNr" errors={err.steuerNr}>
            <Input id="steuerNr" name="steuerNr" defaultValue={v(setting.steuerNr)} />
          </Field>
          <Field label="USt-IdNr." htmlFor="ustId" errors={err.ustId} hint="für ZUGFeRD/E-Rechnung">
            <Input id="ustId" name="ustId" defaultValue={v(setting.ustId)} placeholder="DE…" />
          </Field>
          <Field label="IBAN" htmlFor="iban" errors={err.iban}>
            <Input id="iban" name="iban" defaultValue={v(setting.iban)} />
          </Field>
          <Field label="BIC" htmlFor="bic" errors={err.bic}>
            <Input id="bic" name="bic" defaultValue={v(setting.bic)} />
          </Field>
          <Field label="Bankverbindung (Freitext für Beleg)" htmlFor="bank" errors={err.bank} className="sm:col-span-2">
            <Input id="bank" name="bank" defaultValue={v(setting.bank)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Steuer &amp; Währung</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="MwSt-Satz (%)" htmlFor="mwstSatz" errors={err.mwstSatz}>
            <Input id="mwstSatz" name="mwstSatz" inputMode="decimal" defaultValue={v(setting.mwstSatz)} required />
          </Field>
          <Field label="USD → EUR Faktor" htmlFor="usdEurFaktor" errors={err.usdEurFaktor}
            hint="Umrechnung USD-Beträge in EUR (Report/Kalkulation).">
            <Input id="usdEurFaktor" name="usdEurFaktor" inputMode="decimal" defaultValue={v(setting.usdEurFaktor)} required />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Händlerrabatte (Artikel-Preispflege)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Händler EU – NET1 (%)" htmlFor="haendlerrabattNet1" errors={err.haendlerrabattNet1}>
            <Input id="haendlerrabattNet1" name="haendlerrabattNet1" inputMode="decimal" defaultValue={v(setting.haendlerrabattNet1)} required />
          </Field>
          <Field label="Händler nicht-EU – NET2 (%)" htmlFor="haendlerrabattNet2" errors={err.haendlerrabattNet2}>
            <Input id="haendlerrabattNet2" name="haendlerrabattNet2" inputMode="decimal" defaultValue={v(setting.haendlerrabattNet2)} required />
          </Field>
          <Field label="US-Händlerrabatt (%)" htmlFor="usHaendlerrabatt" errors={err.usHaendlerrabatt}>
            <Input id="usHaendlerrabatt" name="usHaendlerrabatt" inputMode="decimal" defaultValue={v(setting.usHaendlerrabatt)} required />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>US-Preisermittlung (Kalkulationshilfe)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Import-Faktor" htmlFor="importFaktor" errors={err.importFaktor}>
            <Input id="importFaktor" name="importFaktor" inputMode="decimal" defaultValue={v(setting.importFaktor)} />
          </Field>
          <Field label="Dollarkurs-Faktor" htmlFor="dollarkursFaktor" errors={err.dollarkursFaktor}>
            <Input id="dollarkursFaktor" name="dollarkursFaktor" inputMode="decimal" defaultValue={v(setting.dollarkursFaktor)} />
          </Field>
          <Field label="Versand BUTZ (€)" htmlFor="versandButz" errors={err.versandButz}>
            <Input id="versandButz" name="versandButz" inputMode="decimal" defaultValue={v(setting.versandButz)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Seriennummern &amp; Lacey / CITES</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Seriennummern-Start" htmlFor="serienStart" errors={err.serienStart}
            hint="Kleinster laufender Zähler (monoton).">
            <Input id="serienStart" name="serienStart" inputMode="numeric" defaultValue={v(setting.serienStart)} required />
          </Field>
          <Field label="HTS-Code" htmlFor="htsCode" errors={err.htsCode}>
            <Input id="htsCode" name="htsCode" defaultValue={v(setting.htsCode)} required />
          </Field>
          <Field label="Lacey-Unterzeichner" htmlFor="laceyUnterzeichner" errors={err.laceyUnterzeichner}>
            <Input id="laceyUnterzeichner" name="laceyUnterzeichner" defaultValue={v(setting.laceyUnterzeichner)} required />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kalkulation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kostensatz je Stunde (€)" htmlFor="kostensatzStunde" errors={err.kostensatzStunde}>
            <Input id="kostensatzStunde" name="kostensatzStunde" inputMode="decimal" defaultValue={v(setting.kostensatzStunde)} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton>Speichern</SubmitButton>
      </div>
    </form>
  );
}
