"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/form";
import { type ActionState, IDLE } from "@/lib/domain/action-state";

type Act = (p: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Angebot/Auftrag: „Archivieren“ (ausblenden) bzw. „Wiederherstellen“ und „Löschen“.
 * Gibt es Gründe gegen das Löschen, ist der Knopf gesperrt (Gründe im Tooltip) — dann archivieren.
 */
export function BelegVerwalten({
  id, nummer, art, archiviert, hindernisse, archivAction, deleteAction,
}: {
  id: string; nummer: string; art: "Angebot" | "Auftrag"; archiviert: boolean;
  hindernisse: string[]; archivAction: Act; deleteAction: Act;
}) {
  const [aState, aAction] = useActionState(archivAction, IDLE);
  const [dState, dAction] = useActionState(deleteAction, IDLE);
  const fehler = (dState && !dState.ok ? dState.message : null) ?? (aState && !aState.ok ? aState.message : null);
  return (
    <div className="flex items-center gap-1">
      <form action={aAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="archiv" value={archiviert ? "0" : "1"} />
        <SubmitButton variant="ghost" pendingText="…" title={archiviert ? "Wieder in der Liste anzeigen" : "In der Liste ausblenden (bleibt erhalten)"}>
          {archiviert ? "Wiederherstellen" : "Archivieren"}
        </SubmitButton>
      </form>
      <form
        action={dAction}
        onSubmit={(e) => {
          if (!confirm(`${art} ${nummer} endgültig löschen? Positionen, Specs und Anhänge werden mit gelöscht.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <SubmitButton
          variant="ghost"
          className="text-red-600"
          pendingText="löscht …"
          disabled={hindernisse.length > 0}
          title={hindernisse.length ? `Löschen nicht möglich:\n${hindernisse.join("\n")}\n\nStattdessen archivieren.` : undefined}
        >
          Löschen
        </SubmitButton>
      </form>
      {fehler ? <span className="text-xs text-red-600">{fehler}</span> : null}
    </div>
  );
}

/** Hinweis bei leer angelegtem Beleg (kein Kunde, keine Positionen): direkt verwerfen? */
export function VerwerfenHinweis({ id, art, deleteAction }: { id: string; art: "Angebot" | "Auftrag"; deleteAction: Act }) {
  const [state, action] = useActionState(deleteAction, IDLE);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
      <input type="hidden" name="id" value={id} />
      <span className="text-amber-900">
        Dieses {art} ist noch leer (kein Kunde, keine Positionen). Versehentlich angelegt?
      </span>
      <SubmitButton size="sm" variant="outline" pendingText="…">{art} verwerfen</SubmitButton>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
