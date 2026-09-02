"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { ARTIKELGRUPPE_VALUES, gruppeLabel } from "@/lib/artikel-shared";
import { createArtikelAction, updateArtikelAction } from "./actions";

interface LieferantOpt { id: string; label: string }

export interface ArtikelFormValues {
  id?: string;
  artikelgruppe: string;
  artikeltyp?: string | null;
  artikelNr?: string | null;
  nameKurz?: string | null;
  nameLang?: string | null;
  nameBelege?: string | null;
  nameZertifikat?: string | null;
  beschreibung?: string | null;
  vkEur?: string | null;
  vkUs?: string | null;
  vkEurNet?: string | null;
  net1?: string | null;
  net2?: string | null;
  netUs?: string | null;
  bruttoFuerNetto?: boolean;
  nichtRabattierfaehig?: boolean;
  ekNettoEur?: string | null;
  ekNettoUsd?: string | null;
  hersteller?: string | null;
  lieferantId?: string | null;
  lieferantArtikelNr?: string | null;
  bestandMin?: string | null;
  bestandMax?: string | null;
  geschuetztesHolzCites?: boolean;
  gewichtKg?: string | null;
  datensatzInaktiv?: boolean;
  schreibgeschuetzt?: boolean;
}

export function ArtikelForm({
  mode,
  values,
  lieferanten,
  isModell = false,
}: {
  mode: "neu" | "edit";
  values: ArtikelFormValues;
  lieferanten: LieferantOpt[];
  isModell?: boolean;
}) {
  const [state, action] = useActionState(
    mode === "neu" ? createArtikelAction : updateArtikelAction,
    IDLE,
  );
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {mode === "edit" && values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader><CardTitle>Basis</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Artikelgruppe" htmlFor="artikelgruppe" errors={err.artikelgruppe}>
            {isModell ? (
              <>
                <input type="hidden" name="artikelgruppe" value="MODEL" />
                <Select id="artikelgruppe" defaultValue="MODEL" disabled>
                  <option value="MODEL">Model</option>
                </Select>
              </>
            ) : (
              <Select id="artikelgruppe" name="artikelgruppe" defaultValue={values.artikelgruppe}>
                {ARTIKELGRUPPE_VALUES.map((g) => <option key={g} value={g}>{gruppeLabel(g)}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Artikeltyp" htmlFor="artikeltyp" errors={err.artikeltyp}
            hint="Holz = Eigenfertigung/CITES · Handelsware = Lager/Bestellung">
            <Select id="artikeltyp" name="artikeltyp" defaultValue={v(values.artikeltyp)}>
              <option value="">– (Konfig/Finish)</option>
              <option value="HOLZ">Holz / Fertigung</option>
              <option value="HANDELSWARE">Handelsware / Lager</option>
            </Select>
          </Field>
          <Field label="Artikel-Nr." htmlFor="artikelNr" errors={err.artikelNr}>
            <Input id="artikelNr" name="artikelNr" defaultValue={v(values.artikelNr)} />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Name (Belege)" htmlFor="nameBelege" errors={err.nameBelege} className="sm:col-span-2">
            <Input id="nameBelege" name="nameBelege" defaultValue={v(values.nameBelege)} />
          </Field>
          <Field label="Name lang" htmlFor="nameLang" errors={err.nameLang}>
            <Input id="nameLang" name="nameLang" defaultValue={v(values.nameLang)} />
          </Field>
          <Field label="Name kurz" htmlFor="nameKurz" errors={err.nameKurz}>
            <Input id="nameKurz" name="nameKurz" defaultValue={v(values.nameKurz)} />
          </Field>
          <Field label="Name Zertifikat" htmlFor="nameZertifikat" errors={err.nameZertifikat}>
            <Input id="nameZertifikat" name="nameZertifikat" defaultValue={v(values.nameZertifikat)} />
          </Field>
          <Field label="Beschreibung" htmlFor="beschreibung" errors={err.beschreibung} className="sm:col-span-2">
            <Textarea id="beschreibung" name="beschreibung" defaultValue={v(values.beschreibung)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preise</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-neutral-500">
            {isModell
              ? "Basispreise des Modells. Für Options-Artikel sind vk_eur / vk_us die (auch negativen) Aufpreise."
              : "vk_eur / vk_us sind bei Options-Artikeln die (auch negativen) Aufpreise."}
            {" "}Die Tier-Preise (Netto, NET1/2, NET US) berechnet der Server aus den Margen in den Einstellungen.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="VK EUR (brutto)" htmlFor="vkEur" errors={err.vkEur}>
              <Input id="vkEur" name="vkEur" inputMode="decimal" defaultValue={v(values.vkEur)} />
            </Field>
            <Field label="VK US" htmlFor="vkUs" errors={err.vkUs}>
              <Input id="vkUs" name="vkUs" inputMode="decimal" defaultValue={v(values.vkUs)} />
            </Field>
            <div />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="bruttoFuerNetto" defaultChecked={!!values.bruttoFuerNetto} />
              Brutto für Netto
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="nichtRabattierfaehig" defaultChecked={!!values.nichtRabattierfaehig} />
              nicht rabattierfähig
            </label>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-neutral-50 px-3 py-2 text-xs sm:grid-cols-4">
            <Derived label="VK EUR netto" value={values.vkEurNet} />
            <Derived label="NET1" value={values.net1} />
            <Derived label="NET2" value={values.net2} />
            <Derived label="NET US" value={values.netUs} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Einkauf / Lieferant</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Lieferant" htmlFor="lieferantId" errors={err.lieferantId}>
            <Select id="lieferantId" name="lieferantId" defaultValue={v(values.lieferantId)}>
              <option value="">–</option>
              {lieferanten.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="Lieferant Artikel-Nr." htmlFor="lieferantArtikelNr" errors={err.lieferantArtikelNr}>
            <Input id="lieferantArtikelNr" name="lieferantArtikelNr" defaultValue={v(values.lieferantArtikelNr)} />
          </Field>
          <Field label="Hersteller" htmlFor="hersteller" errors={err.hersteller}>
            <Input id="hersteller" name="hersteller" defaultValue={v(values.hersteller)} />
          </Field>
          <div />
          <Field label="EK netto EUR" htmlFor="ekNettoEur" errors={err.ekNettoEur}>
            <Input id="ekNettoEur" name="ekNettoEur" inputMode="decimal" defaultValue={v(values.ekNettoEur)} />
          </Field>
          <Field label="EK netto USD" htmlFor="ekNettoUsd" errors={err.ekNettoUsd}>
            <Input id="ekNettoUsd" name="ekNettoUsd" inputMode="decimal" defaultValue={v(values.ekNettoUsd)} />
          </Field>
          <Field label="Bestand min" htmlFor="bestandMin" errors={err.bestandMin}>
            <Input id="bestandMin" name="bestandMin" inputMode="decimal" defaultValue={v(values.bestandMin)} />
          </Field>
          <Field label="Bestand max" htmlFor="bestandMax" errors={err.bestandMax}>
            <Input id="bestandMax" name="bestandMax" inputMode="decimal" defaultValue={v(values.bestandMax)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>NKS / Sonstiges</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="geschuetztesHolzCites" defaultChecked={!!values.geschuetztesHolzCites} />
            Geschütztes Holz (CITES)
          </label>
          <Field label="Gewicht (kg)" htmlFor="gewichtKg" errors={err.gewichtKg}>
            <Input id="gewichtKg" name="gewichtKg" inputMode="decimal" defaultValue={v(values.gewichtKg)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="datensatzInaktiv" defaultChecked={!!values.datensatzInaktiv} />
            Datensatz inaktiv (Archiv)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="schreibgeschuetzt" defaultChecked={!!values.schreibgeschuetzt} />
            schreibgeschützt
          </label>
        </CardContent>
      </Card>

      <SubmitButton>{mode === "neu" ? "Artikel anlegen" : "Speichern"}</SubmitButton>
    </form>
  );
}

function Derived({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-mono tabular-nums">{value ?? "–"}</dd>
    </div>
  );
}
