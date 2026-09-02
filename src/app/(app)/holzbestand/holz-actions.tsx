"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  HOLZ_STATUS, HOLZ_STATUS_LABEL, HOLZ_STATUS_TONE, type HolzStatus,
} from "@/lib/holz-shared";
import { IDLE } from "@/lib/domain/action-state";
import { auftragSearchAction, type AuftragHit } from "./search-action";
import { deleteHolzAction, reserviereAction, setStatusAction } from "./actions";

export function StatusUndReservierung({
  id,
  status,
  auftrag,
}: {
  id: string;
  status: string;
  auftrag: { id: string; nummer: string } | null;
}) {
  const [stState, stAction] = useActionState(setStatusAction, IDLE);
  const [resState, resAction] = useActionState(reserviereAction, IDLE);

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AuftragHit[]>([]);
  const [picked, setPicked] = useState<AuftragHit | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!q.trim() || picked) return;
    const t = setTimeout(() => startTransition(async () => setHits(await auftragSearchAction(q))), 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Status:</span>
        <Badge tone={HOLZ_STATUS_TONE[status as HolzStatus] ?? "neutral"}>
          {HOLZ_STATUS_LABEL[status as HolzStatus] ?? status}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {HOLZ_STATUS.filter((s) => s.value !== status).map((s) => (
          <form key={s.value} action={stAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={s.value} />
            <SubmitButton size="sm" variant="outline" pendingText="…">→ {s.label}</SubmitButton>
          </form>
        ))}
      </div>
      {stState && !stState.ok ? <FormMessage state={stState} /> : null}

      <div className="border-t border-neutral-100 pt-3">
        <div className="mb-1 text-xs font-medium text-neutral-600">Reservierung für Auftrag</div>
        {auftrag ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono">{auftrag.nummer}</span>
            <form action={resAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="auftragId" value="" />
              <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">aufheben</SubmitButton>
            </form>
          </div>
        ) : (
          <form action={resAction} className="relative flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="auftragId" value={picked?.id ?? ""} />
            <Input
              value={picked ? picked.nummer : q}
              onChange={(e) => { setPicked(null); setQ(e.target.value); }}
              placeholder="Auftrag suchen …"
              className="h-8 w-56"
            />
            {hits.length > 0 && !picked && q.trim() ? (
              <ul className="absolute top-full z-10 mt-1 max-h-56 w-56 overflow-auto rounded-md border border-neutral-200 bg-white text-sm shadow">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => { setPicked(h); setHits([]); }}
                      className="block w-full px-2 py-1 text-left hover:bg-neutral-100">
                      {h.nummer} {h.kd ? <span className="text-xs text-neutral-400">{h.kd}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <SubmitButton size="sm" disabled={!picked} pendingText="…">Reservieren</SubmitButton>
            {pending ? <span className="text-xs text-neutral-400">sucht …</span> : null}
          </form>
        )}
        {resState && !resState.ok ? <FormMessage state={resState} /> : null}
      </div>
    </div>
  );
}

export function DeleteHolzButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [state, action] = useActionState(deleteHolzAction, IDLE);
  if (!confirm) {
    return <Button variant="outline" className="text-red-600" onClick={() => setConfirm(true)}>Löschen</Button>;
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-neutral-600">Wirklich löschen?</span>
      <SubmitButton variant="destructive" size="sm" pendingText="…">Ja</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Abbrechen</Button>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
