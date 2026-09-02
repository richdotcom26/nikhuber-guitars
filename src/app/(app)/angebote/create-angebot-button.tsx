"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { createAngebotAction } from "./actions";

export function CreateAngebotButton() {
  const [, action] = useActionState(createAngebotAction, IDLE);
  return (
    <form action={action}>
      <SubmitButton pendingText="Anlegen …">Neues Angebot</SubmitButton>
    </form>
  );
}
