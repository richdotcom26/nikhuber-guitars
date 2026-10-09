"use client";

import { useActionState, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/form";
import { Select, Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import type { SlotCandidate, SpecRow, SpecTraeger } from "@/lib/domain/specs";
import {
  SECTION_LABEL, SECTIONS, slotsOfSection, type SpecSection,
} from "@/lib/specs/slots";
import { addMultiSlotAction, setFreitextAction, setSlotAction } from "./spec-actions";

export interface SpecsEditorProps {
  traeger: SpecTraeger;
  traegerId: string;
  rows: SpecRow[];
  freitexte: Partial<Record<SpecSection, string | null>>;
  candidates: Record<string, SlotCandidate[]>;
  readOnly?: boolean;
}

export function SpecsEditor({
  traeger, traegerId, rows, freitexte, candidates, readOnly,
}: SpecsEditorProps) {
  const byKey = new Map<string, SpecRow[]>();
  for (const r of rows) {
    const l = byKey.get(r.slotKey) ?? [];
    l.push(r);
    byKey.set(r.slotKey, l);
  }

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <Card key={section}>
          <CardHeader><CardTitle>{SECTION_LABEL[section]}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {slotsOfSection(section).map((slot) => {
              const slotRows = byKey.get(slot.key) ?? [];
              const cands = candidates[slot.key] ?? [];
              if (slot.multi) {
                return (
                  <div key={slot.key} className="rounded-md border border-neutral-100 p-2">
                    <div className="mb-1 text-xs font-medium text-neutral-600">
                      {slot.caption} <span className="text-neutral-400">(mehrfach)</span>
                    </div>
                    <div className="space-y-1">
                      {slotRows.map((r) => (
                        <SlotLine
                          key={r.id}
                          {...{ traeger, traegerId, slot, candidates: cands, row: r, readOnly }}
                        />
                      ))}
                      {!readOnly ? (
                        <AddMultiLine {...{ traeger, traegerId, slotKey: slot.key, candidates: cands }} />
                      ) : null}
                    </div>
                  </div>
                );
              }
              return (
                <SlotLine
                  key={`${slot.key}:${slotRows[0]?.id ?? "leer"}`}
                  {...{ traeger, traegerId, slot, candidates: cands, row: slotRows[0], readOnly }}
                />
              );
            })}

            <FreitextLine
              key={`ft:${section}:${freitexte[section] ?? ""}`}
              traeger={traeger}
              traegerId={traegerId}
              section={section}
              value={freitexte[section] ?? ""}
              readOnly={readOnly}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ holz marker */

/**
 * Kennzeichnung links neben der Auswahl: Holzstamm bei Artikeltyp „Holz / Fertigung";
 * bei geschütztem Holz (CITES) rot mit Warndreieck davor. Feste Breite → Auswahlfelder bleiben bündig.
 */
function HolzMarker({ holz, cites }: { holz: boolean; cites: boolean }) {
  const titel = cites
    ? "Geschütztes Holz (CITES) – Herkunfts-/Ausfuhrdokumente beachten"
    : holz ? "Holz / Fertigung" : undefined;
  return (
    <span className="flex w-9 shrink-0 items-center justify-end gap-0.5" title={titel} aria-label={titel}>
      {cites ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-red-600" aria-hidden="true">
          <path fill="currentColor" d="M8 1.5 15 14H1L8 1.5Zm-.75 4.5v4h1.5V6h-1.5Zm0 5.25v1.5h1.5v-1.5h-1.5Z" />
        </svg>
      ) : null}
      {holz || cites ? (
        <svg viewBox="0 0 20 16" className={"h-4 w-5 " + (cites ? "text-red-600" : "text-amber-800")} aria-hidden="true">
          {/* liegender Holzstamm mit Jahresringen an der Stirnseite */}
          <rect x="1" y="4" width="13" height="8" rx="1.5" fill="currentColor" opacity="0.35" />
          <path d="M3 6.5h8M4 9.5h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
          <ellipse cx="14.5" cy="8" rx="4" ry="4" fill="currentColor" />
          <ellipse cx="14.5" cy="8" rx="2.6" ry="2.6" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.8" />
          <circle cx="14.5" cy="8" r="1" fill="#fff" opacity="0.8" />
        </svg>
      ) : null}
    </span>
  );
}

/* -------------------------------------------------------------------- slot line */

function SlotLine({
  traeger, traegerId, slot, candidates, row, readOnly,
}: {
  traeger: SpecTraeger;
  traegerId: string;
  slot: { key: string; caption: string; aufpreis: boolean };
  candidates: SlotCandidate[];
  row?: SpecRow;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState(setSlotAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  // Holz-Kennzeichnung sofort beim Auswählen aktualisieren (nicht erst nach dem Speichern)
  const [gewaehlt, setGewaehlt] = useState(row?.artikelId ?? "");
  const cand = candidates.find((c) => c.id === gewaehlt);
  const holz = cand ? cand.holz : gewaehlt && row?.artikelId === gewaehlt ? row.holz : false;
  const cites = cand ? cand.cites : gewaehlt && row?.artikelId === gewaehlt ? row.cites : false;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <input type="hidden" name="traeger" value={traeger} />
      <input type="hidden" name="traegerId" value={traegerId} />
      <input type="hidden" name="slotKey" value={slot.key} />
      <input type="hidden" name="reihenfolge" value={row?.reihenfolge ?? 0} />

      <span className="w-36 shrink-0 text-neutral-500">{slot.caption}</span>
      <HolzMarker holz={holz} cites={cites} />
      <Select
        name="artikelId"
        defaultValue={row?.artikelId ?? ""}
        disabled={readOnly}
        onChange={(e) => { setGewaehlt(e.target.value); submit(); }}
        className="h-8 max-w-md flex-1"
      >
        <option value="">– leer –</option>
        {row && !candidates.some((c) => c.id === row.artikelId) ? (
          <option value={row.artikelId}>{row.artikelName ?? "(aktuell)"} — nicht in Liste</option>
        ) : null}
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.vkEur && Number(c.vkEur) !== 0 ? `  (${c.vkEur} €)` : ""}
          </option>
        ))}
      </Select>
      {slot.aufpreis ? (
        <label className="flex items-center gap-1 text-xs text-neutral-500">
          <input
            type="checkbox"
            name="aufpreis"
            defaultChecked={row?.aufpreis ?? false}
            disabled={readOnly}
            onChange={submit}
          />
          Aufpreis
        </label>
      ) : null}
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}

function AddMultiLine({
  traeger, traegerId, slotKey, candidates,
}: {
  traeger: SpecTraeger;
  traegerId: string;
  slotKey: string;
  candidates: SlotCandidate[];
}) {
  const [state, action] = useActionState(addMultiSlotAction, IDLE);
  return (
    <form action={action} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="traeger" value={traeger} />
      <input type="hidden" name="traegerId" value={traegerId} />
      <input type="hidden" name="slotKey" value={slotKey} />
      <span className="w-36 shrink-0 text-neutral-400">+ hinzufügen</span>
      <Select name="artikelId" defaultValue="" className="h-8 max-w-md flex-1">
        <option value="">– wählen –</option>
        {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <SubmitButton size="sm" variant="outline">Add</SubmitButton>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}

function FreitextLine({
  traeger, traegerId, section, value, readOnly,
}: {
  traeger: SpecTraeger;
  traegerId: string;
  section: SpecSection;
  value: string;
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(setFreitextAction, IDLE);
  // Befüllte Freitexte fallen gelb auf; leere bleiben weiß.
  const [gefuellt, setGefuellt] = useState(() => value.trim().length > 0);
  // Automatisch speichern beim Verlassen des Feldes — nur wenn sich der Text geändert hat.
  const [gespeichert, setGespeichert] = useState(value);
  return (
    <form action={action} className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
      <input type="hidden" name="traeger" value={traeger} />
      <input type="hidden" name="traegerId" value={traegerId} />
      <input type="hidden" name="section" value={section} />
      <label className="text-xs font-medium text-neutral-600">Freitext {SECTION_LABEL[section]}</label>
      <Textarea
        name="text"
        defaultValue={value}
        rows={2}
        disabled={readOnly}
        onInput={(e) => setGefuellt(e.currentTarget.value.trim().length > 0)}
        onBlur={(e) => {
          const text = e.currentTarget.value;
          if (readOnly || text === gespeichert) return;
          setGespeichert(text);
          e.currentTarget.form?.requestSubmit();
        }}
        className={
          gefuellt
            ? "bg-amber-100! border-amber-300! hover:border-amber-400!"
            : "bg-white!"
        }
      />
      {!readOnly && (pending || state) ? (
        <span className={"text-xs " + (pending ? "text-muted" : state?.ok ? "text-green-700" : "text-red-600")}>
          {pending ? "speichert …" : state?.ok ? "✓ gespeichert" : state?.message}
        </span>
      ) : null}
    </form>
  );
}
