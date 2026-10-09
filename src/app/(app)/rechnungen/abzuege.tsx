"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/domain/action-state";
import { formatDate, formatMoney } from "@/lib/utils";
import { anzahlungenUebernehmenAction, entferneAbzugAction } from "./actions";

export interface AbzugRow {
  id: string;
  anzahlungRechnungId: string;
  nummer: string | null;
  datum: string | null;
  status: string;
  zahlungsdatum: string | null;
  netto: string;
  mwst: string;
  brutto: string;
}

/** Abgezogene Anzahlungsrechnungen einer (End-)Rechnung — im Entwurf änderbar. */
export function Abzuege({
  rechnungId, rows, entwurf, cur,
}: {
  rechnungId: string;
  rows: AbzugRow[];
  entwurf: boolean;
  cur: "EUR" | "USD";
}) {
  const [uState, uAction] = useActionState(anzahlungenUebernehmenAction, IDLE);
  const [dState, dAction] = useActionState(entferneAbzugAction, IDLE);
  return (
    <div className="space-y-2 text-sm">
      {rows.length === 0 ? (
        <p className="text-muted">Keine Anzahlungen abgezogen.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-line">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 px-2 py-1.5">
              <Link href={`/rechnungen/${a.anzahlungRechnungId}`} className="font-mono text-blue-700 hover:underline font-semibold text-sm">
                {a.nummer ?? "–"}
              </Link>
              <span className="text-xs text-muted">{formatDate(a.datum)}</span>
              {a.status === "BEZAHLT" || a.zahlungsdatum ? (
                <Badge tone="green">bezahlt</Badge>
              ) : (
                <Badge tone="amber" title="Abgezogen werden sollten nur tatsächlich erhaltene Anzahlungen.">noch nicht bezahlt</Badge>
              )}
              <span className="ml-auto text-right tabular-nums">
                − {formatMoney(a.brutto, cur)}
                <span className="block text-xs text-muted">
                  netto {formatMoney(a.netto, cur)} + MwSt {formatMoney(a.mwst, cur)}
                </span>
              </span>
              {entwurf ? (
                <form action={dAction}>
                  <input type="hidden" name="id" value={rechnungId} />
                  <input type="hidden" name="abzugId" value={a.id} />
                  <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…" title="Abzug entfernen">×</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {entwurf ? (
        <form action={uAction}>
          <input type="hidden" name="id" value={rechnungId} />
          <SubmitButton size="sm" variant="outline" pendingText="…">Anzahlungen des Auftrags übernehmen</SubmitButton>
        </form>
      ) : null}
      {uState ? <FormMessage state={uState} /> : null}
      {dState && !dState.ok ? <FormMessage state={dState} /> : null}
    </div>
  );
}
