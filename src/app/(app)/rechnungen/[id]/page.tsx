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
import { listAbzuege } from "@/lib/domain/anzahlung";
import { rechnungVerlauf } from "@/lib/domain/rechnung-verlauf";
import { rechnungsFamilien } from "@/lib/domain/rechnung-familie";
import { getRechnung, listRechnungPositionen } from "@/lib/domain/rechnung";
import { formatDate, formatDateTime, formatMoney, heuteBerlin } from "@/lib/utils";
import { letzteMahnung } from "@/lib/domain/mahnung";
import { AnhangCard } from "../../_components/anhang-card";
import { PositionenPanel } from "../../_components/positionen-panel";
import {
  addPositionAction, setVersandAction, deleteAllePositionenAction, deletePositionAction, positionenAusAuftragAction,
  updatePositionAction,
} from "../actions";
import { Abzuege } from "../abzuege";
import { Verlauf } from "../verlauf";
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
  const familie = (await rechnungsFamilien([r.id])).get(r.id) ?? [];
  const kdName = r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || null;
  const cur = r.kdWaehrung === "USD" ? "USD" : "EUR";
  const entwurf = r.status === "ENTWURF";
  const art = RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart;
  const korrigierbar = (r.belegart === "RECHNUNG" || r.belegart === "ANZAHLUNGSRECHNUNG")
    && (r.status === "GEBUCHT" || r.status === "BEZAHLT");

  const abzuege = await listAbzuege(id);
  const istEndrechnung = r.belegart === "RECHNUNG" && !!r.auftragId;
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
          {abzuege.map((a) => (
            <div key={a.id} className="contents">
              <dt className="text-neutral-500">abzgl. Anzahlung {a.nummer}</dt>
              <dd className="text-right tabular-nums">− {formatMoney(a.brutto, cur)}</dd>
            </div>
          ))}
          <dt className={abzuege.length ? "font-semibold" : "text-neutral-500"}>{abzuege.length ? "Noch zu zahlen" : "Rechnungsbetrag"}</dt>
          <dd className={"text-right tabular-nums" + (abzuege.length ? " font-semibold" : "")}>{formatMoney(r.rechnungsbetrag, cur)}</dd>
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
              <Link href={`/rechnungen/${data.referenz.id}`} className="text-blue-700 hover:underline font-semibold text-sm">
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
                {r.zahlbetrag && r.zahlungsdatum ? (
                  <a href={`/rechnungen/${id}/quittung`} target="_blank" rel="noreferrer" className={buttonClasses("outline")} title="Zahlungsbestätigung (Quittung) als PDF">
                    Zahlungsbestätigung
                  </a>
                ) : null}
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
          {korrigierbar ? <KorrekturButtons id={id} nurStorno={r.belegart === "ANZAHLUNGSRECHNUNG"} /> : null}
        </div>
      )}

      {data.folgebelege.length > 0 ? (
        <div className="rounded-md border border-line px-3 py-2 text-sm">
          <span className="text-muted">Folgebelege: </span>
          {data.folgebelege.map((f, i) => (
            <span key={f.id}>
              {i > 0 ? " · " : ""}
              <Link href={`/rechnungen/${f.id}`} className="text-blue-700 hover:underline font-semibold text-sm">
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
                  statusSlot={<RechnungStatusInfo id={id} status={r.status} belegart={r.belegart} rechnungsdatum={r.rechnungsdatum} zahlungsdatum={r.zahlungsdatum} />}
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
              <CardContent className="grid gap-4 text-sm md:grid-cols-[1fr_2fr]">
               <div className="space-y-1">
                {data.auftragInfo ? (
                  <>
                    <div>
                      Auftrag:{" "}
                      <Link href={`/auftraege/${data.auftragInfo.id}`} className="font-mono text-blue-700 hover:underline font-semibold text-[13px]">
                        {data.auftragInfo.nummer}
                      </Link>
                    </div>
                    {data.auftragInfo.modellName ? <div className="text-neutral-500">{data.auftragInfo.modellName}</div> : null}
                    {data.auftragInfo.serNr ? <div className="text-neutral-500">Ser# {data.auftragInfo.serNr}</div> : null}
                  </>
                ) : <span className="text-neutral-400">Ohne Auftrag (Ad-hoc-Rechnung für Kleinteile / Ersatzteile).</span>}
                {r.kundeId ? (
                  <Link href={`/adressen/${r.kundeId}`} className="inline-block text-blue-700 hover:underline font-semibold text-sm">
                    → Kundendatensatz
                  </Link>
                ) : null}
                {!entwurf && r.zahlungsbedingungText ? (
                  <div className="pt-1 text-xs text-muted">Zahlungsbedingung: {r.zahlungsbedingungText}</div>
                ) : null}
               </div>
               <div className="space-y-1 md:border-l md:border-line md:pl-4">
                <div className="text-xs font-medium text-muted">Vorgangsfamilie</div>
                {familie.length ? (
                  <ul className="space-y-0.5">
                    {familie.map((g) => {
                      const [nr, ...rest] = g.text.split(" · ");
                      const ich = g.id === r.id;
                      return (
                        <li key={g.id} className={ich ? "font-semibold" : ""}>
                          {ich ? (
                            <span className="font-mono text-[13px]">▸ {nr}</span>
                          ) : (
                            <Link href={`/rechnungen/${g.id}`} className="font-mono text-[13px] text-blue-700 hover:underline">{nr}</Link>
                          )}
                          <span className="text-xs text-muted"> · {rest.join(" · ")}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : <span className="text-xs text-neutral-400">Keine verbundenen Belege.</span>}
               </div>
              </CardContent>
            </Card>
            {istEndrechnung || abzuege.length ? (
              <Card>
                <CardHeader><CardTitle>Anzahlungen ({abzuege.length})</CardTitle></CardHeader>
                <CardContent>
                  <Abzuege rechnungId={id} rows={abzuege} entwurf={entwurf} cur={cur} />
                </CardContent>
              </Card>
            ) : null}
            {r.anzahlungBeruecksichtigen ? (
              <Card>
                <CardHeader><CardTitle>Anzahlung (Altbestand, manuell)</CardTitle></CardHeader>
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
            ) : null}
            {summen}
            <Card>
              <CardHeader><CardTitle>Verlauf</CardTitle></CardHeader>
              <CardContent>
                <Verlauf ereignisse={await rechnungVerlauf(id)} />
              </CardContent>
            </Card>
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

/** Statt Report-Monat: Status; bei unbezahlten Rechnungen offene Tage, Mahnstufe und „Mahnung senden“. */
async function RechnungStatusInfo({ id, status, belegart, rechnungsdatum, zahlungsdatum }: {
  id: string; status: string; belegart: string; rechnungsdatum: string | null; zahlungsdatum: string | null;
}) {
  const unbezahlt = (status === "GEBUCHT" || status === "OFFEN") && !zahlungsdatum && !!rechnungsdatum
    && (belegart === "RECHNUNG" || belegart === "ANZAHLUNGSRECHNUNG");
  const m = unbezahlt ? await letzteMahnung(id) : null;
  const tage = rechnungsdatum
    ? Math.round((Date.parse(heuteBerlin()) - Date.parse(rechnungsdatum)) / 86_400_000)
    : null;
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-ink/80">Status</div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={RG_STATUS_TONE[status as RgStatus] ?? "neutral"}>{RG_STATUS_LABEL[status as RgStatus] ?? status}</Badge>
        {m?.stufe ? <Badge tone={m.stufe === 3 ? "red" : "amber"}>Mahnstufe {m.stufe}</Badge> : null}
      </div>
      {unbezahlt ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">seit <b className="text-ink">{tage}</b> Tagen offen</span>
          {m && m.stufe < 3 ? (
            <Link href={`/rechnungen/${id}/mail?mahnung=1`} className={buttonClasses("outline", "sm")}>
              Mahnung senden{m.stufe ? ` (Stufe ${m.stufe + 1})` : ""}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
