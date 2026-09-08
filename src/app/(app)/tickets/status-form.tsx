"use client";

import { useActionState, useRef } from "react";
import { Select } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { TICKET_STATUS } from "@/lib/ticket-shared";
import { setTicketStatusAction } from "./actions";

export function StatusForm({ id, status }: { id: string; status: string }) {
  const [state, action] = useActionState(setTicketStatusAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs font-medium text-muted">Status</label>
      <Select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 w-44"
      >
        {TICKET_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
