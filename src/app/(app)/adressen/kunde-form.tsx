"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { KONTAKTARTEN } from "@/lib/adressen-shared";
import { IDLE } from "@/lib/domain/action-state";
import { istVerkaufsrelevant, type Region, taxDefault } from "@/lib/pricing";
import { createKundeAction, updateKundeAction } from "./actions";

interface StaatOpt { id: string; name: string; region: Region }
interface ZbOpt { id: string; bezeichnung: string }

// Nur die im Formular editierbaren Felder (Rest kommt aus dem Datensatz/Defaults).
export interface KundeFormValues {
  id?: string;
  kontaktart: string;
  kundenNr?: string | null;
  firma?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  kurzname?: string | null;
  strasse?: string | null;
  adresszusatz?: string | null;
  plz?: string | null;
  ort?: string | null;
  staatId?: string | null;
  region?: string | null;
  vertriebsweg?: string | null;
  steuerpflichtig?: boolean | null;
  waehrung?: string | null;
  sprache?: string | null;
  zahlungsbedingungId?: string | null;
  ustIdNr?: string | null;
  sonderrabattProzent?: string | null;
  email?: string | null;
  emailRechnungCc?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  url?: string | null;
  briefanrede?: string | null;
  briefkopfManuell?: string | null;
  seriennummerAufRechnung?: boolean;
  person2Name?: string | null;
  person2Email?: string | null;
  person2Telefon?: string | null;
  person2Bemerkung?: string | null;
  bemerkung?: string | null;
}

const REGIONEN = ["D", "EU", "WELT", "ASIEN", "USA"] as const;
const VERTRIEBSWEGE = ["NET1", "NET2", "NET_US", "VK_US", "VK_EUR"] as const;

export function KundeForm({
  mode,
  values,
  staaten,
  zahlungsbedingungen,
}: {
  mode: "neu" | "edit";
  values: KundeFormValues;
  staaten: StaatOpt[];
  zahlungsbedingungen: ZbOpt[];
}) {
  const [state, action] = useActionState(
    mode === "neu" ? createKundeAction : updateKundeAction,
    IDLE,
  );
  const err = (state && !state.ok && state.fieldErrors) || {};
  const v = (x: string | number | null | undefined) => (x == null ? "" : String(x));

  // Kontrollierte Felder für die 7b-Ableitung.
  const [kontaktart, setKontaktart] = useState(values.kontaktart);
  const [staatId, setStaatId] = useState(v(values.staatId));
  const [region, setRegion] = useState(v(values.region));
  const [vertriebsweg, setVertriebsweg] = useState(v(values.vertriebsweg));
  const [steuerpflichtig, setSteuerpflichtig] = useState(
    values.steuerpflichtig == null ? "" : values.steuerpflichtig ? "ja" : "nein",
  );
  const [waehrung, setWaehrung] = useState(v(values.waehrung));
  const [sprache, setSprache] = useState(v(values.sprache));
  const [zahlungsbedingungId, setZahlungsbedingungId] = useState(v(values.zahlungsbedingungId));

  const staatRegion = useMemo(
    () => new Map(staaten.map((s) => [s.id, s.region])),
    [staaten],
  );
  const staatById = useMemo(() => new Map(staaten.map((s) => [s.id, s])), [staaten]);

  const vorschau = useMemo(() => {
    const r = (staatId && staatRegion.get(staatId)) || null;
    const t = taxDefault(kontaktart as never, r);
    return { r, t };
  }, [staatId, staatRegion, kontaktart]);

  function uebernehmen() {
    const s = staatId ? staatById.get(staatId) : undefined;
    if (s) {
      setRegion(s.region);
    }
    const t = vorschau.t;
    if (t) {
      setVertriebsweg(t.vertriebsweg);
      setSteuerpflichtig(t.steuerpflichtig ? "ja" : "nein");
    }
  }

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {mode === "edit" && values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state ? <FormMessage state={state} /> : null}

      <Card>
        <CardHeader><CardTitle>Stammdaten</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kontaktart" htmlFor="kontaktart" errors={err.kontaktart}>
            <Select
              id="kontaktart"
              name="kontaktart"
              value={kontaktart}
              onChange={(e) => setKontaktart(e.target.value)}
            >
              {KONTAKTARTEN.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </Field>
          <Field label="Kunden-Nr." htmlFor="kundenNr" errors={err.kundenNr}>
            <Input id="kundenNr" name="kundenNr" defaultValue={v(values.kundenNr)} />
          </Field>
          <Field label="Firma" htmlFor="firma" errors={err.firma} className="sm:col-span-2">
            <Input id="firma" name="firma" defaultValue={v(values.firma)} />
          </Field>
          <Field label="Vorname" htmlFor="vorname" errors={err.vorname}>
            <Input id="vorname" name="vorname" defaultValue={v(values.vorname)} />
          </Field>
          <Field label="Nachname" htmlFor="nachname" errors={err.nachname}>
            <Input id="nachname" name="nachname" defaultValue={v(values.nachname)} />
          </Field>
          <Field label="Kurzname" htmlFor="kurzname" errors={err.kurzname}
            hint="Anzeigename in Listen, falls keine Firma.">
            <Input id="kurzname" name="kurzname" defaultValue={v(values.kurzname)} />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Straße" htmlFor="strasse" errors={err.strasse}>
            <Input id="strasse" name="strasse" defaultValue={v(values.strasse)} />
          </Field>
          <Field label="Adresszusatz" htmlFor="adresszusatz" errors={err.adresszusatz}>
            <Input id="adresszusatz" name="adresszusatz" defaultValue={v(values.adresszusatz)} />
          </Field>
          <Field label="PLZ" htmlFor="plz" errors={err.plz}>
            <Input id="plz" name="plz" defaultValue={v(values.plz)} />
          </Field>
          <Field label="Ort" htmlFor="ort" errors={err.ort}>
            <Input id="ort" name="ort" defaultValue={v(values.ort)} />
          </Field>
          <Field label="Staat" htmlFor="staatId" errors={err.staatId} className="sm:col-span-2">
            <Select
              id="staatId"
              name="staatId"
              value={staatId}
              onChange={(e) => setStaatId(e.target.value)}
            >
              <option value="">–</option>
              {staaten.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.region})</option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preise / Steuer / Zahlung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {istVerkaufsrelevant(kontaktart as never) ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              <span>
                Ableitung aus Staat:&nbsp;
                {vorschau.r ? (
                  <>
                    Region <b>{vorschau.r}</b>
                    {vorschau.t ? (
                      <> → Vertriebsweg <b>{vorschau.t.vertriebsweg}</b>,{" "}
                        <b>{vorschau.t.steuerpflichtig ? "steuerpflichtig" : "steuerfrei"}</b></>
                    ) : null}
                  </>
                ) : <i>kein Staat gewählt</i>}
              </span>
              <button
                type="button"
                onClick={uebernehmen}
                disabled={!vorschau.r}
                className="rounded border border-neutral-300 bg-white px-2 py-0.5 font-medium hover:bg-neutral-100 disabled:opacity-40"
              >
                Übernehmen
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Region" htmlFor="region" errors={err.region}>
              <Select id="region" name="region" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">–</option>
                {REGIONEN.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Vertriebsweg" htmlFor="vertriebsweg" errors={err.vertriebsweg}>
              <Select id="vertriebsweg" name="vertriebsweg" value={vertriebsweg}
                onChange={(e) => setVertriebsweg(e.target.value)}>
                <option value="">–</option>
                {VERTRIEBSWEGE.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Steuerpflichtig" htmlFor="steuerpflichtig" errors={err.steuerpflichtig}>
              <Select id="steuerpflichtig" name="steuerpflichtig" value={steuerpflichtig}
                onChange={(e) => setSteuerpflichtig(e.target.value)}>
                <option value="">–</option>
                <option value="ja">ja</option>
                <option value="nein">nein</option>
              </Select>
            </Field>
            <Field label="Währung" htmlFor="waehrung" errors={err.waehrung}>
              <Select id="waehrung" name="waehrung" value={waehrung} onChange={(e) => setWaehrung(e.target.value)}>
                <option value="">–</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
            <Field label="Sprache" htmlFor="sprache" errors={err.sprache}>
              <Select id="sprache" name="sprache" value={sprache} onChange={(e) => setSprache(e.target.value)}>
                <option value="">–</option>
                <option value="DE">DE</option>
                <option value="EN">EN</option>
              </Select>
            </Field>
            <Field label="Zahlungsbedingung" htmlFor="zahlungsbedingungId" errors={err.zahlungsbedingungId}>
              <Select id="zahlungsbedingungId" name="zahlungsbedingungId" value={zahlungsbedingungId}
                onChange={(e) => setZahlungsbedingungId(e.target.value)}>
                <option value="">–</option>
                {zahlungsbedingungen.map((z) => (
                  <option key={z.id} value={z.id}>{z.bezeichnung.slice(0, 60)}</option>
                ))}
              </Select>
            </Field>
            <Field label="USt-IdNr." htmlFor="ustIdNr" errors={err.ustIdNr}>
              <Input id="ustIdNr" name="ustIdNr" defaultValue={v(values.ustIdNr)} />
            </Field>
            <Field label="Sonderrabatt (%)" htmlFor="sonderrabattProzent" errors={err.sonderrabattProzent}
              hint="Vorrang vor Vertriebsweg (Artists/Musiker).">
              <Input id="sonderrabattProzent" name="sonderrabattProzent" inputMode="decimal"
                defaultValue={v(values.sonderrabattProzent)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kontaktdaten</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="E-Mail (Standard)" htmlFor="email" errors={err.email}>
            <Input id="email" name="email" type="email" defaultValue={v(values.email)} />
          </Field>
          <Field label="E-Mail Rechnung (cc)" htmlFor="emailRechnungCc" errors={err.emailRechnungCc}>
            <Input id="emailRechnungCc" name="emailRechnungCc" type="email" defaultValue={v(values.emailRechnungCc)} />
          </Field>
          <Field label="Telefon" htmlFor="telefon" errors={err.telefon}>
            <Input id="telefon" name="telefon" defaultValue={v(values.telefon)} />
          </Field>
          <Field label="Mobil" htmlFor="mobil" errors={err.mobil}>
            <Input id="mobil" name="mobil" defaultValue={v(values.mobil)} />
          </Field>
          <Field label="Web" htmlFor="url" errors={err.url}>
            <Input id="url" name="url" defaultValue={v(values.url)} />
          </Field>
          <Field label="Briefanrede" htmlFor="briefanrede" errors={err.briefanrede}>
            <Input id="briefanrede" name="briefanrede" defaultValue={v(values.briefanrede)} />
          </Field>
          <Field label="Manueller Briefkopf" htmlFor="briefkopfManuell" errors={err.briefkopfManuell}
            className="sm:col-span-2" hint="Überschreibt den aus der Adresse berechneten Briefkopf.">
            <Textarea id="briefkopfManuell" name="briefkopfManuell" defaultValue={v(values.briefkopfManuell)} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="seriennummerAufRechnung" defaultChecked={!!values.seriennummerAufRechnung} />
            Seriennummer auf Rechnung ausweisen
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>2. Person / Rechnungskontakt</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="person2Name" errors={err.person2Name}>
            <Input id="person2Name" name="person2Name" defaultValue={v(values.person2Name)} />
          </Field>
          <Field label="E-Mail" htmlFor="person2Email" errors={err.person2Email}>
            <Input id="person2Email" name="person2Email" type="email" defaultValue={v(values.person2Email)} />
          </Field>
          <Field label="Telefon" htmlFor="person2Telefon" errors={err.person2Telefon}>
            <Input id="person2Telefon" name="person2Telefon" defaultValue={v(values.person2Telefon)} />
          </Field>
          <Field label="Bemerkung" htmlFor="person2Bemerkung" errors={err.person2Bemerkung}>
            <Input id="person2Bemerkung" name="person2Bemerkung" defaultValue={v(values.person2Bemerkung)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interne Bemerkung</CardTitle></CardHeader>
        <CardContent>
          <Textarea name="bemerkung" defaultValue={v(values.bemerkung)} rows={3} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton>{mode === "neu" ? "Kontakt anlegen" : "Speichern"}</SubmitButton>
      </div>
    </form>
  );
}
