"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { formatDate } from "@/lib/utils";
import { loescheSerAction, vergebeSerAutoAction, vergebeSerManuellAction } from "./actions";

export interface SnValue {
  anzeige: string | null;
  lfd: number;
  manuell: boolean;
  vergebenAm: string | null;
}

export function SeriennummerPanel({
  auftragId,
  serial,
  bauplandatum,
  auftragsart,
}: {
  auftragId: string;
  serial: SnValue | null;
  bauplandatum: string | null;
  auftragsart: string;
}) {
  const [autoState, autoAction] = useActionState(vergebeSerAutoAction, IDLE);
  const [manState, manAction] = useActionState(vergebeSerManuellAction, IDLE);
  const [delState, delAction] = useActionState(loescheSerAction, IDLE);
  const [manuellOpen, setManuellOpen] = useState(false);

  if (serial) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-semibold">{serial.anzeige}</span>
          {serial.manuell ? <Badge tone="amber">manuell</Badge> : <Badge tone="neutral">auto</Badge>}
        </div>
        <div className="text-neutral-500">lfd {serial.lfd} · vergeben {formatDate(serial.vergebenAm)}</div>
        <form action={delAction}>
          <input type="hidden" name="id" value={auftragId} />
          <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">
            Seriennummer entfernen
          </SubmitButton>
        </form>
        {delState && !delState.ok ? <FormMessage state={delState} /> : null}
      </div>
    );
  }

  if (auftragsart !== "PRODUKTION") {
    return <p className="text-sm text-neutral-400">Seriennummern nur für Produktionsaufträge.</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <form action={autoAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={auftragId} />
        <SubmitButton size="sm" disabled={!bauplandatum} pendingText="…">
          Seriennummer automatisch vergeben
        </SubmitButton>
        {!bauplandatum ? (
          <span className="text-xs text-neutral-400">Bauplandatum setzen (Jahrpräfix)</span>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setManuellOpen((o) => !o)}>
          {manuellOpen ? "abbrechen" : "manuell …"}
        </Button>
      </form>
      {autoState && !autoState.ok ? <FormMessage state={autoState} /> : null}

      {manuellOpen ? (
        <form action={manAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={auftragId} />
          <Input name="eingabe" placeholder="z. B. 26 5404" className="h-8 w-40 font-mono" />
          <SubmitButton size="sm" variant="outline" pendingText="…">Speichern</SubmitButton>
          {manState && !manState.ok ? <FormMessage state={manState} className="w-full" /> : null}
        </form>
      ) : null}
    </div>
  );
}
