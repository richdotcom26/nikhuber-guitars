"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { setBandAction, setBauplanMonatAction } from "./actions";

/** „Monat ändern": Zielmonat (YYYY-MM) eingeben oder leeren = aus Planung nehmen. */
export function MoveMonat({ id, monat }: { id: string; monat: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(setBauplanMonatAction, IDLE);
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Monat …</Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <Input name="monat" type="month" defaultValue={monat} className="h-7 w-36" />
      <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}

/** Ungeplanten Auftrag diesem Monat zuweisen. */
export function AssignMonat({ id, monat }: { id: string; monat: string }) {
  const [state, action] = useActionState(setBauplanMonatAction, IDLE);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="monat" value={monat} />
      <SubmitButton size="sm" variant="outline" pendingText="…">→ einplanen</SubmitButton>
      {state && !state.ok ? <span className="ml-1 text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}

/** Kapazitätsband (min/max je Monat) inline pflegen. */
export function BandEditor({
  id, min, max,
}: {
  id: string;
  min: number | null;
  max: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(setBandAction, IDLE);

  if (!editing) {
    return (
      <button type="button" className="hover:underline" onClick={() => setEditing(true)}>
        {min ?? "–"} … {max ?? "–"}
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <Input name="min" inputMode="numeric" defaultValue={min ?? ""} placeholder="min" className="h-7 w-14" />
      <Input name="max" inputMode="numeric" defaultValue={max ?? ""} placeholder="max" className="h-7 w-14" />
      <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>×</Button>
      {state ? <FormMessage state={state && !state.ok ? state : null} /> : null}
    </form>
  );
}
