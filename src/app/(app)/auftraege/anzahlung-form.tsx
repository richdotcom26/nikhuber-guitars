"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { dezimal, formatMoney } from "@/lib/utils";
import { createAnzahlungsrechnungAction } from "./actions";

/** Anzahlungsrechnung anlegen: fester Brutto-Betrag oder Prozent vom Auftrags-Brutto. */
export function AnzahlungForm({
  auftragId, auftragBrutto, waehrung, mwstSatz,
}: {
  auftragId: string;
  auftragBrutto: number | null;
  waehrung: "EUR" | "USD";
  /** 0 bei steuerfreien Kunden (EU/Export). */
  mwstSatz: number;
}) {
  const [state, action] = useActionState(createAnzahlungsrechnungAction, IDLE);
  const [modus, setModus] = useState<"betrag" | "prozent">("betrag");
  const [wert, setWert] = useState("");

  const zahl = Number(dezimal(wert || "0"));
  const brutto = modus === "prozent" ? (auftragBrutto ?? 0) * zahl / 100 : zahl;
  const netto = mwstSatz ? brutto / (1 + mwstSatz / 100) : brutto;

  return (
    <form action={action} className="space-y-2 rounded-md border border-line bg-surface p-3">
      <input type="hidden" name="id" value={auftragId} />
      <input type="hidden" name="modus" value={modus} />
      <div className="text-sm font-medium text-ink">Anzahlungsrechnung erstellen</div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={modus === "betrag"} onChange={() => setModus("betrag")} /> Betrag (brutto)
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={modus === "prozent"}
            onChange={() => setModus("prozent")}
            disabled={!auftragBrutto}
          />
          % vom Auftrag{auftragBrutto ? ` (${formatMoney(auftragBrutto, waehrung)})` : " (keine Summe)"}
        </label>
        <Input
          name="wert"
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          inputMode="decimal"
          placeholder={modus === "prozent" ? "z. B. 30" : "z. B. 5.000,00"}
          className="h-8 w-32 text-right"
        />
        <span className="text-xs text-muted">{modus === "prozent" ? "%" : waehrung === "USD" ? "$" : "€"}</span>
        <SubmitButton size="sm" pendingText="…" disabled={!(brutto > 0)}>Entwurf anlegen</SubmitButton>
      </div>
      {brutto > 0 ? (
        <p className="text-xs text-muted">
          Anzahlung <b className="text-ink">{formatMoney(brutto, waehrung)}</b> brutto
          {mwstSatz ? <> = {formatMoney(netto, waehrung)} netto + {formatMoney(brutto - netto, waehrung)} MwSt ({mwstSatz} %)</> : " (steuerfrei)"}
        </p>
      ) : null}
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}
