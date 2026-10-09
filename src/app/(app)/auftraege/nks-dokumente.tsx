"use client";

import { useActionState, useTransition } from "react";
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
    <div className="space-y-2 rounded-md border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-ink">{titel}</div>
          <div className="text-xs text-muted">{hinweis}</div>
        </div>
        <form action={action}>
          <input type="hidden" name="id" value={auftragId} />
          <input type="hidden" name="art" value={art} />
          <SubmitButton size="sm" variant={dok ? "outline" : "default"} disabled={!aktiv} pendingText="erzeuge …">
            {dok ? "Neu erzeugen" : "Erzeugen"}
          </SubmitButton>
        </form>
      </div>
      {dok ? (
        <button
          type="button"
          onClick={() => oeffnen(dok.id)}
          disabled={pending}
          className="text-left text-sm font-semibold text-blue-700 hover:underline"
        >
          {pending ? "öffne …" : dok.dateiname ?? "Dokument"}
          <span className="ml-2 text-xs font-normal text-muted">{formatDateTime(dok.createdAt)}</span>
        </button>
      ) : (
        <p className="text-xs text-muted">Noch nicht erzeugt.</p>
      )}
      {state ? <FormMessage state={state} /> : null}
    </div>
  );
}
