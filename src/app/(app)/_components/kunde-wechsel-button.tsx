"use client";

import { useActionState, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";
import { type ActionState, IDLE } from "@/lib/domain/action-state";

export interface KundeMerkmale {
  name: string;
  region: string | null;
  waehrung: string | null;
  vertriebsweg: string | null;
  sprache: string | null;
}

/**
 * Kunde übernehmen (Auftrag/Angebot). Ist schon ein Kunde eingetragen:
 * 1. Rückfrage „wirklich wechseln?“ (ändert noch nichts),
 * 2. gibt es Positionen: Dialog mit den Merkmalen alt/neu → Ja (Kunde + Preise) / Nein (nur Kunde) / Abbrechen (nichts).
 */
export function KundeWechselButton({
  action: serverAction, belegId, kundeId, neu, alt, positionen,
}: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>;
  belegId: string;
  kundeId: string;
  neu: KundeMerkmale;
  alt: KundeMerkmale | null;
  positionen: number;
}) {
  const [state, action] = useActionState(serverAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const neuPreise = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState(false);
  const freigabe = useRef(false);

  function absenden(preise: boolean) {
    if (neuPreise.current) neuPreise.current.value = preise ? "1" : "";
    setDialog(false);
    freigabe.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className="inline"
        onSubmit={(e) => {
          if (!alt) return;
          if (freigabe.current) { freigabe.current = false; return; } // nach Rückfragen freigegeben
          e.preventDefault();
          if (!confirm(`Kunde wirklich wechseln?\n\nBisher: ${alt.name}\nNeu: ${neu.name}`)) return;
          if (positionen > 0) setDialog(true);
          else absenden(false);
        }}
      >
        <input type="hidden" name="id" value={belegId} />
        <input type="hidden" name="kundeId" value={kundeId} />
        <input type="hidden" name="neuPreise" ref={neuPreise} defaultValue="" />
        <SubmitButton size="sm" variant="outline" pendingText="…">Übernehmen</SubmitButton>
        {state && !state.ok ? <span className="ml-2 text-xs text-red-600">{state.message}</span> : null}
      </form>

      {dialog && alt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setDialog(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-navy">Preise anpassen?</h2>
            <p className="mt-1 text-sm text-muted">
              {positionen} Position(en) – sollen die Preise nach Währung / Preisstaffel des neuen Kunden neu berechnet werden?
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <Zeile label="Bisher" k={alt} />
              <Zeile label="Neu" k={neu} />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" onClick={() => absenden(true)}>Ja – Kunde + Preise</Button>
              <Button type="button" variant="outline" onClick={() => absenden(false)}>Nein – nur Kunde</Button>
              <Button type="button" variant="ghost" onClick={() => setDialog(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Zeile({ label, k }: { label: string; k: KundeMerkmale }) {
  return (
    <div className="rounded-lg border border-line p-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{k.name}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {[k.region, k.waehrung, k.vertriebsweg, k.sprache].map((v, i) =>
          <Badge key={i}>{v ?? "–"}</Badge>)}
      </div>
    </div>
  );
}
