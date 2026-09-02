import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  AUFTRAGSART_LABEL, fortschrittFarbe,
} from "@/lib/auftrag-shared";
import { getAuftrag, kundenPickerListe } from "@/lib/domain/auftrag";
import { listArbeitsschritte } from "@/lib/domain/arbeitsschritt";
import { listPositionen } from "@/lib/domain/belege";
import { isDomainError } from "@/lib/domain/errors";
import { candidatesBySlot, getSpecs } from "@/lib/domain/specs";
import { formatDate } from "@/lib/utils";
import { PositionenPanel } from "../../_components/positionen-panel";
import { SpecsEditor } from "../../specs-editor";
import {
  addPositionAction, deleteAllePositionenAction, deletePositionAction,
  generatePositionenAction, setGesamtrabattAction, updatePositionAction,
} from "../actions";
import { ArbeitsschrittePanel } from "../arbeitsschritte-panel";
import { CreateRechnungButton } from "../create-rechnung-button";
import { KopfForm } from "../kopf-form";
import { SetKundeButton } from "../set-kunde-form";
import { StatusChanger } from "../status-changer";

const TABS: readonly TabItem[] = [
  { key: "auftrag", label: "Auftrag" },
  { key: "details", label: "Details (Specs)" },
  { key: "positionen", label: "Positionen" },
  { key: "arbeitsschritte", label: "Arbeitsschritte" },
  { key: "rechnung", label: "Rechnung" },
];

export default async function AuftragDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; kundenSuche?: string }>;
}) {
  const { id } = await params;
  const { tab, kundenSuche } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "auftrag";

  let data: Awaited<ReturnType<typeof getAuftrag>>;
  try {
    data = await getAuftrag(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const a = data.auftrag;
  const kdName = a.kdFirma || [a.kdVorname, a.kdNachname].filter(Boolean).join(" ") || null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={a.nummer}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{AUFTRAGSART_LABEL[a.auftragsart] ?? a.auftragsart}</Badge>
            <span>{formatDate(a.auftragsdatum)}</span>
            {kdName ? <span>· {kdName}</span> : null}
            {data.modellName ? <span>· {data.modellName}</span> : null}
            <span
              className="rounded px-1.5 py-0.5 text-xs tabular-nums"
              style={{ background: fortschrittFarbe(a.fortschrittProzent) }}
            >
              {a.fortschrittProzent == null ? "–" : `${a.fortschrittProzent}%`}
            </span>
          </span>
        }
        actions={<Link href="/auftraege" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <Tabs items={TABS} active={active} basePath={`/auftraege/${id}`} />

      {active === "auftrag" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Status</CardTitle></CardHeader>
              <CardContent><StatusChanger id={id} status={a.status} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Kunde</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {kdName ? (
                  <div className="text-sm">
                    <div className="font-medium">{kdName}</div>
                    <div className="text-neutral-500">{a.kdStrasse}</div>
                    <div className="text-neutral-500">{[a.kdPlz, a.kdOrt].filter(Boolean).join(" ")}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {a.kdRegion ? <Badge>{a.kdRegion}</Badge> : null}
                      {a.kdWaehrung ? <Badge>{a.kdWaehrung}</Badge> : null}
                      {a.kdVertriebsweg ? <Badge>{a.kdVertriebsweg}</Badge> : null}
                      {a.kdSteuerpflichtig === true ? <Badge tone="amber">steuerpflichtig</Badge> : null}
                      {a.kdSteuerpflichtig === false ? <Badge tone="green">steuerfrei</Badge> : null}
                    </div>
                    {a.kundeId ? (
                      <Link href={`/adressen/${a.kundeId}`} className="mt-1 inline-block text-xs text-blue-700 hover:underline">
                        → Kundendatensatz
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400">Kein Kunde gewählt.</p>
                )}
                <form method="get" className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                  <input type="hidden" name="tab" value="auftrag" />
                  <Input name="kundenSuche" defaultValue={kundenSuche ?? ""} placeholder="Kunde suchen …" className="h-8 w-56" />
                  <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
                </form>
                {kundenSuche ? <KundenTreffer auftragId={id} q={kundenSuche} /> : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Kopf</CardTitle></CardHeader>
            <CardContent>
              <KopfForm
                v={{
                  id,
                  auftragsart: a.auftragsart,
                  prio: a.prio,
                  produktionsort: a.produktionsort,
                  besonderes: a.besonderes,
                  spezialauftrag: a.spezialauftrag,
                  bauplandatum: a.bauplandatum,
                  umsatzerwartung: a.umsatzerwartung,
                  anzahlung: a.anzahlung,
                }}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {active === "details" ? <DetailsTab id={id} model={a} /> : null}

      {active === "positionen" ? (
        <PositionenPanel
          belegId={id}
          rows={(await listPositionen("auftrag", id)).map((p) => ({
            id: p.id,
            posNr: p.posNr,
            artikelName: p.artikelName,
            artikelBeschreibung: p.artikelBeschreibung,
            anzahl: p.anzahl,
            einzelpreis: p.einzelpreis,
            rabattProzent: p.rabattProzent,
            gesamtpreis: p.gesamtpreis,
            reRelevant: p.reRelevant,
            herkunftSlotKey: p.herkunftSlotKey,
          }))}
          summen={{
            summePositionen: a.summePositionen,
            summeNetto: a.summeNetto,
            summeMwst: a.summeMwst,
            summeBrutto: a.summeBrutto,
          }}
          waehrung={a.kdWaehrung}
          vertriebsweg={a.kdVertriebsweg}
          canGenerate={!!a.modellArtikelId}
          actions={{
            generate: generatePositionenAction,
            deleteAll: deleteAllePositionenAction,
            add: addPositionAction,
            update: updatePositionAction,
            remove: deletePositionAction,
          }}
          gesamtrabatt={{
            aktiv: a.gesamtrabattAktiv,
            prozent: a.gesamtrabattProzent,
            wert: a.gesamtrabattWert,
            action: setGesamtrabattAction,
          }}
        />
      ) : null}

      {active === "arbeitsschritte" ? (
        <ArbeitsschrittePanel
          auftragId={id}
          rows={(await listArbeitsschritte(id)).map((s) => ({
            id: s.id,
            status: s.status,
            erledigtAm: s.erledigtAm,
            maImport: s.maImport,
            bemerkungBearbeiter: s.bemerkungBearbeiter,
            dauerMinuten: s.dauerMinuten,
            vorratNr: s.vorratNr,
            workstep: s.workstep,
            reihenfolge: s.reihenfolge,
            typ: s.typ,
            isNext: s.isNext,
          }))}
        />
      ) : null}

      {active === "rechnung" ? (
        <Card>
          <CardHeader><CardTitle>Rechnungen</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <CreateRechnungButton auftragId={id} />
            {data.rechnungen.length === 0 ? (
              <p className="text-neutral-400">Noch keine Rechnung.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {data.rechnungen.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-1.5">
                    <Link href={`/rechnungen/${r.id}`} className="font-mono hover:underline">{r.nummer}</Link>
                    <span className="flex gap-1">
                      <Badge>{r.belegart}</Badge><Badge>{r.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function KundenTreffer({ auftragId, q }: { auftragId: string; q: string }) {
  const kunden = await kundenPickerListe(q, 15);
  if (kunden.length === 0) return <p className="text-xs text-neutral-400">Kein Treffer.</p>;
  return (
    <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
      {kunden.map((k) => {
        const name = k.firma || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";
        return (
          <li key={k.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span>{name} <span className="text-xs text-neutral-400">{k.ort ?? ""} · {k.kontaktart}</span></span>
            <SetKundeButton auftragId={auftragId} kundeId={k.id} />
          </li>
        );
      })}
    </ul>
  );
}

async function DetailsTab({
  id,
  model,
}: {
  id: string;
  model: {
    modellArtikelId: string | null;
    freitextBody: string | null; freitextColour: string | null;
    freitextNeck: string | null; freitextAssembly: string | null;
  };
}) {
  const [rows, candidates] = await Promise.all([getSpecs("auftrag", id), candidatesBySlot()]);
  return (
    <div className="space-y-4">
      {!model.modellArtikelId ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Keine Modellvorlage — Specs am besten über ein Angebot setzen und übernehmen.
        </p>
      ) : null}
      <SpecsEditor
        traeger="auftrag"
        traegerId={id}
        rows={rows}
        candidates={candidates}
        freitexte={{
          BODY: model.freitextBody,
          FINISH_COLOUR: model.freitextColour,
          NECK: model.freitextNeck,
          ASSEMBLY: model.freitextAssembly,
        }}
      />
    </div>
  );
}
