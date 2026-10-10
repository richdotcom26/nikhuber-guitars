import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANGEBOT_STATUS_LABEL, ANGEBOT_STATUS_TONE, type AngebotStatus } from "@/lib/angebot-shared";
import { AUFTRAG_STATUS_LABEL, AUFTRAG_STATUS_TONE, type AuftragStatus } from "@/lib/auftrag-shared";
import { kundeUebersicht } from "@/lib/domain/kunde-uebersicht";
import {
  RG_BELEGART_LABEL, RG_STATUS_LABEL, RG_STATUS_TONE, type RgBelegart, type RgStatus,
} from "@/lib/rechnung-shared";
import { formatDate, formatMoney } from "@/lib/utils";

const TENDENZ: Record<string, { text: string; tone: "green" | "red" | "neutral" | "blue" | "amber" }> = {
  steigend: { text: "↗ steigend", tone: "green" },
  fallend: { text: "↘ fallend", tone: "red" },
  gleich: { text: "→ gleichbleibend", tone: "blue" },
  neu: { text: "★ neu aktiv", tone: "green" },
  inaktiv: { text: "– inaktiv (4 Jahre ohne Umsatz)", tone: "neutral" },
};

const wg = (w: string | null) => (w === "USD" ? "USD" : "EUR");

/** Rechte Spalte der Adresse: Statistik + alle Angebote, Aufträge, Rechnungen des Kunden. */
export async function KundeUebersicht({ kundeId }: { kundeId: string }) {
  const { angebote, auftraege, rechnungen, statistik: s } = await kundeUebersicht(kundeId);
  const max = Math.max(1, ...s.umsatzJahre.map((x) => x.eur));
  const t = TENDENZ[s.tendenz];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle>Statistik</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kennzahl label="Umsatz gesamt (netto)" wert={formatMoney(s.gesamt, "EUR")} />
            <Kennzahl label="Tendenz" wert={<Badge tone={t.tone}>{t.text}</Badge>} hinweis="letzte 2 Jahre vs. 2 Jahre davor" />
            <Kennzahl
              label="Ø Zahlungsdauer"
              wert={s.zahlungsdauer != null ? `${s.zahlungsdauer} Tage` : "–"}
              hinweis={s.zahlungenGezaehlt ? `aus ${s.zahlungenGezaehlt} bezahlten Rechnungen` : "keine Zahlungsdaten"}
            />
            <Kennzahl
              label="Letzte Aktivität"
              wert={formatDate(s.letzteAktivitaet)}
              hinweis={s.kundeSeit ? `Kunde seit ${s.kundeSeit.slice(0, 4)}` : undefined}
            />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span>{angebote.length} Angebote{s.angeboteZuAuftrag != null ? ` (${s.angeboteZuAuftrag} % zu Auftrag)` : ""}</span>
            <span>{auftraege.length} Aufträge</span>
            <span>{rechnungen.length} Rechnungen</span>
            {s.offeneRechnungen ? <span className="text-amber-700">{s.offeneRechnungen} offen</span> : null}
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-muted">Umsatz je Jahr (netto, EUR)</div>
            <div className="space-y-1">
              {s.umsatzJahre.slice().reverse().map((x) => (
                <div key={x.jahr} className="flex items-center gap-2">
                  <span className="w-10 tabular-nums text-muted">{x.jahr}</span>
                  <div className="h-4 flex-1 rounded bg-neutral-100">
                    <div className="h-4 rounded bg-brand/70" style={{ width: `${Math.max(x.eur > 0 ? 1 : 0, (x.eur / max) * 100)}%` }} />
                  </div>
                  <span className="w-28 text-right tabular-nums">{x.eur ? formatMoney(x.eur, "EUR") : "–"}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted">
              Gebuchte Rechnungen ohne Anzahlungsrechnungen, Stornos abgezogen; USD umgerechnet zum aktuellen Kurs.
            </p>
          </div>
        </CardContent>
      </Card>

      <Liste titel={`Angebote (${angebote.length})`} leer="Keine Angebote." kopf={["Nr", "Datum", "Modell", "Status", "Netto"]}>
        {angebote.map((a) => (
          <tr key={a.id}>
            <Td><Link href={`/angebote/${a.id}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">{a.nummer}</Link></Td>
            <Td muted>{formatDate(a.datum)}</Td>
            <Td>{a.modell ?? "–"}</Td>
            <Td><Badge tone={ANGEBOT_STATUS_TONE[a.status as AngebotStatus] ?? "neutral"}>{ANGEBOT_STATUS_LABEL[a.status as AngebotStatus] ?? a.status}</Badge></Td>
            <Td right>{a.netto != null ? formatMoney(a.netto, wg(a.waehrung)) : "–"}</Td>
          </tr>
        ))}
      </Liste>

      <Liste titel={`Aufträge (${auftraege.length})`} leer="Keine Aufträge." kopf={["Nr", "Datum", "Modell", "Status", "Umsatz"]}>
        {auftraege.map((a) => (
          <tr key={a.id}>
            <Td><Link href={`/auftraege/${a.id}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">{a.nummer}</Link></Td>
            <Td muted>{formatDate(a.datum)}</Td>
            <Td>
              {a.modell ?? "–"}
              {a.serNr ? <span className="ml-1.5 text-[11px] text-muted">#{a.serNr}</span> : null}
            </Td>
            <Td><Badge tone={AUFTRAG_STATUS_TONE[a.status as AuftragStatus] ?? "neutral"}>{AUFTRAG_STATUS_LABEL[a.status as AuftragStatus] ?? a.status}</Badge></Td>
            <Td right>
              {a.umsatz != null && Number(a.umsatz) ? formatMoney(a.umsatz, "EUR")
                : a.berechnet != null ? <span title="abgerechnet (Rechnungen, netto)">{formatMoney(a.berechnet, wg(a.waehrung))}</span>
                  : "–"}
            </Td>
          </tr>
        ))}
      </Liste>

      <Liste titel={`Rechnungen (${rechnungen.length})`} leer="Keine Rechnungen." kopf={["Nr", "Datum", "Art", "Status", "Netto", "Bezahlt"]}>
        {rechnungen.map((r) => (
          <tr key={r.id} title={r.familie ? `Vorgangsfamilie:\n${r.familie.join("\n")}` : undefined}>
            <Td>
              <Link href={`/rechnungen/${r.id}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">
                {r.nummer ?? <span className="font-sans italic text-muted">Entwurf</span>}
              </Link>
            </Td>
            <Td muted>{formatDate(r.datum)}</Td>
            <Td>
              <span
                className="cursor-help underline decoration-dotted decoration-neutral-300 underline-offset-2"
                title={[
                  r.modell ? `Modell: ${r.modell}` : "Modell: –",
                  r.familie ? `\nVorgangsfamilie:\n${r.familie.join("\n")}` : null,
                ].filter(Boolean).join("\n")}
              >
                {RG_BELEGART_LABEL[r.belegart as RgBelegart] ?? r.belegart}
              </span>
              {r.serNr ? <span className="ml-1.5 text-[11px] text-muted">#{r.serNr}</span> : null}
            </Td>
            <Td><Badge tone={RG_STATUS_TONE[r.status as RgStatus] ?? "neutral"}>{RG_STATUS_LABEL[r.status as RgStatus] ?? r.status}</Badge></Td>
            <Td right>{r.netto != null ? formatMoney(r.netto, wg(r.waehrung)) : "–"}</Td>
            <Td muted>{r.zahlungsdatum ? formatDate(r.zahlungsdatum) : "–"}</Td>
          </tr>
        ))}
      </Liste>
    </div>
  );
}

function Kennzahl({ label, wert, hinweis }: { label: string; wert: React.ReactNode; hinweis?: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-semibold text-navy">{wert}</div>
      {hinweis ? <div className="text-[10px] text-muted">{hinweis}</div> : null}
    </div>
  );
}

function Liste({ titel, leer, kopf, children }: { titel: string; leer: string; kopf: string[]; children: React.ReactNode[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{titel}</CardTitle></CardHeader>
      <CardContent>
        {children.length === 0 ? <p className="text-sm text-neutral-400">{leer}</p> : (
          <div className="max-h-80 overflow-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-line bg-card-head text-left text-[11px] font-semibold uppercase tracking-wide text-navy">
                <tr>{kopf.map((k, i) => <th key={k} className={"px-2 py-1.5 " + (i === 4 ? "text-right" : "")}>{k}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">{children}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Td({ children, muted, right }: { children: React.ReactNode; muted?: boolean; right?: boolean }) {
  return (
    <td className={"whitespace-nowrap px-2 py-1 " + (muted ? "text-muted " : "") + (right ? "text-right tabular-nums" : "")}>
      {children}
    </td>
  );
}
