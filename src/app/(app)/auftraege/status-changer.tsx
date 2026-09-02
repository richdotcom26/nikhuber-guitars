"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import {
  AUFTRAG_STATUS_LABEL, AUFTRAG_STATUS_TONE, type AuftragStatus,
} from "@/lib/auftrag-shared";
import { IDLE } from "@/lib/domain/action-state";
import { changeStatusAction } from "./actions";

const ALLOWED: Record<AuftragStatus, AuftragStatus[]> = {
  BACKORDER: ["WERKSTATT", "BEI_NICL", "STORNIERT"],
  WERKSTATT: ["BEI_NICL", "PROD_FERTIG", "BACKORDER", "STORNIERT"],
  BEI_NICL: ["WERKSTATT", "PROD_FERTIG", "STORNIERT"],
  PROD_FERTIG: ["WERKSTATT", "ABGESCHLOSSEN", "STORNIERT"],
  SERVICE: ["ABGESCHLOSSEN", "ABGESCHL_OHNE_BEFUND", "STORNIERT"],
  NONE_GUITAR: ["ABGESCHLOSSEN", "STORNIERT"],
  ABGESCHLOSSEN: ["WERKSTATT", "PROD_FERTIG"],
  ABGESCHL_OHNE_BEFUND: ["SERVICE"],
  STORNIERT: ["BACKORDER"],
};

export function StatusChanger({ id, status }: { id: string; status: string }) {
  const [state, action] = useActionState(changeStatusAction, IDLE);
  const ziele = ALLOWED[status as AuftragStatus] ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Status:</span>
        <Badge tone={AUFTRAG_STATUS_TONE[status as AuftragStatus] ?? "neutral"}>
          {AUFTRAG_STATUS_LABEL[status as AuftragStatus] ?? status}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ziele.map((z) => (
          <form key={z} action={action}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ziel" value={z} />
            <SubmitButton size="sm" variant="outline" pendingText="…">→ {AUFTRAG_STATUS_LABEL[z]}</SubmitButton>
          </form>
        ))}
      </div>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </div>
  );
}
