"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type ActionState, IDLE } from "@/lib/domain/action-state";
import { formatMoney } from "@/lib/utils";
import { type ArtikelHit, searchArtikelAction } from "./artikel-search-action";

export interface PositionRow {
  id: string;
  posNr: number | null;
  artikelName: string | null;
  artikelBeschreibung: string | null;
  anzahl: string;
  einzelpreis: string | null;
  rabattProzent: string;
  gesamtpreis: string | null;
  reRelevant: boolean;
  herkunftSlotKey: string | null;
}

export interface Summen {
  summePositionen: string | null;
  summeNetto: string | null;
  summeMwst: string | null;
  summeBrutto: string | null;
}

type Act = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export interface PositionenActions {
  generate: Act;
  deleteAll: Act;
  add: Act;
  update: Act;
  remove: Act;
}

export function PositionenPanel({
  belegId,
  rows,
  summen,
  waehrung,
  vertriebsweg,
  canGenerate,
  actions,
  gesamtrabatt,
}: {
  belegId: string;
  rows: PositionRow[];
  summen: Summen;
  waehrung: string | null;
  vertriebsweg: string | null;
  canGenerate: boolean;
  actions: PositionenActions;
  gesamtrabatt?: {
    aktiv: boolean;
    prozent: string | null;
    wert: string | null;
    action: Act;
  };
}) {
  const cur = waehrung === "USD" ? "USD" : "EUR";
  const [onlyRelevant, setOnlyRelevant] = useState(false);
  const shown = onlyRelevant ? rows.filter((r) => r.reRelevant) : rows;

  const [genState, genAction] = useActionState(actions.generate, IDLE);
  const [delAllState, delAllAction] = useActionState(actions.deleteAll, IDLE);
  const [grState, grAction] = useActionState(gesamtrabatt?.action ?? actions.update, IDLE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positionen ({rows.length})</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-neutral-500">
            <input type="checkbox" checked={onlyRelevant} onChange={(e) => setOnlyRelevant(e.target.checked)} />
            nur relevante
          </label>
          <form action={genAction}>
            <input type="hidden" name="id" value={belegId} />
            <SubmitButton size="sm" variant="outline" disabled={!canGenerate} pendingText="…">
              Aus Specs generieren
            </SubmitButton>
          </form>
          <form action={delAllAction}>
            <input type="hidden" name="id" value={belegId} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Alle löschen</SubmitButton>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {genState ? <FormMessage state={genState} /> : null}
        {delAllState && !delAllState.ok ? <FormMessage state={delAllState} /> : null}

        <Table>
          <THead>
            <TR>
              <TH className="w-10">Pos</TH>
              <TH>Artikel</TH>
              <TH className="w-20 text-right">Anzahl</TH>
              <TH className="w-28 text-right">Einzelpreis</TH>
              <TH className="w-20 text-right">Rabatt %</TH>
              <TH className="w-28 text-right">Gesamt</TH>
              <TH className="w-14">rel.</TH>
              <TH className="w-24 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {shown.map((r) => (
              <PosRow
                key={`${r.id}:${r.anzahl}:${r.einzelpreis}:${r.rabattProzent}:${r.reRelevant}`}
                belegId={belegId} row={r} cur={cur} updateAct={actions.update} removeAct={actions.remove}
              />
            ))}
            {shown.length === 0 ? (
              <TR><TD colSpan={8} className="py-4 text-center text-neutral-400">Keine Positionen.</TD></TR>
            ) : null}
          </TBody>
        </Table>

        <NewPosition belegId={belegId} waehrung={waehrung} vertriebsweg={vertriebsweg} addAct={actions.add} />

        {gesamtrabatt ? (
          <form action={grAction} className="ml-auto flex max-w-sm items-end gap-2">
            <input type="hidden" name="id" value={belegId} />
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              <input type="checkbox" name="aktiv" defaultChecked={gesamtrabatt.aktiv} />
              Gesamtrabatt
            </label>
            <Input name="prozent" defaultValue={gesamtrabatt.prozent ?? ""} inputMode="decimal"
              placeholder="%" className="h-7 w-20 text-right" />
            <span className="text-xs text-neutral-400">= {formatMoney(gesamtrabatt.wert, cur)}</span>
            <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
            {grState && !grState.ok ? <span className="text-xs text-red-600">{grState.message}</span> : null}
          </form>
        ) : null}

        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-neutral-500">Summe Positionen</dt>
          <dd className="text-right tabular-nums">{formatMoney(summen.summePositionen, cur)}</dd>
          <dt className="text-neutral-500">Summe netto</dt>
          <dd className="text-right tabular-nums">{formatMoney(summen.summeNetto, cur)}</dd>
          <dt className="text-neutral-500">Summe MwSt</dt>
          <dd className="text-right tabular-nums">{formatMoney(summen.summeMwst, cur)}</dd>
          <dt className="font-semibold text-neutral-700">Summe brutto</dt>
          <dd className="text-right font-semibold tabular-nums">{formatMoney(summen.summeBrutto, cur)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

function PosRow({
  belegId, row, cur, updateAct, removeAct,
}: {
  belegId: string;
  row: PositionRow;
  cur: "EUR" | "USD";
  updateAct: Act;
  removeAct: Act;
}) {
  const [state, action] = useActionState(updateAct, IDLE);
  const [delState, delAction] = useActionState(removeAct, IDLE);

  return (
    <TR className={row.reRelevant ? "" : "opacity-60"}>
      <TD className="tabular-nums text-neutral-500">{row.posNr ?? "–"}</TD>
      <TD>
        <div className="font-medium">{row.artikelName ?? "–"}</div>
        {row.artikelBeschreibung ? (
          <div className="text-xs text-neutral-400">{row.artikelBeschreibung}</div>
        ) : null}
      </TD>
      <TD colSpan={5}>
        <form action={action} className="flex items-center justify-end gap-1.5">
          <input type="hidden" name="id" value={belegId} />
          <input type="hidden" name="posId" value={row.id} />
          <Input name="anzahl" defaultValue={row.anzahl} inputMode="decimal" className="h-7 w-16 text-right" />
          <Input name="einzelpreis" defaultValue={row.einzelpreis ?? ""} inputMode="decimal" className="h-7 w-24 text-right" />
          <Input name="rabattProzent" defaultValue={row.rabattProzent} inputMode="decimal" className="h-7 w-16 text-right" />
          <span className="w-24 text-right tabular-nums">{formatMoney(row.gesamtpreis, cur)}</span>
          <label className="flex items-center"><input type="checkbox" name="reRelevant" defaultChecked={row.reRelevant} /></label>
          <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
        </form>
        {state && !state.ok ? <p className="text-right text-xs text-red-600">{state.message}</p> : null}
      </TD>
      <TD className="text-right">
        <form action={delAction}>
          <input type="hidden" name="id" value={belegId} />
          <input type="hidden" name="posId" value={row.id} />
          <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">×</SubmitButton>
        </form>
        {delState && !delState.ok ? <p className="text-xs text-red-600">{delState.message}</p> : null}
      </TD>
    </TR>
  );
}

function NewPosition({
  belegId, waehrung, vertriebsweg, addAct,
}: {
  belegId: string;
  waehrung: string | null;
  vertriebsweg: string | null;
  addAct: Act;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ArtikelHit[]>([]);
  const [picked, setPicked] = useState<ArtikelHit | null>(null);
  const [pending, startTransition] = useTransition();
  const [addState, addAction] = useActionState(addAct, IDLE);

  useEffect(() => {
    if (!q.trim() || picked) return;
    const t = setTimeout(() => {
      startTransition(async () => setHits(await searchArtikelAction(q)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  const showHits = hits.length > 0 && !picked && !!q.trim();

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="mb-2 text-xs font-medium text-neutral-600">Neue Position</div>
      <form action={addAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={belegId} />
        <input type="hidden" name="artikelId" value={picked?.id ?? ""} />
        <input type="hidden" name="waehrung" value={waehrung ?? ""} />
        <input type="hidden" name="vertriebsweg" value={vertriebsweg ?? ""} />

        <div className="relative flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Artikel suchen</label>
          <Input
            value={picked ? picked.name : q}
            onChange={(e) => { setPicked(null); setQ(e.target.value); }}
            placeholder="Name / Nr"
            className="h-8 w-72"
          />
          {showHits ? (
            <ul className="absolute top-full z-10 mt-1 max-h-64 w-72 overflow-auto rounded-md border border-neutral-200 bg-white text-sm shadow">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => { setPicked(h); setHits([]); }}
                    className="block w-full px-2 py-1 text-left hover:bg-neutral-100"
                  >
                    {h.name}{h.artikelNr ? ` · ${h.artikelNr}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {pending ? <span className="text-xs text-neutral-400">sucht …</span> : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">oder Freitext</label>
          <Input name="freitext" placeholder="Freitext-Position" className="h-8 w-52" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Anzahl</label>
          <Input name="anzahl" defaultValue="1" inputMode="decimal" className="h-8 w-16 text-right" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Einzelpreis</label>
          <Input name="einzelpreis" placeholder="autom." inputMode="decimal" className="h-8 w-24 text-right" />
        </div>
        <SubmitButton size="sm">Hinzufügen</SubmitButton>
        {picked ? <Button size="sm" variant="ghost" onClick={() => { setPicked(null); setQ(""); }}>×</Button> : null}
      </form>
      {addState && !addState.ok ? <FormMessage state={addState} className="mt-2" /> : null}
    </div>
  );
}
