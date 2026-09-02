"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { duplicateArtikelAction, toggleInaktivAction } from "./actions";

export function ArtikelActionsBar({
  id,
  isModell,
  inaktiv,
}: {
  id: string;
  isModell: boolean;
  inaktiv: boolean;
}) {
  const [, dupAction] = useActionState(duplicateArtikelAction, IDLE);
  const [, toggleAction] = useActionState(toggleInaktivAction, IDLE);

  return (
    <div className="flex items-center gap-2">
      <form action={dupAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="isModell" value={String(isModell)} />
        <SubmitButton variant="outline" size="sm" pendingText="…">Duplizieren</SubmitButton>
      </form>
      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="inaktiv" value={String(!inaktiv)} />
        <SubmitButton variant="outline" size="sm" pendingText="…">
          {inaktiv ? "Reaktivieren" : "Archivieren"}
        </SubmitButton>
      </form>
    </div>
  );
}
