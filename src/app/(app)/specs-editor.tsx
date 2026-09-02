"use client";

import { useActionState, useRef } from "react";
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
                  key={slot.key}
                  {...{ traeger, traegerId, slot, candidates: cands, row: slotRows[0], readOnly }}
                />
              );
            })}

            <FreitextLine
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
      <Select
        name="artikelId"
        defaultValue={row?.artikelId ?? ""}
        disabled={readOnly}
        onChange={submit}
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
  const [state, action] = useActionState(setFreitextAction, IDLE);
  return (
    <form action={action} className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
      <input type="hidden" name="traeger" value={traeger} />
      <input type="hidden" name="traegerId" value={traegerId} />
      <input type="hidden" name="section" value={section} />
      <label className="text-xs font-medium text-neutral-600">Freitext {SECTION_LABEL[section]}</label>
      <Textarea name="text" defaultValue={value} rows={2} disabled={readOnly} />
      {!readOnly ? (
        <div className="flex items-center gap-2">
          <SubmitButton size="sm" variant="outline">Freitext speichern</SubmitButton>
          {state ? (
            <span className={"text-xs " + (state.ok ? "text-green-700" : "text-red-600")}>
              {state.ok ? (state.message ?? "Gespeichert.") : state.message}
            </span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
