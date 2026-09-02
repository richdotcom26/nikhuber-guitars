"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Select } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import {
  MAIL_STATUS, MAIL_STATUS_LABEL, MAIL_STATUS_TONE, type MailStatus,
} from "@/lib/mailversand-shared";
import { deleteMailversandAction, setMailStatusAction } from "./actions";

export function MailStatusControl({ id, status }: { id: string; status: MailStatus }) {
  const [state, action] = useActionState(setMailStatusAction, IDLE);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Status:</span>
        <Badge tone={MAIL_STATUS_TONE[status]}>{MAIL_STATUS_LABEL[status]}</Badge>
      </div>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <Select name="status" defaultValue={status} className="h-8 w-44">
          {MAIL_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <SubmitButton size="sm" variant="outline" pendingText="…">Setzen</SubmitButton>
      </form>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </div>
  );
}

export function DeleteMailButton({ id }: { id: string }) {
  const [state, action] = useActionState(deleteMailversandAction, IDLE);
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Eintrag wirklich löschen?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="outline" className="text-red-600" pendingText="…">Löschen</SubmitButton>
      {state && !state.ok ? <FormMessage state={state} className="mt-2" /> : null}
    </form>
  );
}
