"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { kundeKurz } from "@/lib/adressen-shared";
import { IDLE } from "@/lib/domain/action-state";
import {
  type AuftragHit, neueSnAutoAction, neueSnManuellAction, searchAuftragOhneSnAction,
} from "./actions";

function auftragLabel(h: AuftragHit) {
  return `${h.nummer} · ${kundeKurz(h)}`;
}

export function NeueSnPanel({ naechste }: { naechste: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? "Abbrechen" : "Neue Seriennummer vergeben"}
      </Button>
      {open ? (
        <Card className="mt-3 w-[22rem] max-w-full">
          <CardHeader>
            <CardTitle>Neue Seriennummer vergeben</CardTitle>
          </CardHeader>
          <CardContent>
            <Picker naechste={naechste} onDone={() => setOpen(false)} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Picker({ naechste, onDone }: { naechste: number; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AuftragHit[]>([]);
  const [picked, setPicked] = useState<AuftragHit | null>(null);
  const [pending, startTransition] = useTransition();
  const [manuellOpen, setManuellOpen] = useState(false);

  const [autoState, autoAction] = useActionState(neueSnAutoAction, IDLE);
  const [manState, manAction] = useActionState(neueSnManuellAction, IDLE);

  useEffect(() => {
    if (!q.trim() || picked) return;
    const t = setTimeout(() => {
      startTransition(async () => setHits(await searchAuftragOhneSnAction(q)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  useEffect(() => {
    if (autoState?.ok || manState?.ok) onDone();
  }, [autoState, manState, onDone]);

  const showHits = hits.length > 0 && !picked && !!q.trim();

  return (
    <div className="space-y-3 text-sm">
      <div className="relative flex flex-col gap-1">
        <label className="text-xs text-muted">Produktionsauftrag ohne Seriennummer</label>
        <Input
          value={picked ? auftragLabel(picked) : q}
          onChange={(e) => { setPicked(null); setQ(e.target.value); }}
          placeholder="Auftragsnr / Kunde"
          className="h-8 w-full"
        />
        {showHits ? (
          <ul className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white text-sm shadow-lg">
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => { setPicked(h); setHits([]); }}
                  className="block w-full px-2 py-1 text-left hover:bg-brand-soft"
                >
                  {auftragLabel(h)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {pending ? <span className="text-xs text-neutral-400">sucht …</span> : null}
      </div>

      {picked ? (
        <div className="space-y-3 rounded-md border border-line bg-neutral-50 p-3">
          <div className="font-mono text-xs text-muted">{auftragLabel(picked)}</div>

          <form action={autoAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={picked.id} />
            <SubmitButton size="sm" pendingText="…">
              Automatisch vergeben (nächste: {naechste})
            </SubmitButton>
            <Button size="sm" variant="ghost" onClick={() => setManuellOpen((o) => !o)}>
              {manuellOpen ? "abbrechen" : "manuell …"}
            </Button>
          </form>
          {autoState && !autoState.ok ? <FormMessage state={autoState} /> : null}

          {manuellOpen ? (
            <form action={manAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={picked.id} />
              <Input name="eingabe" placeholder="z. B. 26 5404" className="h-8 w-40 font-mono" />
              <SubmitButton size="sm" variant="outline" pendingText="…">Speichern</SubmitButton>
              {manState && !manState.ok ? <FormMessage state={manState} className="w-full" /> : null}
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
