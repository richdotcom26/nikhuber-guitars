import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { artikelName } from "@/lib/artikel-shared";
import { getArtikel, listLieferanten } from "@/lib/domain/artikel";
import { isDomainError } from "@/lib/domain/errors";
import { candidatesBySlot, getSpecs, specArtikelliste } from "@/lib/domain/specs";
import { SECTION_LABEL } from "@/lib/specs/slots";
import { formatMoney } from "@/lib/utils";
import { ArtikelActionsBar } from "../../artikel/artikel-actions-bar";
import { ArtikelForm } from "../../artikel/artikel-form";
import { SpecsEditor } from "../../specs-editor";

const TABS: readonly TabItem[] = [
  { key: "artikel", label: "Artikel" },
  { key: "specs", label: "Specs" },
  { key: "kalkulation", label: "Kalkulation" },
];

export default async function ModellDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "artikel";

  let data: Awaited<ReturnType<typeof getArtikel>>;
  try {
    data = await getArtikel(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const a = data.artikel;
  if (a.artikelgruppe !== "MODEL") redirect(`/artikel/${id}`);

  return (
    <div className="space-y-5">
      <PageHeader
        title={artikelName(a)}
        description={
          <span className="flex items-center gap-2">
            <Badge tone="violet">Modell</Badge>
            {a.artikelNr ? <span className="font-mono">{a.artikelNr}</span> : null}
            <span>VK {formatMoney(a.vkEur)} / {formatMoney(a.vkUs, "USD")}</span>
            {a.datensatzInaktiv ? <Badge tone="amber">inaktiv</Badge> : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/modelle" className={buttonClasses("outline")}>Zurück</Link>
            <ArtikelActionsBar id={a.id} isModell inaktiv={a.datensatzInaktiv} />
          </div>
        }
      />
      <Tabs items={TABS} active={active} basePath={`/modelle/${id}`} />

      {active === "artikel" ? <ArtikelTab id={id} /> : null}
      {active === "specs" ? <SpecsTab id={id} model={a} /> : null}
      {active === "kalkulation" ? <KalkulationTab id={id} /> : null}
    </div>
  );
}

async function ArtikelTab({ id }: { id: string }) {
  const [{ artikel: a }, lieferanten] = await Promise.all([getArtikel(id), listLieferanten()]);
  const formValues = { ...a };
  return (
    <ArtikelForm
      mode="edit"
      isModell
      values={formValues}
      lieferanten={lieferanten.map((l) => ({ id: l.id, label: l.firma || l.nachname || l.kurzname || l.id }))}
    />
  );
}

async function SpecsTab({
  id,
  model,
}: {
  id: string;
  model: {
    freitextBody: string | null; freitextColour: string | null;
    freitextNeck: string | null; freitextAssembly: string | null;
  };
}) {
  const [rows, candidates] = await Promise.all([getSpecs("modell", id), candidatesBySlot()]);
  return (
    <SpecsEditor
      traeger="modell"
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
  );
}

async function KalkulationTab({ id }: { id: string }) {
  const k = await specArtikelliste(id);
  const eur = (n: number) => formatMoney(n, "EUR");
  return (
    <Card>
      <CardHeader><CardTitle>Kalkulation — {k.modellName}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Row label="Basis VK EUR" v={eur(k.basis.vkEur)} />
          <Row label="Basis NET1" v={eur(k.basis.net1)} />
          <Row label="Basis NET2" v={eur(k.basis.net2)} />
          <Row label="Σ Komponenten-EK" v={eur(k.summe.ekNettoEur)} />
          <Row label="+ Aufpreis-Deltas VK" v={eur(k.deltaSum.vkEur)} />
          <Row label="+ Deltas NET1" v={eur(k.deltaSum.net1)} />
          <Row label="+ Deltas NET2" v={eur(k.deltaSum.net2)} />
          <span />
          <Row label="= Modellpreis VK EUR" v={eur(k.summe.vkEur)} strong />
          <Row label="= Modellpreis NET1" v={eur(k.summe.net1)} strong />
          <Row label="= Modellpreis NET2" v={eur(k.summe.net2)} strong />
        </dl>

        <Table>
          <THead>
            <TR>
              <TH>Slot</TH>
              <TH>Spec-Artikel</TH>
              <TH className="w-16">Aufpreis</TH>
              <TH className="text-right">VK EUR</TH>
              <TH className="text-right">NET1</TH>
              <TH className="text-right">NET2</TH>
              <TH className="text-right">EK netto</TH>
            </TR>
          </THead>
          <TBody>
            {k.zeilen.map((z, i) => (
              <TR key={`${z.slotKey}-${i}`}>
                <TD className="text-neutral-500">{SECTION_LABEL[z.section]} · {z.caption}</TD>
                <TD>{z.artikelName ?? "–"}</TD>
                <TD>{z.aufpreis ? "✓" : ""}</TD>
                <TD className="text-right tabular-nums">{z.vkEur ? eur(z.vkEur) : "–"}</TD>
                <TD className="text-right tabular-nums">{z.net1 ? eur(z.net1) : "–"}</TD>
                <TD className="text-right tabular-nums">{z.net2 ? eur(z.net2) : "–"}</TD>
                <TD className="text-right tabular-nums">{z.ekNettoEur ? eur(z.ekNettoEur) : "–"}</TD>
              </TR>
            ))}
            {k.zeilen.length === 0 ? (
              <TR><TD colSpan={7} className="py-4 text-center text-neutral-400">Keine Specs belegt.</TD></TR>
            ) : null}
          </TBody>
        </Table>
        <p className="text-xs text-neutral-400">
          Delta-Preise nur für als Aufpreis markierte Slots; EK wird über alle Komponenten summiert.
          Die Kalkulations-Sektion (Arbeitsstunden, Kleinteile) ist ein Redesign-Kandidat (MIGRATION 7y).
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <div className={"flex justify-between gap-2 " + (strong ? "font-semibold" : "")}>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
