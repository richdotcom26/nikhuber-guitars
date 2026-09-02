import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  ANGEBOT_STATUS_LABEL, ANGEBOT_STATUS_TONE, type AngebotStatus,
} from "@/lib/angebot-shared";
import { getAngebot, kundenPickerListe } from "@/lib/domain/angebot";
import { listArtikel } from "@/lib/domain/artikel";
import { listPositionen } from "@/lib/domain/belege";
import { isDomainError } from "@/lib/domain/errors";
import { candidatesBySlot, getSpecs } from "@/lib/domain/specs";
import { formatDate } from "@/lib/utils";
import { AnhangCard } from "../../_components/anhang-card";
import { PositionenPanel } from "../../_components/positionen-panel";
import {
  addPositionAction, deleteAllePositionenAction, deletePositionAction,
  generatePositionenAction, updatePositionAction,
} from "../actions";
import { KopfForm } from "../kopf-form";
import { SetKundeButton } from "../set-kunde-form";
import { ToAuftragButton } from "../to-auftrag-button";
import { VorlagePicker } from "../vorlage-picker";
import { SpecsEditor } from "../../specs-editor";

const TABS: readonly TabItem[] = [
  { key: "angebot", label: "Angebot" },
  { key: "details", label: "Details (Specs)" },
  { key: "positionen", label: "Positionen" },
];

export default async function AngebotDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; kundenSuche?: string }>;
}) {
  const { id } = await params;
  const { tab, kundenSuche } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "angebot";

  let data: Awaited<ReturnType<typeof getAngebot>>;
  try {
    data = await getAngebot(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const a = data.angebot;
  const kdName = a.kdFirma || [a.kdVorname, a.kdNachname].filter(Boolean).join(" ") || null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={a.nummer}
        description={
          <span className="flex items-center gap-2">
            <Badge tone={ANGEBOT_STATUS_TONE[a.status as AngebotStatus] ?? "neutral"}>
              {ANGEBOT_STATUS_LABEL[a.status as AngebotStatus] ?? a.status}
            </Badge>
            <span>{formatDate(a.angebotsdatum)}</span>
            {kdName ? <span>· {kdName}</span> : null}
            {data.modellName ? <span>· {data.modellName}</span> : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/angebote" className={buttonClasses("outline")}>Zurück</Link>
            <a href={`/druck/angebot/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>Druck</a>
            <ToAuftragButton id={a.id} disabled={a.status === "AUFTRAG"} />
          </div>
        }
      />
      <Tabs items={TABS} active={active} basePath={`/angebote/${id}`} />

      {active === "angebot" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Kunde</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {kdName ? (
                <div className="text-sm">
                  <div className="font-medium">{kdName}</div>
                  <div className="text-neutral-500">{a.kdStrasse}</div>
                  <div className="text-neutral-500">{[a.kdPlz, a.kdOrt].filter(Boolean).join(" ")}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs text-neutral-500">
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
                <input type="hidden" name="tab" value="angebot" />
                <Input name="kundenSuche" defaultValue={kundenSuche ?? ""} placeholder="Kunde suchen …" className="h-8 w-56" />
                <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
              </form>
              {kundenSuche ? <KundenTreffer angebotId={id} q={kundenSuche} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Kopf</CardTitle></CardHeader>
            <CardContent>
              <KopfForm
                id={id}
                status={a.status}
                angebotsdatum={a.angebotsdatum}
                kopftext={a.kopftext}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Dokumente</CardTitle></CardHeader>
            <CardContent>
              <AnhangCard traeger="angebot" id={id} revalidate={`/angebote/${id}`} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {active === "details" ? <DetailsTab id={id} modellArtikelId={a.modellArtikelId} model={a} /> : null}

      {active === "positionen" ? (
        <PositionenPanel
          belegId={id}
          rows={(await listPositionen("angebot", id)).map((p) => ({
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
        />
      ) : null}
    </div>
  );
}

async function KundenTreffer({ angebotId, q }: { angebotId: string; q: string }) {
  const kunden = await kundenPickerListe(q, 15);
  if (kunden.length === 0) return <p className="text-xs text-neutral-400">Kein Treffer.</p>;
  return (
    <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
      {kunden.map((k) => {
        const name = k.firma || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";
        return (
          <li key={k.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span>
              {name} <span className="text-xs text-neutral-400">{k.ort ?? ""} · {k.kontaktart}</span>
            </span>
            <SetKundeButton angebotId={angebotId} kundeId={k.id} />
          </li>
        );
      })}
    </ul>
  );
}

async function DetailsTab({
  id,
  modellArtikelId,
  model,
}: {
  id: string;
  modellArtikelId: string | null;
  model: {
    freitextBody: string | null; freitextColour: string | null;
    freitextNeck: string | null; freitextAssembly: string | null;
  };
}) {
  const [rows, candidates, modelle] = await Promise.all([
    getSpecs("angebot", id),
    candidatesBySlot(),
    listArtikel({ modelle: "nur", pageSize: 200 }),
  ]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Modellvorlage</CardTitle></CardHeader>
        <CardContent>
          <VorlagePicker
            id={id}
            hasVorlage={!!modellArtikelId}
            modelle={modelle.rows.map((m) => ({ id: m.id, name: m.nameBelege || m.nameLang || m.id }))}
          />
        </CardContent>
      </Card>
      <SpecsEditor
        traeger="angebot"
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
