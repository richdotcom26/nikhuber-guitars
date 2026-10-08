"use client";

import { type CSSProperties, useActionState, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import {
  THEME_FELDER, THEME_GRUPPEN, THEME_VORLAGEN, type ThemeFarben, istFarbe, zuHex,
} from "@/lib/theme-shared";
import {
  aktiviereThemeAction, dupliziereThemeAction, loescheThemeAction, saveThemeAction,
} from "./actions";

interface ThemeRow {
  id: string;
  name: string;
  farben: Record<string, string>;
  aktiv: boolean;
  updatedAt: string | Date;
}

/** CSS-Variablen als Inline-Style — für Vorschau und Farbmuster. */
function varsStyle(farben: Record<string, string>): CSSProperties {
  const s: Record<string, string> = {};
  for (const f of THEME_FELDER) {
    const v = farben[f.key];
    if (v && istFarbe(v)) s[f.cssVar] = v;
  }
  return s as CSSProperties;
}

export function ThemesPanel({ rows, istAdmin }: { rows: ThemeRow[]; istAdmin: boolean }) {
  const [neu, setNeu] = useState<ThemeFarben | null>(null);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Themes ({rows.length})</CardTitle>
          {istAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Neu aus Vorlage:</span>
              {THEME_VORLAGEN.map((v) => (
                <Button key={v.name} size="sm" variant="outline" onClick={() => setNeu({ ...v.farben })}>
                  {v.name}
                </Button>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted">
          Das <b className="text-ink">aktive</b> Theme gilt für alle Benutzer (inkl. Anmeldeseite).
          {istAdmin ? " Themes anlegen, ändern und aktivieren dürfen nur Admins." : " Ändern dürfen nur Admins."}
        </CardContent>
      </Card>

      {neu ? <ThemeEditor start={{ name: "", farben: neu }} onDone={() => setNeu(null)} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((t) => (
          <ThemeKarte key={`${t.id}:${new Date(t.updatedAt).getTime()}:${t.aktiv}`} t={t} istAdmin={istAdmin} />
        ))}
      </div>
    </div>
  );
}

function ThemeKarte({ t, istAdmin }: { t: ThemeRow; istAdmin: boolean }) {
  const [edit, setEdit] = useState(false);
  const [aktState, aktAction] = useActionState(aktiviereThemeAction, IDLE);
  const [dupState, dupAction] = useActionState(dupliziereThemeAction, IDLE);
  const [delState, delAction] = useActionState(loescheThemeAction, IDLE);
  const fehler = [aktState, dupState, delState].find((s) => s && !s.ok) ?? null;

  if (edit) {
    return (
      <div className="lg:col-span-2">
        <ThemeEditor start={{ id: t.id, name: t.name, farben: t.farben as ThemeFarben }} onDone={() => setEdit(false)} />
      </div>
    );
  }

  return (
    <Card className={t.aktiv ? "ring-2 ring-brand" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t.name}
          {t.aktiv ? <Badge tone="green">Aktiv</Badge> : null}
        </CardTitle>
        {istAdmin ? (
          <div className="flex flex-wrap gap-1">
            {!t.aktiv ? (
              <form action={aktAction}>
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton size="sm" pendingText="…">Aktivieren</SubmitButton>
              </form>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>Bearbeiten</Button>
            <form action={dupAction}>
              <input type="hidden" name="id" value={t.id} />
              <SubmitButton size="sm" variant="ghost" pendingText="…">Duplizieren</SubmitButton>
            </form>
            {!t.aktiv ? (
              <form action={delAction} onSubmit={(e) => { if (!confirm(`Theme „${t.name}“ löschen?`)) e.preventDefault(); }}>
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Löschen</SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {fehler ? <FormMessage state={fehler} /> : null}
        <div className="flex flex-wrap gap-1.5">
          {THEME_FELDER.map((f) => (
            <span
              key={f.key}
              title={`${f.label}: ${t.farben[f.key] ?? "–"}`}
              className="h-6 w-6 rounded-full border border-line"
              style={{ background: t.farben[f.key] }}
            />
          ))}
        </div>
        <Vorschau farben={t.farben} klein />
      </CardContent>
    </Card>
  );
}

function ThemeEditor({
  start, onDone,
}: {
  start: { id?: string; name: string; farben: ThemeFarben };
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveThemeAction, IDLE);
  const [name, setName] = useState(start.name);
  const [farben, setFarben] = useState<Record<string, string>>({ ...start.farben });

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const set = (k: string, v: string) => setFarben((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{start.id ? `Theme „${start.name}“ bearbeiten` : "Neues Theme"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            {start.id ? <input type="hidden" name="id" value={start.id} /> : null}
            {state && !state.ok ? <FormMessage state={state} /> : null}
            <Field label="Name" htmlFor="theme-name">
              <Input id="theme-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>

            {THEME_GRUPPEN.map((g) => (
              <section key={g} className="space-y-3">
                <h3 className="border-t-2 border-brand pt-2 text-xs font-bold uppercase tracking-wide text-navy">{g}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {THEME_FELDER.filter((f) => f.gruppe === g).map((f) => {
                    const v = farben[f.key] ?? "";
                    const ok = istFarbe(v);
                    return (
                      <Field key={f.key} label={f.label} htmlFor={`f-${f.key}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={`${f.label} wählen`}
                            value={zuHex(v)}
                            onChange={(e) => set(f.key, e.target.value.toUpperCase())}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-line bg-transparent p-0.5"
                          />
                          <Input
                            id={`f-${f.key}`}
                            name={f.key}
                            value={v}
                            onChange={(e) => set(f.key, e.target.value)}
                            className={ok ? "font-mono text-sm" : "border-red-400 font-mono text-sm"}
                          />
                        </div>
                      </Field>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="flex gap-2">
              <SubmitButton>Speichern</SubmitButton>
              <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
            </div>
          </div>

          <div className="space-y-2 xl:sticky xl:top-4 xl:self-start">
            <div className="text-xs font-medium text-muted">Vorschau</div>
            <Vorschau farben={farben} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Mini-Oberfläche mit den Theme-Farben (CSS-Variablen nur innerhalb dieses Kastens). */
function Vorschau({ farben, klein = false }: { farben: Record<string, string>; klein?: boolean }) {
  return (
    <div style={varsStyle(farben)} className="overflow-hidden rounded-lg border border-line">
      <div className="space-y-3 bg-page p-3 text-ink">
        <div className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded bg-button text-[10px] font-bold text-primary-fg">NH</span>
          <span className="rounded bg-button px-2 py-0.5 text-xs text-primary-fg">Aktiv</span>
          <span className="rounded px-2 py-0.5 text-xs text-muted hover:bg-brand-soft">Menü</span>
        </div>
        <div className="space-y-2 rounded-lg border border-line bg-surface p-3">
          <div className="text-sm font-semibold text-navy">Übersicht &amp; Statistiken</div>
          {klein ? null : (
            <p className="text-xs">
              Fließtext in „Schrift mittel“, <span className="text-muted">Nebentext gedämpft</span> und ein{" "}
              <span className="font-medium text-brand underline">Akzent-Link</span>.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-fg">Speichern</span>
            <span className="rounded-lg border border-line bg-surface px-3 py-1 text-xs">Abbrechen</span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Badge</span>
          </div>
          {klein ? null : (
            <div
              className="rounded-md border border-brand bg-field px-2 py-1 text-xs"
              style={{ boxShadow: "0 0 0 3px var(--color-glow)" }}
            >
              Eingabefeld mit Fokus
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
