import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  AUFTRAGSART_LABEL, BESONDERES, fortschrittFarbe,
} from "@/lib/auftrag-shared";
import { listArtikel } from "@/lib/domain/artikel";
import { auftragAngezahlt, auftragHatRechnung, auftragLoeschHindernisse, auftragPositionCount, getAuftrag, kundenPickerListe } from "@/lib/domain/auftrag";
import { BelegVerwalten, VerwerfenHinweis } from "../../_components/beleg-verwalten";
import { archivAuftragAction, deleteAuftragAction } from "../actions";
import { listArbeitsschritte } from "@/lib/domain/arbeitsschritt";
import { bepreisbarePositionen, listPositionen } from "@/lib/domain/belege";
import { kundeKurz } from "@/lib/adressen-shared";
import { isDomainError } from "@/lib/domain/errors";
import { getAuftragSeriennummer } from "@/lib/domain/seriennummer";
import { candidatesBySlot, getSpecs } from "@/lib/domain/specs";
import { formatDate, formatMoney } from "@/lib/utils";
import { abrechnungsStand } from "@/lib/domain/abrechnung";
import { getFirmaSetting } from "@/lib/domain/stammdaten";
import { listHolzpositionen, nksStand } from "@/lib/domain/nks";
import { rechnungenZuAuftrag } from "@/lib/domain/rechnung";
import {
  RG_BELEGART_LABEL, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import { SeriennummerPanel } from "../seriennummer-panel";
import { AnhangCard } from "../../_components/anhang-card";
import { KundeBlock } from "../../_components/kunde-block";
import { PositionenPanel } from "../../_components/positionen-panel";
import { SpecsEditor } from "../../specs-editor";
import { VorlagePicker } from "../../_components/vorlage-picker";
import {
  addPortoAction, addPositionAction, setVersandAction, applyVorlageAction, deleteAllePositionenAction, deletePositionAction,
  generatePositionenAction, setGesamtrabattAction, updatePositionAction,
} from "../actions";
import { ArbeitsschrittePanel } from "../arbeitsschritte-panel";
import { AnzahlungForm } from "../anzahlung-form";
import { CreateRechnungButton } from "../create-rechnung-button";
import { AbPanel } from "../ab-panel";
import { AuftragVerlauf } from "../auftrag-verlauf";
import { KopfForm } from "../kopf-form";
import { NksDokument } from "../nks-dokumente";
import { SetKundeButton } from "../set-kunde-form";
import type { KundeMerkmale } from "../../_components/kunde-wechsel-button";
import { StatusChanger } from "../status-changer";
import { StatusBemerkung } from "../status-bemerkung";

const TABS: readonly TabItem[] = [
  { key: "auftrag", label: "Auftrag" },
  { key: "details", label: "Details (Specs)" },
  { key: "positionen", label: "Positionen" },
  { key: "arbeitsschritte", label: "Arbeitsschritte" },
  { key: "office", label: "Arbeitsschritte Office" },
  { key: "nks", label: "NKS" },
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
  const hatRechnung = await auftragHatRechnung(id);
  const loeschHindernisse = await auftragLoeschHindernisse(id);
  const leer = !a.kundeId && loeschHindernisse.length === 0 && (await auftragPositionCount(id)) === 0;
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
            {(() => {
              const b = BESONDERES.find((x) => x.value === a.besonderes);
              return b ? (
                <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: b.bg, color: b.fg }}>
                  <span style={{ color: b.symbolFarbe }}>{b.symbol}</span> {b.value}
                </span>
              ) : null;
            })()}
            <span
              className="rounded px-1.5 py-0.5 text-xs tabular-nums"
              style={{ background: fortschrittFarbe(a.fortschrittProzent) }}
            >
              {a.fortschrittProzent == null ? "–" : `${a.fortschrittProzent}%`}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/auftraege" className={buttonClasses("outline")}>Zurück</Link>
            <a href={`/druck/auftrag/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>Vorschau</a>
            <a href={`/druck/auftrag/${id}/pdf`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>AB PDF</a>
            <a href={`/druck/lieferschein/${id}`} target="_blank" rel="noreferrer" className={buttonClasses("outline")}>Lieferschein</a>
            <BelegVerwalten id={id} nummer={a.nummer} art="Auftrag" archiviert={a.archiviert} hindernisse={loeschHindernisse} archivAction={archivAuftragAction} deleteAction={deleteAuftragAction} />
          </div>
        }
      />
      {leer ? <VerwerfenHinweis id={id} art="Auftrag" deleteAction={deleteAuftragAction} /> : null}
      {a.archiviert ? <p className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-muted">Archiviert – in der Auftragsliste ausgeblendet.</p> : null}
      <Tabs items={TABS} active={active} basePath={`/auftraege/${id}`} />

      {active === "auftrag" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Kunde</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {kdName ? (
                  <KundeBlock beleg={a} mailHref={`/auftraege/${id}/mail`} />
                ) : (
                  <p className="text-sm text-neutral-400">Kein Kunde gewählt.</p>
                )}
                {hatRechnung ? (
                  <p className="border-t border-neutral-100 pt-3 text-xs text-muted">
                    Kunde fest – zu diesem Auftrag gibt es bereits eine Rechnung.
                  </p>
                ) : (
                  <>
                    <form method="get" className="flex items-center gap-2 border-t border-neutral-100 pt-3">
                      <input type="hidden" name="tab" value="auftrag" />
                      <Input name="kundenSuche" defaultValue={kundenSuche ?? ""} placeholder="Kunde suchen …" className="h-8 w-56" />
                      <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
                    </form>
                    {kundenSuche ? <KundenTreffer auftragId={id} q={kundenSuche} bisher={a.kundeId ? { name: kundeKurz(a), region: a.kdRegion, waehrung: a.kdWaehrung, vertriebsweg: a.kdVertriebsweg, sprache: a.kdSprache } : null} /> : null}
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Auftragsbestätigung</CardTitle></CardHeader>
              <CardContent>
                <AbPanel
                  auftragId={id}
                  status={a.status}
                  stand={{
                    angefordertAm: a.abAngefordertAm,
                    unterschriebenAm: a.abUnterschriebenAm,
                    unterschriebenName: a.abUnterschriebenName,
                    unterschriftIp: a.abUnterschriftIp,
                    anhangId: a.abAnhangId,
                    unterschriebenAnhangId: a.abUnterschriebenAnhangId,
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Seriennummer</CardTitle></CardHeader>
              <CardContent><SeriennummerCard id={id} bauplandatum={a.bauplandatum} auftragsart={a.auftragsart} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dokumente &amp; Bilder</CardTitle></CardHeader>
              <CardContent>
                <AnhangCard traeger="auftrag" id={id} revalidate={`/auftraege/${id}`} rechnungFlag />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Status</CardTitle></CardHeader>
              <CardContent>
                <StatusChanger id={id} status={a.status} angezahlt={await auftragAngezahlt(id)} />
                <StatusBemerkung key={`sb:${a.statusBemerkung ?? ""}`} id={id} value={a.statusBemerkung ?? ""} />
              </CardContent>
            </Card>
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
                    lieferdatum: a.lieferdatum,
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Zeitstempel &amp; Verlauf</CardTitle></CardHeader>
              <CardContent><AuftragVerlauf id={id} /></CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {active === "details" ? <DetailsTab id={id} model={a} /> : null}

      {active === "positionen" ? (
        <PositionenPanel
          belegId={id}
          rows={(await Promise.all([listPositionen("auftrag", id), abrechnungsStand(id)])
            .then(([pos, stand]) => pos.map((p) => ({ p, b: stand.byId.get(p.id)?.berechnet ?? 0 }))))
            .map(({ p, b }) => ({
            hinweis: b > 0 ? `berechnet: ${b} von ${Number(p.anzahl)}` : null,
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
            gesamtrabattAktiv: a.gesamtrabattAktiv,
            gesamtrabattProzent: a.gesamtrabattProzent,
            gesamtrabattWert: a.gesamtrabattWert,
            versandkosten: a.versandkosten,
            versandBezeichnung: a.versandBezeichnung,
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
            porto: addPortoAction,
            versand: setVersandAction,
          }}
          gesamtrabatt={{
            aktiv: a.gesamtrabattAktiv,
            prozent: a.gesamtrabattProzent,
            wert: a.gesamtrabattWert,
            action: setGesamtrabattAction,
          }}
        />
      ) : null}

      {active === "arbeitsschritte" || active === "office" ? (
        <ArbeitsschrittePanel
          auftragId={id}
          bereich={active === "office" ? "OFFICE" : "WERKSTATT"}
          rows={(await listArbeitsschritte(id)).map((s) => ({
            id: s.id,
            status: s.status,
            erledigtAm: s.erledigtAm,
            erledigtVonName: s.erledigtVonName,
            maImport: s.maImport,
            bemerkungBearbeiter: s.bemerkungBearbeiter,
            wartenAuf: s.wartenAuf,
            dauerMinuten: s.dauerMinuten,
            vorratNr: s.vorratNr,
            workstep: s.workstep,
            reihenfolge: s.reihenfolge,
            typ: s.typ,
            farbe: s.farbe,
            isNext: s.isNext,
          }))}
        />
      ) : null}

      {active === "nks" ? <NksTab id={id} /> : null}

      {active === "rechnung" ? (
        <RechnungTab
          auftragId={id}
          auftragBrutto={a.summeBrutto == null ? null : Number(a.summeBrutto)}
          waehrung={a.kdWaehrung === "USD" ? "USD" : "EUR"}
          steuerpflichtig={!!a.kdSteuerpflichtig}
          hinweise={[
            ...(!a.kundeId ? ["Es ist kein Kunde gewählt."] : []),
            ...(!(Number(a.versandkosten) > 0) ? ["Es sind keine Versandkosten eingetragen."] : []),
            ...(a.auftragsart === "PRODUKTION" && !a.modellArtikelId ? ["Gitarren-Auftrag ohne Modell (Details → Modellvorlage)."] : []),
          ]}
        />
      ) : null}
    </div>
  );
}

async function KundenTreffer({ auftragId, q, bisher }: { auftragId: string; q: string; bisher: KundeMerkmale | null }) {
  const positionen = bisher ? await bepreisbarePositionen("auftrag", auftragId) : 0;
  const kunden = await kundenPickerListe(q, 15);
  if (kunden.length === 0) return <p className="text-xs text-neutral-400">Kein Treffer.</p>;
  return (
    <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
      {kunden.map((k) => {
        const name = k.firma || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";
        return (
          <li key={k.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span>{name} <span className="text-xs text-neutral-400">{k.ort ?? ""} · {k.kontaktart}</span></span>
            <SetKundeButton auftragId={auftragId} kundeId={k.id} neu={{ name, region: k.region, waehrung: k.waehrung, vertriebsweg: k.vertriebsweg, sprache: k.sprache }} alt={bisher} positionen={positionen} />
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
  const [rows, candidates, modelle] = await Promise.all([
    getSpecs("auftrag", id),
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
            hasVorlage={!!model.modellArtikelId}
            hasSpecs={rows.length > 0}
            currentModellId={model.modellArtikelId}
            modelle={modelle.rows.map((m) => ({
              id: m.id,
              name: m.nameBelege || m.nameLang || m.id,
              nameLang: m.nameLang,
            }))}
            action={applyVorlageAction}
          />
          <p className="mt-2 text-xs text-muted">
            Übernimmt die Standard-Ausstattung des gewählten Modells in die Specs — für Aufträge,
            die ohne vorheriges Angebot erfasst werden. Positionen danach im Positionen-Tab erzeugen.
          </p>
        </CardContent>
      </Card>
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

async function SeriennummerCard({
  id, bauplandatum, auftragsart,
}: {
  id: string;
  bauplandatum: string | null;
  auftragsart: string;
}) {
  const { seriennummer: sn } = await getAuftragSeriennummer(id);
  return (
    <SeriennummerPanel
      auftragId={id}
      serial={sn ? { anzeige: sn.anzeige, lfd: sn.lfd, manuell: sn.manuell, vergebenAm: sn.vergebenAm } : null}
      bauplandatum={bauplandatum}
      auftragsart={auftragsart}
    />
  );
}

/** Rechnungs-Tab: Abrechnungsstand + Rechnungen (Entwürfe, gebuchte Belege, Storno/Korrektur). */
async function RechnungTab({
  auftragId, auftragBrutto, waehrung, steuerpflichtig, hinweise,
}: {
  auftragId: string;
  auftragBrutto: number | null;
  waehrung: "EUR" | "USD";
  steuerpflichtig: boolean;
  /** Fehlende Angaben → Nachfrage vor dem Erstellen des Rechnungsentwurfs. */
  hinweise: string[];
}) {
  const [stand, rechnungen, fs] = await Promise.all([
    abrechnungsStand(auftragId), rechnungenZuAuftrag(auftragId), getFirmaSetting(),
  ]);
  const offen = stand.positionen.filter((p) => p.offen > 0).length;
  const hatEntwurf = rechnungen.some((r) => r.status === "ENTWURF" && r.belegart === "RECHNUNG");
  return (
    <Card>
      <CardHeader><CardTitle>Rechnungen ({rechnungen.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className={stand.vollstaendig ? "text-green-700" : "text-muted"}>
          {stand.vollstaendig
            ? "Vollständig berechnet — die Positionen des Auftrags sind gesperrt."
            : stand.teilweise
              ? `Teilweise berechnet — ${offen} von ${stand.positionen.length} Positionen noch offen.`
              : "Noch nicht berechnet."}
        </p>
        {!stand.vollstaendig ? (
          <CreateRechnungButton
            auftragId={auftragId}
            label={hatEntwurf ? "Rechnungsentwurf öffnen" : "Rechnungsentwurf erstellen"}
            hinweise={hatEntwurf ? [] : hinweise}
          />
        ) : null}
        {!stand.vollstaendig ? (
          <AnzahlungForm
            auftragId={auftragId}
            auftragBrutto={auftragBrutto}
            waehrung={waehrung}
            mwstSatz={steuerpflichtig ? Number(fs.mwstSatz) : 0}
          />
        ) : null}
        {rechnungen.length === 0 ? (
          <p className="text-neutral-400">Noch keine Rechnung.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-card-head text-left text-[11px] font-semibold uppercase tracking-wide text-navy">
                <tr>
                  <th className="px-3 py-2">RG-Nr</th>
                  <th className="px-3 py-2">Datum</th>
                  <th className="px-3 py-2">Art</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Netto</th>
                  <th className="px-3 py-2 text-right">Brutto</th>
                  <th className="px-3 py-2">Zahlung</th>
                  <th className="px-3 py-2 text-right">Zahlbetrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rechnungen.map((r) => {
                  const wg = r.kdWaehrung === "USD" ? "USD" : "EUR";
                  return (
                    <tr key={r.id} className="hover:bg-brand-soft/50">
                      <td className="px-3 py-1.5">
                        <Link href={`/rechnungen/${r.id}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">
                          {r.nummer ?? <span className="font-sans italic text-muted">Entwurf</span>}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-muted">{formatDate(r.rechnungsdatum)}</td>
                      <td className="px-3 py-1.5"><Badge>{RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}</Badge></td>
                      <td className="px-3 py-1.5">
                        <Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>{RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}</Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(r.netto, wg)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(r.brutto, wg)}</td>
                      <td className="px-3 py-1.5 text-muted">{r.zahlungsdatum ? formatDate(r.zahlungsdatum) : "–"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{r.zahlbetrag != null ? formatMoney(r.zahlbetrag, wg) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const fmtZahl = (n: number | null, stellen: number) =>
  n == null ? "–" : n.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/**
 * NKS („nerviger Kack-Scheiß"): Holz-Compliance — Lacey Act (USA), CITES (geschütztes Holz),
 * Ausfuhrantrag (außerhalb EU) + Holzpositionen aus den Specs (Artikeltyp „Holz / Fertigung").
 */
async function NksTab({ id }: { id: string }) {
  const [pos, stand] = await Promise.all([listHolzpositionen(id), nksStand(id)]);
  const cites = pos.filter((p) => p.cites);
  const sumVol = pos.reduce((s, p) => s + (p.volumenM3 ?? 0), 0);
  const sumGew = pos.reduce((s, p) => s + (p.gewichtKg ?? 0), 0);
  const sumCites = cites.reduce((s, p) => s + (p.gewichtKg ?? 0), 0);
  const SCHRITTE = [
    { nr: 93, label: "Cites", wann: "geschütztes Holz in den Specs" },
    { nr: 94, label: "Fish&Wildlife", wann: "Kunde in den USA" },
    { nr: 96, label: "Ausfuhrantrag", wann: "Kunde außerhalb der EU" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <NksDokument
          auftragId={id}
          art="LACEY"
          titel="Lacey Act (PPQ 505)"
          hinweis={stand.region === "USA" ? "Kunde in den USA — wird für die Einfuhr benötigt." : "Nur für Lieferungen in die USA nötig."}
          aktiv={pos.length > 0}
          dok={stand.lacey}
        />
        <NksDokument
          auftragId={id}
          art="CITES"
          titel="CITES-Antrag"
          hinweis={cites.length ? `${cites.length} Holzposition(en) mit geschütztem Holz.` : "Kein geschütztes Holz (CITES) im Auftrag."}
          aktiv={cites.length > 0}
          dok={stand.cites}
        />
        <Card>
          <CardHeader><CardTitle>Arbeitsschritte</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {SCHRITTE.map((x) => {
              const st = stand.schritte.find((y) => y.nr === x.nr);
              return (
                <div key={x.nr} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-mono text-xs text-muted">#{x.nr}</span> {x.label}
                    <span className="block text-xs text-muted">wenn {x.wann}</span>
                  </span>
                  {st ? (
                    <Badge tone={st.status === "ERLEDIGT" ? "green" : "amber"}>{st.status === "ERLEDIGT" ? "erledigt" : "offen"}</Badge>
                  ) : <span className="text-xs text-muted">nicht nötig</span>}
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted">
              Werden automatisch eingefügt bzw. entfernt (Kundenwahl, Specs, Status).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Holzpositionen ({pos.length})</CardTitle></CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <p className="text-sm text-muted">Keine Holzartikel in den Specs (Artikeltyp „Holz / Fertigung“).</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Artikelgruppe</TH>
                  <TH>Artikelname</TH>
                  <TH>CITES</TH>
                  <TH>Holz</TH>
                  <TH>Botanischer Name</TH>
                  <TH>Herkunft</TH>
                  <TH className="text-right">Volumen m³</TH>
                  <TH className="text-right">Gewicht kg</TH>
                  <TH>Nr</TH>
                </TR>
              </THead>
              <TBody>
                {pos.map((p) => (
                  <TR key={p.slotKey + p.artikelId} className={p.cites ? "bg-red-50" : ""}>
                    <TD>{p.artikelgruppe}</TD>
                    <TD>{p.name}</TD>
                    <TD>{p.cites ? <Badge tone="red">CITES</Badge> : null}</TD>
                    <TD>{p.holz ?? <span className="text-amber-700">fehlt</span>}</TD>
                    <TD className="italic">{p.botanischerName ?? "–"}</TD>
                    <TD>{p.herkunft ?? "–"}</TD>
                    <TD className="text-right tabular-nums" title={p.volumenKlasse ?? undefined}>
                      {p.volumenM3 == null ? <span className="text-amber-700">fehlt</span> : fmtZahl(p.volumenM3, 7)}
                    </TD>
                    <TD className="text-right tabular-nums">{fmtZahl(p.gewichtKg, 3)}</TD>
                    <TD>
                      <Link href={`/artikel/${p.artikelId}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">
                        {p.artikelNr ?? "–"}
                      </Link>
                    </TD>
                  </TR>
                ))}
                <TR className="font-semibold">
                  <TD colSpan={6} className="text-right text-muted">Summe</TD>
                  <TD className="text-right tabular-nums">{fmtZahl(sumVol, 7)}</TD>
                  <TD className="text-right tabular-nums">{fmtZahl(sumGew, 3)}</TD>
                  <TD />
                </TR>
                {cites.length ? (
                  <TR>
                    <TD colSpan={7} className="text-right text-muted">davon geschütztes Holz (CITES, Nettomasse)</TD>
                    <TD className="text-right tabular-nums text-red-700">{fmtZahl(sumCites, 3)}</TD>
                    <TD />
                  </TR>
                ) : null}
              </TBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted">
            Gewicht = Volumen des Bauteils („NKS Gewichte“) × Holzdichte der Holzart. Holzart, Volumen und
            „Geschütztes Holz (CITES)“ werden am Artikel gepflegt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

