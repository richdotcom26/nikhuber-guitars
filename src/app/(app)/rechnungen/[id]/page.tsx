import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  RG_BELEGART_LABEL, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import { isDomainError } from "@/lib/domain/errors";
import { getRechnung, listRechnungPositionen } from "@/lib/domain/rechnung";
import { formatDate, formatMoney } from "@/lib/utils";
import { AnhangCard } from "../../_components/anhang-card";
import { PositionenPanel } from "../../_components/positionen-panel";
import {
  addPositionAction, deletePositionAction, noGenerateAction, updatePositionAction,
} from "../actions";
import {
  AnzahlungForm, KopfForm, StornoGutschriftButtons, ZahlungForm,
} from "../forms";

const TABS: readonly TabItem[] = [
  { key: "rechnung", label: "Rechnung" },
  { key: "positionen", label: "Positionen" },
  { key: "zahlung", label: "Zahlung" },
];

export default async function RechnungDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "rechnung";

  let data: Awaited<ReturnType<typeof getRechnung>>;
  try {
    data = await getRechnung(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const r = data.rechnung;
  const kdName = r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || null;
  const cur = r.kdWaehrung === "USD" ? "USD" : "EUR";
  const gebucht = r.gebuchtBeimSteuerbuero;

  return (
    <div className="space-y-5">
      <PageHeader
        title={r.nummer}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}</Badge>
            {r.teilgutschrift ? <Badge tone="blue">Teil</Badge> : null}
            <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>
              {RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}
            </Badge>
            <span>{formatDate(r.rechnungsdatum)}</span>
            {kdName ? <span>· {kdName}</span> : null}
            {data.referenz ? (
              <Link href={`/rechnungen/${data.referenz.id}`} className="text-xs text-blue-700 hover:underline">
                → Referenz {data.referenz.nummer}
              </Link>
            ) : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rechnungen" className={buttonClasses("outline")}>Zurück</Link>
            <a href={`/druck/rechnung/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>Vorschau</a>
            <a href={`/druck/rechnung/${id}/pdf`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>PDF</a>
            {r.belegart === "RECHNUNG" || r.belegart === "GUTSCHRIFT" || r.belegart === "STORNORECHNUNG" ? (
              <a href={`/druck/rechnung/${id}/pdf?zugferd=1`} target="_blank" rel="noreferrer" className={buttonClasses("outline")} title="PDF/A-3 mit eingebettetem ZUGFeRD-XML (Beta)">E-Rechnung</a>
            ) : null}
          </div>
        }
      />

      {r.belegart === "RECHNUNG" && !gebucht ? (
        <StornoGutschriftButtons id={id} isRechnung />
      ) : r.belegart === "RECHNUNG" && gebucht ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Beim Steuerbüro gebucht — Änderungen nur über <b>Gutschrift + neue Rechnung</b>.
          <StornoGutschriftButtons id={id} isRechnung />
        </div>
      ) : null}

      <Tabs items={TABS} active={active} basePath={`/rechnungen/${id}`} />

      {active === "rechnung" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Beleg</CardTitle></CardHeader>
              <CardContent>
                <KopfForm
                  id={id}
                  status={r.status}
                  rechnungsdatum={r.rechnungsdatum}
                  lieferdatum={r.lieferdatum}
                  reportMonat={r.reportMonat}
                  bemerkungRechnung={r.bemerkungRechnung}
                  gebuchtBeimSteuerbuero={gebucht}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dokumente</CardTitle></CardHeader>
              <CardContent>
                <AnhangCard traeger="rechnung" id={id} revalidate={`/rechnungen/${id}`} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Bezug</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {data.auftragInfo ? (
                  <>
                    <div>
                      Auftrag:{" "}
                      <Link href={`/auftraege/${data.auftragInfo.id}`} className="font-mono text-blue-700 hover:underline">
                        {data.auftragInfo.nummer}
                      </Link>
                    </div>
                    {data.auftragInfo.modellName ? <div className="text-neutral-500">{data.auftragInfo.modellName}</div> : null}
                    {data.auftragInfo.serNr ? <div className="text-neutral-500">Ser# {data.auftragInfo.serNr}</div> : null}
                  </>
                ) : <span className="text-neutral-400">Kein Auftrag verknüpft.</span>}
                {r.kundeId ? (
                  <Link href={`/adressen/${r.kundeId}`} className="inline-block text-xs text-blue-700 hover:underline">
                    → Kundendatensatz
                  </Link>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Anzahlung</CardTitle></CardHeader>
              <CardContent>
                <AnzahlungForm
                  id={id}
                  beruecksichtigen={r.anzahlungBeruecksichtigen}
                  brutto={r.anzahlungBrutto}
                  datum={r.anzahlungDatum}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Summen</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-neutral-500">Netto</dt>
                  <dd className="text-right tabular-nums">{formatMoney(r.summeNetto, cur)}</dd>
                  <dt className="text-neutral-500">MwSt</dt>
                  <dd className="text-right tabular-nums">{formatMoney(r.summeMwst, cur)}</dd>
                  <dt className="font-semibold">Brutto</dt>
                  <dd className="text-right font-semibold tabular-nums">{formatMoney(r.summeBrutto, cur)}</dd>
                  <dt className="text-neutral-500">Rechnungsbetrag</dt>
                  <dd className="text-right tabular-nums">{formatMoney(r.rechnungsbetrag, cur)}</dd>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {active === "positionen" ? (
        gebucht ? (
          <Card><CardContent className="py-4 text-sm text-amber-800">
            Positionen gesperrt (beim Steuerbüro gebucht).
          </CardContent></Card>
        ) : (
          <PositionenPanel
            belegId={id}
            rows={(await listRechnungPositionen(id)).map((p) => ({
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
              summePositionen: r.summePositionen,
              summeNetto: r.summeNetto,
              summeMwst: r.summeMwst,
              summeBrutto: r.summeBrutto,
            }}
            waehrung={r.kdWaehrung}
            vertriebsweg={r.kdVertriebsweg}
            canGenerate={false}
            actions={{
              generate: noGenerateAction,
              deleteAll: noGenerateAction,
              add: addPositionAction,
              update: updatePositionAction,
              remove: deletePositionAction,
            }}
          />
        )
      ) : null}

      {active === "zahlung" ? (
        <Card>
          <CardHeader><CardTitle>Zahlung (manuell erfasst)</CardTitle></CardHeader>
          <CardContent>
            <ZahlungForm
              id={id}
              zahlungsdatum={r.zahlungsdatum}
              zahlbetrag={r.zahlbetrag}
              zahlungAnBank={r.zahlungAnBank}
              zahlungsstatus={r.zahlungsstatus}
              abzugProzent={r.abzugProzent}
              rechnungsbetrag={r.rechnungsbetrag}
              differenzZahlung={r.differenzZahlung}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
