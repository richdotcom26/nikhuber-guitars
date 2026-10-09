"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatBytes } from "@/lib/anhang-shared";
import { IDLE } from "@/lib/domain/action-state";
import { fuelleVorlage, type MailPlatzhalterWerte, splitEmails } from "@/lib/mail-vorlage-shared";
import { sendeRechnungMailAction } from "../../actions";

interface Vorlage {
  id: string;
  belegart: string;
  sprache: string;
  name: string | null;
  istStandard: boolean;
  betreff: string | null;
  text: string | null;
}
interface Bild {
  id: string;
  dateiname: string | null;
  groesse: number | null;
  mitRechnung: boolean;
  previewUrl: string | null;
}

export interface MailKontext {
  rechnung: { id: string; nummer: string };
  sprache: "DE" | "EN";
  an: string;
  rechnungsEmpfaenger: string | null;
  werte: MailPlatzhalterWerte;
  vorlagen: Vorlage[];
  pdf: { id: string; dateiname: string | null; groesse: number | null } | null;
  bilder: Bild[];
  /** Mahnung: nächste Stufe + Platzhalterwerte je Stufe (Betrag, Gebühr, Gesamt). */
  mahnung?: { naechste: number; jeStufe: Record<number, Record<string, string>> } | null;
}

export function RechnungMailForm({ ctx }: { ctx: MailKontext }) {
  const [state, action] = useActionState(sendeRechnungMailAction, IDLE);

  // Standard-Textbaustein in Kundensprache (Fallback: erster der Sprache, dann irgendeiner)
  const stufeVon = (v?: Vorlage | null) => (v?.belegart.startsWith("MAHNUNG_") ? Number(v.belegart.slice(8)) : null);
  const werteFuer = (v?: Vorlage | null): MailPlatzhalterWerte => {
    const st = stufeVon(v);
    return st && ctx.mahnung ? ({ ...ctx.werte, ...ctx.mahnung.jeStufe[st] } as MailPlatzhalterWerte) : ctx.werte;
  };
  const start = useMemo(
    () => (ctx.mahnung
      ? ctx.vorlagen.find((v) => v.belegart === `MAHNUNG_${ctx.mahnung!.naechste}` && v.sprache === ctx.sprache)
        ?? ctx.vorlagen.find((v) => v.belegart === `MAHNUNG_${ctx.mahnung!.naechste}`)
      : undefined)
      ?? ctx.vorlagen.find((v) => v.istStandard && v.sprache === ctx.sprache)
      ?? ctx.vorlagen.find((v) => v.sprache === ctx.sprache)
      ?? ctx.vorlagen[0]
      ?? null,
    [ctx],
  );
  const [vorlageId, setVorlageId] = useState(start?.id ?? "");
  const [betreff, setBetreff] = useState(fuelleVorlage(start?.betreff, werteFuer(start)));
  const [text, setText] = useState(fuelleVorlage(start?.text, werteFuer(start)));
  const [an, setAn] = useState(ctx.an);
  const [cc, setCc] = useState("");
  const [bilder, setBilder] = useState<Set<string>>(
    () => new Set(ctx.bilder.filter((b) => b.mitRechnung).map((b) => b.id)),
  );

  function vorlageWaehlen(id: string) {
    setVorlageId(id);
    const v = ctx.vorlagen.find((x) => x.id === id);
    if (!v) return;
    setBetreff(fuelleVorlage(v.betreff, werteFuer(v)));
    setText(fuelleVorlage(v.text, werteFuer(v)));
  }

  const reEmail = ctx.rechnungsEmpfaenger?.trim() || null;
  const reEmailDrin = !!reEmail && [...splitEmails(an), ...splitEmails(cc)]
    .some((e) => e.toLowerCase() === reEmail.toLowerCase());

  function reEmailEinfuegen() {
    if (!reEmail || reEmailDrin) return;
    setCc((c) => (c.trim() ? `${c.trim()}, ${reEmail}` : reEmail));
  }

  function toggleBild(id: string) {
    setBilder((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const groesse = (ctx.pdf?.groesse ?? 0)
    + ctx.bilder.filter((b) => bilder.has(b.id)).reduce((s, b) => s + (b.groesse ?? 0), 0);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <input type="hidden" name="id" value={ctx.rechnung.id} />
      {ctx.mahnung && stufeVon(ctx.vorlagen.find((v) => v.id === vorlageId)) ? (
        <input type="hidden" name="mahnStufe" value={stufeVon(ctx.vorlagen.find((v) => v.id === vorlageId))!} />
      ) : null}
      {[...bilder].map((id) => <input key={id} type="hidden" name="bildId" value={id} />)}

      <Card>
        <CardHeader><CardTitle>E-Mail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {state ? <FormMessage state={state} /> : null}

          <Field label="An" htmlFor="an" hint="E-Mail aus dem Kundendatensatz. Mehrere Adressen mit Komma trennen.">
            <Input id="an" name="an" value={an} onChange={(e) => setAn(e.target.value)} required />
          </Field>

          <Field label="Weitere Empfänger (CC)" htmlFor="cc" hint="Optional, z. B. eine zusätzliche Adresse manuell eintragen.">
            <div className="flex flex-wrap items-center gap-2">
              <Input id="cc" name="cc" value={cc} onChange={(e) => setCc(e.target.value)} className="min-w-64 flex-1" />
              {reEmail ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reEmailDrin}
                  onClick={reEmailEinfuegen}
                  title="Rechnungsempfänger-E-Mail aus dem Kundendatensatz"
                >
                  {reEmailDrin ? "Rechnungsempfänger ✓" : `+ Rechnungsempfänger (${reEmail})`}
                </Button>
              ) : null}
            </div>
          </Field>

          <Field label="Textbaustein" htmlFor="vorlage">
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
            <span className="text-xs text-muted">Anhänge gesamt: {formatBytes(groesse)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anhänge</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked disabled />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded border border-line bg-red-50 text-xs font-semibold text-red-700">PDF</span>
            <span className="min-w-0 flex-1 truncate">{ctx.pdf?.dateiname ?? "Rechnung.pdf"}</span>
            <span className="text-xs text-muted">{formatBytes(ctx.pdf?.groesse)}</span>
          </label>

          {ctx.bilder.length > 0 ? (
            <>
              <div className="pt-1 text-xs font-medium text-muted">Fotos (vom Auftrag / der Rechnung)</div>
              {ctx.bilder.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={bilder.has(b.id)} onChange={() => toggleBild(b.id)} />
                  {b.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded border border-line object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{b.dateiname ?? "Bild"}</span>
                  <span className="text-xs text-muted">{formatBytes(b.groesse)}</span>
                </label>
              ))}
            </>
          ) : (
            <p className="text-xs text-muted">
              Keine Fotos vorhanden. Fotos der fertigen Gitarre im Auftrag unter „Dokumente &amp; Bilder“ hochladen
              und dort „Mit Rechnung senden“ anhaken.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
