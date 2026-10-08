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
  addPositionAction, setVersandAction, deleteAllePositionenAction, deletePositionAction, positionenAusAuftragAction,
  updatePositionAction,
} from "../actions";
import { BuchenButtons } from "../erstellen-buttons";
import {
  AnzahlungForm, KopfForm, KorrekturButtons, ZahlungForm,
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
  const entwurf = r.status === "ENTWURF";
  const art = RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart;
  const korrigierbar = r.belegart === "RECHNUNG" && (r.status === "GEBUCHT" || r.status === "BEZAHLT");

  const rabattZeile = r.gesamtrabattAktiv && Number(r.gesamtrabattWert);
  const versandZeile = Number(r.versandkosten);
  const summen = (
    <Card>
      <CardHeader><CardTitle>Summen</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {rabattZeile || versandZeile ? (
            <>
              <dt className="text-neutral-500">Summe Positionen</dt>
              <dd className="text-right tabular-nums">{formatMoney(r.summePositionen, cur)}</dd>
            </>
          ) : null}
          {rabattZeile ? (
            <>
              <dt className="text-neutral-500">Gesamtrabatt ({Number(r.gesamtrabattProzent)} %)</dt>
              <dd className="text-right tabular-nums">− {formatMoney(r.gesamtrabattWert, cur)}</dd>
            </>
          ) : null}
          {versandZeile ? (
            <>
              <dt className="text-neutral-500">Versandkosten{r.versandBezeichnung ? ` (${r.versandBezeichnung})` : ""}</dt>
              <dd className="text-right tabular-nums">{formatMoney(r.versandkosten, cur)}</dd>
            </>
          ) : null}
          <dt className="text-neutral-500">Netto</dt>
          <dd className="text-right tabular-nums">{formatMoney(r.summeNetto, cur)}</dd>
          <dt className="text-neutral-500">MwSt{r.mwstSatz ? ` (${Number(r.mwstSatz)} %)` : ""}</dt>
          <dd className="text-right tabular-nums">{formatMoney(r.summeMwst, cur)}</dd>
          <dt className="font-semibold">Brutto</dt>
          <dd className="text-right font-semibold tabular-nums">{formatMoney(r.summeBrutto, cur)}</dd>
          <dt className="text-neutral-500">Rechnungsbetrag</dt>
          <dd className="text-right tabular-nums">{formatMoney(r.rechnungsbetrag, cur)}</dd>
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={r.nummer ?? `${art} (Entwurf)`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{art}</Badge>
            <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>
              {RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}
            </Badge>
            {r.rechnungsdatum ? <span>{formatDate(r.rechnungsdatum)}</span> : null}
            {kdName ? <span>· {kdName}</span> : null}
            {data.referenz ? (
              <Link href={`/rechnungen/${data.referenz.id}`} className="text-xs text-blue-700 hover:underline">
                → zu Rechnung {data.referenz.nummer}
              </Link>
            ) : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/rechnungen" className={buttonClasses("outline")}>Zurück</Link>
            {r.erechnungAssetId ? (
              <>
                <a href={`/rechnungen/${id}/dokument`} target="_blank" rel="noreferrer" className={buttonClasses("outline")} title="Archivierte E-Rechnung (ZUGFeRD)">PDF</a>
                <Link href={`/rechnungen/${id}/mail`} className={buttonClasses()}>Per E-Mail versenden</Link>
              </>
            ) : (
              <a href={`/druck/rechnung/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>
                {entwurf ? "Vorschau" : "Ansicht"}
              </a>
            )}
          </div>
        }
      />

      {mail === "ok" ? (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          E-Mail wurde versendet (Protokoll unter <Link href="/mailversand" className="underline">Mailversand</Link>).
        </div>
      ) : null}

      {entwurf ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm text-muted">
              <b className="text-ink">Entwurf</b> — frei änderbar, noch ohne Nummer. 1. Vorschau prüfen · 2. <b className="text-ink">Buchen</b>
              {" "}(Nummer, Datum, E-Rechnung, Sperre) · 3. per E-Mail versenden
            </span>
            <BuchenButtons id={id} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted">
          <div>
            <b className="text-ink">Gebucht</b>
            {r.gebuchtAm ? <> am {formatDateTime(r.gebuchtAm)}</> : " (Altbestand aus Ninox)"} — der Beleg ist gesperrt.
            {r.belegart === "RECHNUNG" ? " Korrekturen nur über Storno oder Rechnungskorrektur." : null}
          </div>
          {korrigierbar ? <KorrekturButtons id={id} /> : null}
        </div>
      )}

      {data.folgebelege.length > 0 ? (
        <div className="rounded-md border border-line px-3 py-2 text-sm">
          <span className="text-muted">Folgebelege: </span>
          {data.folgebelege.map((f, i) => (
            <span key={f.id}>
              {i > 0 ? " · " : ""}
              <Link href={`/rechnungen/${f.id}`} className="text-blue-700 hover:underline">
                {RG_BELEGART_LABEL[f.belegart as RgBelegart]} {f.nummer ?? "(Entwurf)"}
              </Link>
            </span>
          ))}
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
                  key={r.updatedAt.toISOString()}
                  id={id}
                  entwurf={entwurf}
                  rechnungsdatum={r.rechnungsdatum}
                  lieferdatum={r.lieferdatum}
                  reportMonat={r.reportMonat}
                  bemerkungRechnung={r.bemerkungRechnung}
                  gebuchtBeimSteuerbuero={r.gebuchtBeimSteuerbuero}
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
                {!entwurf && r.zahlungsbedingungText ? (
                  <div className="pt-1 text-xs text-muted">Zahlungsbedingung: {r.zahlungsbedingungText}</div>
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
                  gesperrt={!entwurf}
                />
              </CardContent>
            </Card>
            {summen}
          </div>
        </div>
      ) : null}

      {active === "positionen" ? (
        <div className="space-y-5">
        {!entwurf ? (
          <Card><CardContent className="space-y-2 py-4 text-sm">
            <p className="text-muted">Positionen gesperrt (gebucht).</p>
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
              gesamtrabattAktiv: r.gesamtrabattAktiv,
              gesamtrabattProzent: r.gesamtrabattProzent,
              gesamtrabattWert: r.gesamtrabattWert,
              versandkosten: r.versandkosten,
              versandBezeichnung: r.versandBezeichnung,
            }}
            waehrung={r.kdWaehrung}
            vertriebsweg={r.kdVertriebsweg}
            canGenerate={!!r.auftragId && r.belegart === "RECHNUNG"}
            generateLabel="Offene Positionen aus Auftrag einlesen"
            generateConfirm="Alle Positionen dieses Entwurfs durch die noch offenen (nicht berechneten) Positionen des Auftrags ersetzen?"
            actions={{
              generate: r.auftragId && r.belegart === "RECHNUNG" ? positionenAusAuftragAction : undefined,
              deleteAll: deleteAllePositionenAction,
              add: addPositionAction,
              update: updatePositionAction,
              remove: deletePositionAction,
              versand: setVersandAction,
            }}
          />
        )}
        <div className="ml-auto max-w-md">{summen}</div>
        </div>
      ) : null}

      {active === "zahlung" ? (
        entwurf ? (
          <Card><CardContent className="py-4 text-sm text-muted">Zahlungen werden nach dem Buchen erfasst.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Zahlung (manuell erfasst)</CardTitle></CardHeader>
            <CardContent>
              <ZahlungForm
                id={id}
                zahlungsdatum={r.zahlungsdatum}
                zahlbetrag={r.zahlbetrag}
                zahlungAnBank={r.zahlungAnBank}
                zahlungsstatus={r.zahlungsstatus}
                rechnungsbetrag={r.rechnungsbetrag}
                waehrung={cur}
              />
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}
