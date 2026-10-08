"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { type ActionState, IDLE } from "@/lib/domain/action-state";
import { formatBetrag, formatMoney } from "@/lib/utils";
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
  /** z. B. „berechnet: 1 von 1" (Auftrag). */
  hinweis?: string | null;
}

export interface Summen {
  summePositionen: string | null;
  summeNetto: string | null;
  summeMwst: string | null;
  summeBrutto: string | null;
  gesamtrabattAktiv?: boolean;
  gesamtrabattProzent?: string | null;
  gesamtrabattWert?: string | null;
  versandkosten?: string | null;
  versandBezeichnung?: string | null;
}

type Act = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const NOOP: Act = async () => IDLE;

export interface PositionenActions {
  /** Fehlt bei Rechnungen ohne Auftrag → kein Button. */
  generate?: Act;
  deleteAll: Act;
  add: Act;
  update: Act;
  remove: Act;
  /** „Porto nach Staat" (nur Angebot/Auftrag). */
  porto?: Act;
  /** Versandkosten setzen/entfernen (Summenblock). */
  versand?: Act;
}

export function PositionenPanel({
  belegId,
  rows,
  summen,
  waehrung,
  vertriebsweg,
  canGenerate,
  generateLabel = "Aus Specs generieren",
  generateConfirm,
  actions,
  gesamtrabatt,
}: {
  belegId: string;
  rows: PositionRow[];
  summen: Summen;
  waehrung: string | null;
  vertriebsweg: string | null;
  canGenerate: boolean;
  /** Beschriftung des Generieren-Buttons (Rechnung: „Aus Auftrag neu einlesen"). */
  generateLabel?: string;
  /** Sicherheitsabfrage vor dem Generieren. */
  generateConfirm?: string;
  actions: PositionenActions;
  gesamtrabatt?: {
    aktiv: boolean;
    prozent: string | null;
    wert: string | null;
    action: Act;
  };
}) {
  const cur = waehrung === "USD" ? "USD" : "EUR";
  const [onlyRelevant, setOnlyRelevant] = useState(true);
  const shown = onlyRelevant ? rows.filter((r) => r.reRelevant) : rows;

  const [genState, genAction] = useActionState(actions.generate ?? NOOP, IDLE);
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
          {actions.generate ? (
            <form
              action={genAction}
              onSubmit={(e) => { if (generateConfirm && !confirm(generateConfirm)) e.preventDefault(); }}
            >
              <input type="hidden" name="id" value={belegId} />
              <SubmitButton size="sm" variant="outline" disabled={!canGenerate} pendingText="…">
                {generateLabel}
              </SubmitButton>
            </form>
          ) : null}
          <form
            action={delAllAction}
            onSubmit={(e) => { if (!confirm("Wirklich alle Positionen löschen?")) e.preventDefault(); }}
          >
            <input type="hidden" name="id" value={belegId} />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">Alle löschen</SubmitButton>
          </form>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {genState ? <FormMessage state={genState} /> : null}
        {delAllState ? <FormMessage state={delAllState} /> : null}

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

        {/* Summenblock: Positionen − Gesamtrabatt + Versand = netto. Versand ist nie rabattiert. */}
        <div className="ml-auto w-full max-w-xl space-y-1.5 rounded-lg border border-line bg-surface p-3 text-sm">
          <SumZeile label="Summe Positionen" wert={formatMoney(summen.summePositionen, cur)} />

          {gesamtrabatt ? (
            <form action={grAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={belegId} />
              <label className="flex items-center gap-1 text-neutral-500">
                <input type="checkbox" name="aktiv" defaultChecked={gesamtrabatt.aktiv} />
                Gesamtrabatt
              </label>
              <Input name="prozent" defaultValue={gesamtrabatt.prozent ?? ""} inputMode="decimal"
                placeholder="%" className="h-7 w-16 text-right" />
              <span className="text-xs text-muted">%</span>
              <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
              <span className="ml-auto tabular-nums">
                {gesamtrabatt.aktiv && Number(gesamtrabatt.wert) ? `− ${formatMoney(gesamtrabatt.wert, cur)}` : "–"}
              </span>
              {grState && !grState.ok ? <span className="w-full text-xs text-red-600">{grState.message}</span> : null}
            </form>
          ) : summen.gesamtrabattAktiv && Number(summen.gesamtrabattWert) ? (
            <SumZeile
              label={`Gesamtrabatt (${Number(summen.gesamtrabattProzent)} %)`}
              wert={`− ${formatMoney(summen.gesamtrabattWert, cur)}`}
            />
          ) : null}

          {actions.versand ? (
            <VersandZeile
              belegId={belegId}
              cur={cur}
              betrag={summen.versandkosten ?? null}
              bezeichnung={summen.versandBezeichnung ?? null}
              act={actions.versand}
              porto={actions.porto}
            />
          ) : Number(summen.versandkosten) ? (
            <SumZeile
              label={`Versandkosten${summen.versandBezeichnung ? ` (${summen.versandBezeichnung})` : ""}`}
              wert={formatMoney(summen.versandkosten, cur)}
            />
          ) : null}

          <div className="border-t border-line pt-1.5">
            <SumZeile label="Summe netto" wert={formatMoney(summen.summeNetto, cur)} />
            <SumZeile label="Summe MwSt" wert={formatMoney(summen.summeMwst, cur)} />
            <SumZeile label="Summe brutto" wert={formatMoney(summen.summeBrutto, cur)} stark />
          </div>
        </div>
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
        {row.hinweis ? <div className="text-xs font-medium text-green-700">{row.hinweis}</div> : null}
      </TD>
      <TD colSpan={5}>
        <form action={action} className="flex items-center justify-end gap-1.5">
          <input type="hidden" name="id" value={belegId} />
          <input type="hidden" name="posId" value={row.id} />
          <Input name="anzahl" defaultValue={row.anzahl} inputMode="decimal" className="h-7 w-16 text-right" />
          <Input name="einzelpreis" defaultValue={formatBetrag(row.einzelpreis)} inputMode="decimal" className="h-7 w-24 text-right" />
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

function SumZeile({ label, wert, stark = false }: { label: string; wert: string; stark?: boolean }) {
  return (
    <div className={"flex justify-between gap-4 " + (stark ? "font-semibold text-ink" : "")}>
      <span className={stark ? "" : "text-neutral-500"}>{label}</span>
      <span className="tabular-nums">{wert}</span>
    </div>
  );
}

/** Versandkosten: Betrag setzen/entfernen + „Porto nach Staat" (Gitarre/Teile je Kundenstaat). */
function VersandZeile({
  belegId, cur, betrag, bezeichnung, act, porto,
}: {
  belegId: string;
  cur: "EUR" | "USD";
  betrag: string | null;
  bezeichnung: string | null;
  act: Act;
  porto?: Act;
}) {
  const [state, action] = useActionState(act, IDLE);
  const [pState, pAction] = useActionState(porto ?? NOOP, IDLE);
  const hat = !!Number(betrag);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-neutral-500">Versandkosten</span>
        <form action={action} className="flex items-center gap-1" key={`${betrag}`}>
          <input type="hidden" name="id" value={belegId} />
          <input type="hidden" name="bezeichnung" value={bezeichnung ?? ""} />
          <Input name="betrag" defaultValue={formatBetrag(betrag)} inputMode="decimal" placeholder="0,00"
            className="h-7 w-24 text-right" />
          <SubmitButton size="sm" variant="outline" pendingText="…">OK</SubmitButton>
        </form>
        {hat ? (
          <form action={action}>
            <input type="hidden" name="id" value={belegId} />
            <input type="hidden" name="betrag" value="0" />
            <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…" title="Versand entfernen">×</SubmitButton>
          </form>
        ) : null}
        {porto ? (
          <form action={pAction}>
            <input type="hidden" name="id" value={belegId} />
            <SubmitButton size="sm" pendingText="…" title="Gitarren- oder Teile-Porto je nach Staat des Kunden">
              Porto nach Staat
            </SubmitButton>
          </form>
        ) : null}
        <span className="ml-auto tabular-nums">{hat ? formatMoney(betrag, cur) : "–"}</span>
      </div>
      {bezeichnung && hat ? <div className="text-xs text-muted">{bezeichnung} · nicht rabattierfähig</div> : null}
      {state && !state.ok ? <FormMessage state={state} /> : null}
      {pState ? <FormMessage state={pState} /> : null}
    </div>
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
  // Nach erfolgreichem Hinzufügen Artikelsuche leeren (die übrigen Felder setzt das Formular selbst zurück).
  const [addState, addAction] = useActionState(async (prev: ActionState, fd: FormData) => {
    const res = await addAct(prev, fd);
    if (res?.ok) {
      setPicked(null);
      setQ("");
      setHits([]);
    }
    return res;
  }, IDLE);

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
