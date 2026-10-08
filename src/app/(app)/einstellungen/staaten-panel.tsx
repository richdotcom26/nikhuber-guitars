"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { IDLE } from "@/lib/domain/action-state";
import { saveStaatAction } from "./actions";
import { formatMoney } from "@/lib/utils";

interface StaatRow {
  id: string;
  kuerzel: string | null;
  name: string;
  region: "D" | "EU" | "WELT" | "ASIEN" | "USA";
  defaultSprache: "DE" | "EN" | null;
  defaultWaehrung: "EUR" | "USD" | null;
  defaultZahlungsbedingungId: string | null;
  portoGitarreArtikelId: string | null;
  portoTeileArtikelId: string | null;
  updatedAt: string | Date;
}
interface ZbRow { id: string; bezeichnung: string }
interface PortoRow { id: string; name: string | null; vkEur: string | null; vkUs: string | null }

const REGIONEN = ["D", "EU", "WELT", "ASIEN", "USA"] as const;
const COLS = 8;

function portoLabel(p: PortoRow): string {
  const preise = [
    Number(p.vkEur) ? formatMoney(p.vkEur, "EUR") : null,
    Number(p.vkUs) ? formatMoney(p.vkUs, "USD") : null,
  ].filter(Boolean).join(" / ");
  return `${p.name ?? "–"}${preise ? ` (${preise})` : ""}`;
}

export function StaatenPanel({
  rows,
  zahlungsbedingungen,
  portoArtikel,
}: {
  rows: StaatRow[];
  zahlungsbedingungen: ZbRow[];
  portoArtikel: PortoRow[];
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const zbName = useMemo(
    () => new Map(zahlungsbedingungen.map((z) => [z.id, z.bezeichnung])),
    [zahlungsbedingungen],
  );
  const portoName = useMemo(
    () => new Map(portoArtikel.map((p) => [p.id, portoLabel(p)])),
    [portoArtikel],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(n) || (r.kuerzel ?? "").toLowerCase().includes(n),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staaten ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche Name / Kürzel"
            className="h-8 w-52"
          />
          <Button size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
            {adding ? "Abbrechen" : "Neu"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <THead>
            <TR>
              <TH className="w-16">Kürzel</TH>
              <TH>Name</TH>
              <TH className="w-24">Region</TH>
              <TH className="w-20">Sprache</TH>
              <TH className="w-20">Währung</TH>
              <TH>Zahlungsbedingung (Default)</TH>
              <TH>Porto Gitarre / Teile</TH>
              <TH className="w-28 text-right">Aktion</TH>
            </TR>
          </THead>
          <TBody>
            {adding ? (
              <StaatEditRow zbs={zahlungsbedingungen} porto={portoArtikel} onDone={() => setAdding(false)} />
            ) : null}
            {filtered.map((r) => (
              // Key mit updatedAt: nach dem Speichern remountet die Zeile im Ansichtsmodus.
              <StaatViewOrEdit
                key={`${r.id}:${new Date(r.updatedAt).getTime()}`}
                row={r}
                zbs={zahlungsbedingungen}
                zbName={zbName}
                porto={portoArtikel}
                portoName={portoName}
              />
            ))}
            {filtered.length === 0 && !adding ? (
              <TR><TD colSpan={COLS} className="py-4 text-center text-neutral-400">Kein Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StaatViewOrEdit({
  row,
  zbs,
  zbName,
  porto,
  portoName,
}: {
  row: StaatRow;
  zbs: ZbRow[];
  zbName: Map<string, string>;
  porto: PortoRow[];
  portoName: Map<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) return <StaatEditRow row={row} zbs={zbs} porto={porto} onDone={() => setEditing(false)} />;
  return (
    <TR>
      <TD className="font-mono text-xs">{row.kuerzel ?? "–"}</TD>
      <TD>{row.name}</TD>
      <TD>{row.region}</TD>
      <TD>{row.defaultSprache ?? "–"}</TD>
      <TD>{row.defaultWaehrung ?? "–"}</TD>
      <TD className="text-neutral-500">
        {row.defaultZahlungsbedingungId ? zbName.get(row.defaultZahlungsbedingungId) ?? "–" : "–"}
      </TD>
      <TD className="text-xs">
        <div className={row.portoGitarreArtikelId ? "" : "text-neutral-400"}>
          {row.portoGitarreArtikelId ? portoName.get(row.portoGitarreArtikelId) ?? "–" : "– kein Gitarren-Porto –"}
        </div>
        <div className="text-muted">
          {row.portoTeileArtikelId ? portoName.get(row.portoTeileArtikelId) ?? "–" : "–"}
        </div>
      </TD>
      <TD className="text-right">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bearbeiten</Button>
      </TD>
    </TR>
  );
}

function StaatEditRow({
  row,
  zbs,
  porto,
  onDone,
}: {
  row?: StaatRow;
  zbs: ZbRow[];
  porto: PortoRow[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveStaatAction, IDLE);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <TR className="bg-neutral-50">
      <TD colSpan={COLS} className="py-2">
        <form action={action} className="space-y-2">
          {row ? <input type="hidden" name="id" value={row.id} /> : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[5rem_1fr_7rem_6rem_6rem_1fr] sm:items-center">
            <Input name="kuerzel" placeholder="DE" defaultValue={row?.kuerzel ?? ""} className="h-8" />
            <Input name="name" placeholder="Name" defaultValue={row?.name ?? ""} required className="h-8" />
            <Select name="region" defaultValue={row?.region ?? "EU"} className="h-8">
              {REGIONEN.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Select name="defaultSprache" defaultValue={row?.defaultSprache ?? ""} className="h-8">
              <option value="">–</option>
              <option value="DE">DE</option>
              <option value="EN">EN</option>
            </Select>
            <Select name="defaultWaehrung" defaultValue={row?.defaultWaehrung ?? ""} className="h-8">
              <option value="">–</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
            <Select
              name="defaultZahlungsbedingungId"
              defaultValue={row?.defaultZahlungsbedingungId ?? ""}
              className="h-8"
            >
              <option value="">–</option>
              {zbs.map((z) => <option key={z.id} value={z.id}>{z.bezeichnung}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Porto Gitarre
              <Select name="portoGitarreArtikelId" defaultValue={row?.portoGitarreArtikelId ?? ""} className="h-8">
                <option value="">–</option>
                {porto.map((p) => <option key={p.id} value={p.id}>{portoLabel(p)}</option>)}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Porto Teile
              <Select name="portoTeileArtikelId" defaultValue={row?.portoTeileArtikelId ?? ""} className="h-8">
                <option value="">–</option>
                {porto.map((p) => <option key={p.id} value={p.id}>{portoLabel(p)}</option>)}
              </Select>
            </label>
            <div className="flex gap-1">
              <SubmitButton size="sm">Speichern</SubmitButton>
              <Button size="sm" variant="ghost" onClick={onDone}>Abbrechen</Button>
            </div>
          </div>
          <FormMessage state={state && !state.ok ? state : null} />
        </form>
      </TD>
    </TR>
  );
}
