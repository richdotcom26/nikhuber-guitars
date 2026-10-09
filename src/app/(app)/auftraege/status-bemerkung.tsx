"use client";

import { useActionState, useState } from "react";
import { Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { statusBemerkungAction } from "./actions";

/** Bemerkung im Status-Block — wie Freitext Body: speichert beim Verlassen, gelb wenn befüllt. */
export function StatusBemerkung({ id, value }: { id: string; value: string }) {
  const [state, action, pending] = useActionState(statusBemerkungAction, IDLE);
  const [gefuellt, setGefuellt] = useState(() => value.trim().length > 0);
  const [gespeichert, setGespeichert] = useState(value);
  return (
    <form action={action} className="mt-3 space-y-1 border-t border-neutral-100 pt-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs font-medium text-neutral-600">Bemerkung</label>
      <Textarea
        name="text"
        defaultValue={value}
        rows={2}
        onInput={(e) => setGefuellt(e.currentTarget.value.trim().length > 0)}
        onBlur={(e) => {
          const text = e.currentTarget.value;
          if (text === gespeichert) return;
          setGespeichert(text);
          e.currentTarget.form?.requestSubmit();
        }}
        className={gefuellt ? "bg-amber-100! border-amber-300! hover:border-amber-400!" : "bg-white!"}
      />
      {pending || state ? (
        <span className={"text-xs " + (pending ? "text-muted" : state?.ok ? "text-green-700" : "text-red-600")}>
          {pending ? "speichert …" : state?.ok ? "✓ gespeichert" : state?.message}
        </span>
      ) : null}
    </form>
  );
}
