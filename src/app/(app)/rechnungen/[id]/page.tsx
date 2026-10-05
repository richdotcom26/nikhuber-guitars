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
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { AnhangCard } from "../../_components/anhang-card";
import { PositionenPanel } from "../../_components/positionen-panel";
import {
  addPositionAction, deleteAllePositionenAction, deletePositionAction, positionenAusAuftragAction,
  updatePositionAction,
} from "../actions";
import {
  AnzahlungForm, KopfForm, StornoGutschriftButtons, ZahlungForm,
} from "../forms";
import { ErstellenButtons } from "../erstellen-buttons";

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
  searchParams: Promise<{ tab?: string; mail?: string }>;
}) {
  const { id } = await params;
  const { tab, mail } = await searchParams;
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
  const fest = !!r.festgeschriebenAm;

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
            {fest ? (
              <>
                <a href={`/rechnungen/${id}/dokument`} target="_blank" rel="noreferrer" className={buttonClasses("outline")} title="Archiviertes PDF (E-Rechnung, ZUGFeRD)">PDF</a>
                <Link href={`/rechnungen/${id}/mail`} className={buttonClasses()}>Per E-Mail versenden</Link>
              </>
            ) : (
              <a href={`/druck/rechnung/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>Vorschau</a>
            )}
          </div>
        }
      />

      {mail === "ok" ? (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          E-Mail mit der Rechnung wurde versendet (Protokoll unter <Link href="/mailversand" className="underline">Mailversand</Link>).
        </div>
      ) : null}

      {fest ? (
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          <b className="text-ink">Erstellt und festgeschrieben</b> am {formatDateTime(r.festgeschriebenAm)} — das PDF ist archiviert,
          Positionen, Datum und Anzahlung sind gesperrt. Korrekturen nur über Gutschrift/Storno.
        </div>
      ) : r.status === "BEZAHLT" || r.status === "RG_STORNIERT" ? null : (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm text-muted">
              1. <b className="text-ink">Vorschau</b> prüfen · 2. Rechnung <b className="text-ink">erstellen</b> (PDF wird archiviert, Rechnung gesperrt) · 3. per E-Mail versenden
            </span>
            <ErstellenButtons id={id} />
          </CardContent>
        </Card>
      )}

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
                  gesperrt={fest}
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
                ) : <span className="text-neutral-400">Ohne Auftrag (Ad-hoc-Rechnung für Kleinteile / Ersatzteile).</span>}
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
                  gesperrt={fest}
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
        gebucht || fest ? (
          <Card><CardContent className="space-y-2 py-4 text-sm">
            <p className="text-amber-800">
              Positionen gesperrt ({fest ? "Rechnung erstellt und festgeschrieben" : "beim Steuerbüro gebucht"}).
            </p>
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
              {(await listRechnungPositionen(id)).filter((p) => p.reRelevant).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 px-2 py-1.5">
                  <span>{p.posNr}. {p.artikelName ?? "–"} <span className="text-muted">× {Number(p.anzahl)}</span></span>
                  <span className="tabular-nums">{formatMoney(p.gesamtpreis, cur)}</span>
                </li>
              ))}
            </ul>
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
            canGenerate={!!r.auftragId}
            generateLabel="Aus Auftrag neu einlesen"
            generateConfirm="Alle Positionen dieser Rechnung durch die aktuellen Positionen des Auftrags ersetzen?"
            actions={{
              generate: r.auftragId ? positionenAusAuftragAction : undefined,
              deleteAll: deleteAllePositionenAction,
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
