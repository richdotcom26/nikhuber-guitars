"use client";

import { useActionState, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  SCHRITT_STATUS_LABEL, SCHRITT_STATUS_VALUES, WARTEN_GRUND_VALUES,
} from "@/lib/auftrag-shared";
import { IDLE } from "@/lib/domain/action-state";
import { formatDateTime } from "@/lib/utils";
import {
  alleVorherigenErledigtAction, saveSchrittBemerkungAction, setSchrittStatusAction,
  setSchrittWartenAufAction,
} from "./actions";

/** „Kiste packen" (Order 29) ist kein linearer Schritt — hält den führenden Erledigt-Block nicht auf. */
const KISTE_PACKEN_ORDER = 29;

export interface SchrittRow {
  id: string;
  status: string;
  erledigtAm: string | Date | null;
  erledigtVonName: string | null;
  maImport: string | null;
  bemerkungBearbeiter: string | null;
  wartenAuf: string | null;
  dauerMinuten: number | null;
  vorratNr: number;
  workstep: string;
  reihenfolge: number;
  typ: string | null;
  farbe: string | null;
  isNext: boolean;
}

export function ArbeitsschrittePanel({
  auftragId,
  rows,
}: {
  auftragId: string;
  rows: SchrittRow[];
}) {
  const [zeigeAlle, setZeigeAlle] = useState(false);

  const werkstatt = rows.filter((r) => r.typ === "WERKSTATT");
  const office = rows.filter((r) => r.typ !== "WERKSTATT");

  // Führender Erledigt-Block: bis zur ersten noch nicht erledigten Nummer (ohne „Kiste packen").
  // Nur diese erledigten Schritte werden ausgeblendet; später Erledigtes bleibt sichtbar.
  const grenze = Math.min(
    ...werkstatt
      .filter((r) => r.status !== "ERLEDIGT" && r.reihenfolge !== KISTE_PACKEN_ORDER)
      .map((r) => r.reihenfolge),
    Number.POSITIVE_INFINITY,
  );
  const istVersteckt = (r: SchrittRow) => r.status === "ERLEDIGT" && r.reihenfolge < grenze;
  const versteckt = werkstatt.filter(istVersteckt);
  const werkstattSichtbar = zeigeAlle ? werkstatt : werkstatt.filter((r) => !istVersteckt(r));

  return (
    <div className="space-y-5">
      <Section
        title="Werkstatt"
        auftragId={auftragId}
        rows={werkstattSichtbar}
        gesamt={werkstatt.length}
        toolbar={
          versteckt.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {zeigeAlle
                  ? `${versteckt.length} erledigte Schritte werden angezeigt`
                  : `${versteckt.length} erledigte Schritte ausgeblendet`}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setZeigeAlle((v) => !v)}>
                {zeigeAlle ? "ausgeblendete wieder verstecken" : "alle anzeigen"}
              </Button>
            </div>
          ) : null
        }
      />
      <Section title="Office / Compliance" auftragId={auftragId} rows={office} gesamt={office.length} />
    </div>
  );
}

function Section({
  title, auftragId, rows, gesamt, toolbar,
}: {
  title: string;
  auftragId: string;
  rows: SchrittRow[];
  gesamt: number;
  toolbar?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({gesamt})</CardTitle>
        {toolbar}
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH className="w-10">#</TH>
              <TH>Schritt</TH>
              <TH className="w-56">Status</TH>
              <TH className="w-36">erledigt</TH>
              <TH className="w-28">MA</TH>
              <TH>Bemerkung</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => <Row key={`${r.id}:${r.status}`} auftragId={auftragId} row={r} />)}
            {rows.length === 0 ? (
              <TR><TD colSpan={6} className="py-3 text-center text-neutral-400">
                {gesamt > 0 ? "Alle Schritte erledigt und ausgeblendet." : "Keine Schritte."}
              </TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Row({ auftragId, row }: { auftragId: string; row: SchrittRow }) {
  const [, statusAction] = useActionState(setSchrittStatusAction, IDLE);
  const [, vorherAction] = useActionState(alleVorherigenErledigtAction, IDLE);
  const [bemState, bemAction] = useActionState(saveSchrittBemerkungAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  // „Kiste packen" (Order 29): nur offen / Kiste vollständig. Alle anderen Schritte:
  // offen / erledigt / Warten auf. Der aktuell gesetzte Status bleibt immer wählbar (Altbestand).
  const erlaubt = row.reihenfolge === KISTE_PACKEN_ORDER
    ? (["OFFEN", "KISTE_VOLLSTAENDIG"] as const)
    : (["OFFEN", "ERLEDIGT", "WARTEN_AUF"] as const);
  const statusOptionen = SCHRITT_STATUS_VALUES.filter(
    (s) => (erlaubt as readonly string[]).includes(s) || s === row.status,
  );

  return (
    <TR className={row.isNext ? "bg-amber-50" : row.status === "ERLEDIGT" ? "opacity-60" : ""}>
      <TD className="tabular-nums text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-1.5 shrink-0 rounded-sm"
            style={{ background: row.farbe ?? "transparent" }}
            aria-hidden
          />
          {row.reihenfolge}
        </span>
      </TD>
      <TD className="font-medium">
        {row.workstep}
        {row.isNext ? <Badge tone="amber" className="ml-2">als Nächstes</Badge> : null}
      </TD>
      <TD>
        <form ref={formRef} action={statusAction} className="flex items-center gap-1">
          <input type="hidden" name="auftragId" value={auftragId} />
          <input type="hidden" name="schrittId" value={row.id} />
          <Select
            name="status"
            defaultValue={row.status}
            onChange={() => formRef.current?.requestSubmit()}
            className="h-7"
          >
            {statusOptionen.map((s) => (
              <option key={s} value={s}>{SCHRITT_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </form>
        {row.status === "WARTEN_AUF" ? <WartenGrund auftragId={auftragId} row={row} /> : null}
      </TD>
      <TD className="text-xs text-neutral-500">{formatDateTime(row.erledigtAm)}</TD>
      <TD className="text-xs text-neutral-500">{row.erledigtVonName ?? row.maImport ?? "–"}</TD>
      <TD>
        <form action={bemAction} className="flex items-center gap-1">
          <input type="hidden" name="auftragId" value={auftragId} />
          <input type="hidden" name="schrittId" value={row.id} />
          <Input name="bemerkung" defaultValue={row.bemerkungBearbeiter ?? ""} className="h-7" />
          <Input name="dauerMinuten" defaultValue={row.dauerMinuten ?? ""} inputMode="numeric"
            placeholder="min" className="h-7 w-14" />
          <SubmitButton size="sm" variant="ghost" pendingText="…">OK</SubmitButton>
          {bemState && !bemState.ok ? <span className="text-xs text-red-600">{bemState.message}</span> : null}
        </form>
        {row.isNext ? (
          <form action={vorherAction} className="mt-1">
            <input type="hidden" name="auftragId" value={auftragId} />
            <input type="hidden" name="schrittId" value={row.id} />
            <SubmitButton size="sm" variant="outline" pendingText="…">
              alle vorherigen erledigen
            </SubmitButton>
          </form>
        ) : null}
      </TD>
    </TR>
  );
}

/** Zusatzfeld bei Status „Warten auf": Auswahlliste „Grund des Wartens". */
function WartenGrund({ auftragId, row }: { auftragId: string; row: SchrittRow }) {
  const [state, action] = useActionState(setSchrittWartenAufAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const grund = row.wartenAuf ?? "";
  const bekannt = (WARTEN_GRUND_VALUES as readonly string[]).includes(grund);

  return (
    <form ref={formRef} action={action} className="mt-1 flex items-center gap-1">
      <input type="hidden" name="auftragId" value={auftragId} />
      <input type="hidden" name="schrittId" value={row.id} />
      <Select
        name="wartenAuf"
        defaultValue={grund}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-7"
      >
        <option value="">– Grund wählen –</option>
        {grund && !bekannt ? <option value={grund}>{grund}</option> : null}
        {WARTEN_GRUND_VALUES.map((g) => <option key={g} value={g}>{g}</option>)}
      </Select>
      {state && !state.ok ? <span className="text-xs text-red-600">{state.message}</span> : null}
    </form>
  );
}
