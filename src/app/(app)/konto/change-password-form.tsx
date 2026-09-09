"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const err = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="max-w-sm space-y-3">
      {state ? <FormMessage state={state} /> : null}
      <Field label="Aktuelles Passwort" htmlFor="aktuell" errors={err.aktuell}>
        <Input id="aktuell" name="aktuell" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Neues Passwort" htmlFor="neu" errors={err.neu} hint="Mindestens 8 Zeichen">
        <Input id="neu" name="neu" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Neues Passwort wiederholen" htmlFor="wiederholen" errors={err.wiederholen}>
        <Input id="wiederholen" name="wiederholen" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton>Passwort ändern</SubmitButton>
    </form>
  );
}
