"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { addKommentarAction } from "./actions";

export function KommentarForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addKommentarAction, IDLE);
  const [rueckfrage, setRueckfrage] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Nach erfolgreichem Speichern das Eingabefeld leeren (DOM-Reset, kein React-State).
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="istRueckfrage" value={String(rueckfrage)} />
      <Textarea name="text" rows={3} required
        placeholder={rueckfrage ? "Rückfrage formulieren …" : "Kommentar / Antwort …"} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant={rueckfrage ? "default" : "outline"} disabled={pending}>
          {pending ? "…" : rueckfrage ? "Rückfrage senden" : "Kommentar speichern"}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={rueckfrage} onChange={(e) => setRueckfrage(e.target.checked)} />
          als Rückfrage (Status → Rückfrage, E-Mail an die andere Seite)
        </label>
      </div>
      {state ? <FormMessage state={state} /> : null}
    </form>
  );
}
