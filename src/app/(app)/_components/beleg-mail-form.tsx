"use client";

import { useActionState, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatBytes } from "@/lib/anhang-shared";
import { IDLE } from "@/lib/domain/action-state";
import { fuelleVorlage, type MailPlatzhalterWerte } from "@/lib/mail-vorlage-shared";
import type { BelegMailKontext } from "@/lib/domain/beleg-mail";
import { sendeBelegMailAction } from "./beleg-mail-actions";

/** Allgemeine Mail an den Kunden eines Angebots/Auftrags: Textbaustein wählen, Text anpassen, Anhänge optional. */
export function BelegMailForm({ ctx }: { ctx: BelegMailKontext }) {
  const [state, action] = useActionState(sendeBelegMailAction, IDLE);
  const werte = ctx.werte as MailPlatzhalterWerte;
  const start = useMemo(
    () => ctx.vorlagen.find((v) => v.istStandard && v.sprache === ctx.sprache)
      ?? ctx.vorlagen.find((v) => v.sprache === ctx.sprache)
      ?? ctx.vorlagen[0]
      ?? null,
    [ctx],
  );
  const [vorlageId, setVorlageId] = useState(start?.id ?? "");
  const [betreff, setBetreff] = useState(fuelleVorlage(start?.betreff, werte));
  const [text, setText] = useState(fuelleVorlage(start?.text, werte));
  const [auswahl, setAuswahl] = useState<Set<string>>(() => new Set());

  function vorlageWaehlen(id: string) {
    setVorlageId(id);
    const v = ctx.vorlagen.find((x) => x.id === id);
    if (!v) return;
    setBetreff(fuelleVorlage(v.betreff, werte));
    setText(fuelleVorlage(v.text, werte));
  }
  const toggle = (id: string) => setAuswahl((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const groesse = ctx.dateien.filter((d) => auswahl.has(d.id)).reduce((s, d) => s + (d.groesse ?? 0), 0);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="art" value={ctx.art} />
      <input type="hidden" name="id" value={ctx.beleg.id} />
      {[...auswahl].map((id) => <input key={id} type="hidden" name="anhangId" value={id} />)}

      <Card>
        <CardHeader><CardTitle>E-Mail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {state ? <FormMessage state={state} /> : null}
          <Field label="An" htmlFor="an" hint="E-Mail aus dem Kundendatensatz. Mehrere Adressen mit Komma trennen.">
            <Input id="an" name="an" defaultValue={ctx.an} required />
          </Field>
          <Field label="CC" htmlFor="cc">
            <Input id="cc" name="cc" defaultValue="" />
          </Field>
          <Field label="Textbaustein" htmlFor="vorlage" hint={`Pflege unter Einstellungen → Textbausteine (Belegart „${ctx.art === "angebot" ? "Angebot" : "Auftrag (allgemeine Mail)"}“).`}>
            <Select id="vorlage" value={vorlageId} onChange={(e) => vorlageWaehlen(e.target.value)}>
              {ctx.vorlagen.length === 0 ? <option value="">– keine Textbausteine angelegt –</option> : null}
              {ctx.vorlagen.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name ?? "(ohne Namen)"} · {v.sprache}{v.istStandard ? " · Standard" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Betreff" htmlFor="betreff">
            <Input id="betreff" name="betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} required />
          </Field>
          <Field label="Text" htmlFor="text">
            <Textarea id="text" name="text" rows={12} value={text} onChange={(e) => setText(e.target.value)} required />
          </Field>
          <div className="flex items-center gap-3">
            <SubmitButton pendingText="Sende …">E-Mail senden</SubmitButton>
            {groesse ? <span className="text-xs text-muted">Anhänge: {formatBytes(groesse)}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anhänge (optional)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ctx.dateien.length === 0 ? <p className="text-xs text-muted">Keine Dateien am Beleg.</p> : null}
          {ctx.dateien.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={auswahl.has(d.id)} onChange={() => toggle(d.id)} />
              <span className="min-w-0 flex-1 truncate">{d.dateiname ?? "Datei"}</span>
              <span className="text-xs text-muted">{formatBytes(d.groesse)}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    </form>
  );
}
