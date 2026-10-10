"use client";

import { useActionState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { formatDateTime } from "@/lib/utils";
import { anhangUrlAction } from "../_components/anhang-actions";
import { nksDokumentAction } from "./actions";

export interface NksDok {
  id: string;
  dateiname: string | null;
  createdAt: string | Date;
}

/** Ein NKS-Beleg (Lacey Act / CITES): erzeugen + aktuelles Dokument öffnen. */
export function NksDokument({
  auftragId, art, titel, hinweis, aktiv, dok,
}: {
  auftragId: string;
  art: "LACEY" | "CITES";
  titel: string;
  /** Kurzer Hinweis, wann der Beleg gebraucht wird. */
  hinweis: string;
  /** Erzeugen möglich (z. B. CITES nur mit geschütztem Holz). */
  aktiv: boolean;
  dok: NksDok | null;
}) {
  const [state, action] = useActionState(nksDokumentAction, IDLE);
  const [pending, start] = useTransition();
  const oeffnen = (id: string) => start(async () => {
    window.open(await anhangUrlAction(id), "_blank", "noopener");
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titel}</CardTitle>
        <form action={action}>
          <input type="hidden" name="id" value={auftragId} />
          <input type="hidden" name="art" value={art} />
          <SubmitButton size="sm" variant={dok ? "outline" : "default"} disabled={!aktiv} pendingText="erzeuge …">
            {dok ? "Neu erzeugen" : "Erzeugen"}
          </SubmitButton>
        </form>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted">{hinweis}</p>
        <div className="flex items-center justify-between gap-2">
          {dok ? (
            <button
              type="button"
              onClick={() => oeffnen(dok.id)}
              disabled={pending}
              className="min-w-0 truncate text-left font-semibold text-blue-700 hover:underline"
            >
              {pending ? "öffne …" : dok.dateiname ?? "Dokument"}
              <span className="block text-xs font-normal text-muted">{formatDateTime(dok.createdAt)}</span>
            </button>
          ) : <span className="text-muted">Noch nicht erzeugt.</span>}
          {dok ? <Badge tone="green">erzeugt</Badge> : aktiv ? <Badge tone="amber">offen</Badge> : <span className="text-xs text-muted">nicht nötig</span>}
        </div>
        {state ? <FormMessage state={state} /> : null}
      </CardContent>
    </Card>
  );
}
