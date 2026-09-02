"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MAIL_ART } from "@/lib/mailversand-shared";
import { IDLE } from "@/lib/domain/action-state";
import { createMailversandAction } from "../actions";

export function MailForm() {
  const [state, action] = useActionState(createMailversandAction, IDLE);
  const err = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="max-w-2xl space-y-5">
      {state ? <FormMessage state={state} /> : null}
      <Card>
        <CardHeader><CardTitle>Eintrag</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Art" htmlFor="art" errors={err.art}>
            <Select id="art" name="art" defaultValue="TELEFONAT">
              {MAIL_ART.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="An" htmlFor="an">
            <Input id="an" name="an" placeholder="E-Mail / Telefon / Name" />
          </Field>
          <Field label="CC" htmlFor="cc"><Input id="cc" name="cc" /></Field>
          <Field label="Betreff" htmlFor="betreff" className="sm:col-span-2">
            <Input id="betreff" name="betreff" />
          </Field>
          <Field label="Inhalt / Notiz" htmlFor="bodyHtml" className="sm:col-span-2">
            <Textarea id="bodyHtml" name="bodyHtml" rows={6} />
          </Field>
        </CardContent>
      </Card>
      <SubmitButton>Anlegen</SubmitButton>
    </form>
  );
}
