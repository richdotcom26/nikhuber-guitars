"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui/button";
import { IDLE } from "@/lib/domain/action-state";
import { createAuftragAction } from "./actions";

function Btn({ art, variant, children }: { art: string; variant?: "default" | "outline"; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="art" value={art} disabled={pending} className={buttonClasses(variant ?? "default", "md")}>
      {pending ? "…" : children}
    </button>
  );
}

export function CreateAuftragButtons() {
  const [, action] = useActionState(createAuftragAction, IDLE);
  return (
    <form action={action} className="flex items-center gap-2">
      <Btn art="PRODUKTION">Neu: Gitarre</Btn>
      <Btn art="NONE_GUITAR" variant="outline">None-Guitar</Btn>
      <Btn art="SERVICE" variant="outline">Service</Btn>
    </form>
  );
}
