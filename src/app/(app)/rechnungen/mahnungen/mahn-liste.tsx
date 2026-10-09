"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/form";
import { formatDate, formatMoney } from "@/lib/utils";
import { IDLE } from "@/lib/domain/action-state";
import { type MahnState, sendeMahnungenAction } from "./actions";

interface Row {
  id: string;
  nummer: string | null;
  rechnungsdatum: string | null;
  tage: number;
  betrag: string | null;
  netto: string | null;
  waehrung: string | null;
  kunde: string;
  email: string | null;
  pdf: boolean;
  letzteStufe: number;
  letzteAm: string | null;
  naechsteStufe: number | null;
  faellig: boolean;
  gebuehr: number | null;
}

const STUFE = ["–", "1. Erinnerung", "2. Erinnerung", "Letzte Mahnung"];

export function MahnListe({ rows }: { rows: Row[] }) {
  const [state, action] = useActionState<MahnState, FormData>(sendeMahnungenAction, IDLE as MahnState);
  const waehlbar = rows.filter((r) => r.naechsteStufe && r.email);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const alleGewaehlt = waehlbar.length > 0 && waehlbar.every((r) => sel.has(r.id));
  const toggle = (id: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (sel.size === 0 || !confirm(`${sel.size} Mahnung(en) jetzt per E-Mail senden?`)) e.preventDefault();
      }}
      className="space-y-3"
    >
      {[...sel].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-card-head text-left text-[11px] font-semibold uppercase tracking-wide text-navy">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={alleGewaehlt}
                  onChange={() => setSel(alleGewaehlt ? new Set() : new Set(waehlbar.map((r) => r.id)))}
                  title="alle auswählen"
                />
              </th>
              <th className="px-3 py-2">RG-Nr</th>
              <th className="px-3 py-2">RG-Datum</th>
              <th className="px-3 py-2 text-right">Tage</th>
              <th className="px-3 py-2">Kunde</th>
              <th className="px-3 py-2 text-right">Netto</th>
              <th className="px-3 py-2">Bisher</th>
              <th className="px-3 py-2">Nächste Stufe</th>
              <th className="px-3 py-2 text-right">Gebühr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted">Keine fälligen Rechnungen.</td></tr>
            ) : rows.map((r) => {
              const wg = r.waehrung === "USD" ? "USD" : "EUR";
              const kann = !!(r.naechsteStufe && r.email);
              return (
                <tr key={r.id} className={sel.has(r.id) ? "bg-brand-soft" : ""}>
                  <td className="px-3 py-1.5">
                    <input type="checkbox" disabled={!kann} checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                  <td className="px-3 py-1.5 font-mono">
                    <Link href={`/rechnungen/${r.id}`} className="hover:underline">{r.nummer}</Link>
                    {!r.pdf ? <span className="ml-1 text-xs text-amber-600" title="kein archiviertes PDF (Altbestand)">ohne PDF</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-muted">{formatDate(r.rechnungsdatum)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.tage}</td>
                  <td className="px-3 py-1.5">
                    {r.kunde}
                    {!r.email ? <span className="ml-1 text-xs text-red-600">keine E-Mail</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(r.netto, wg)}</td>
                  <td className="px-3 py-1.5 text-muted">
                    {r.letzteStufe ? `${STUFE[r.letzteStufe]} (${formatDate(r.letzteAm)})` : "–"}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.naechsteStufe ? (
                      <Badge tone={r.naechsteStufe === 3 ? "red" : r.faellig ? "amber" : "neutral"}>{STUFE[r.naechsteStufe]}</Badge>
                    ) : <span className="text-muted">ausgeschöpft</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.gebuehr != null ? formatMoney(r.gebuehr, wg) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton disabled={sel.size === 0} pendingText="sendet …">
          {sel.size ? `${sel.size} Mahnung(en) senden` : "Mahnungen senden"}
        </SubmitButton>
        {state?.message ? (
          <span className={"text-sm " + (state.ok ? "text-green-700" : "text-red-600")}>{state.message}</span>
        ) : null}
      </div>
      {state?.ergebnis?.length ? (
        <ul className="space-y-0.5 text-sm">
          {state.ergebnis.map((e, i) => (
            <li key={i} className={e.ok ? "text-green-700" : "text-red-600"}>
              {e.ok ? "✓" : "✗"} {e.nummer}: {e.info}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
