"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ANGEBOT_STATUS } from "@/lib/angebot-shared";
import { IDLE } from "@/lib/domain/action-state";
import { saveKopfAction } from "./actions";

export function KopfForm({
  id,
  status,
  angebotsdatum,
  kopftext,
}: {
  id: string;
  status: string;
  angebotsdatum: string | null;
  kopftext: string | null;
}) {
  const [state, action] = useActionState(saveKopfAction, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state ? <FormMessage state={state} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status}>
            {ANGEBOT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Angebotsdatum" htmlFor="angebotsdatum">
          <Input id="angebotsdatum" name="angebotsdatum" type="date" defaultValue={angebotsdatum ?? ""} />
        </Field>
      </div>
      <Field label="Angebotstext / persönliches Anschreiben" htmlFor="kopftext">
        <Textarea id="kopftext" name="kopftext" defaultValue={kopftext ?? ""} rows={5} />
      </Field>
      <SubmitButton>Kopf speichern</SubmitButton>
    </form>
  );
}
