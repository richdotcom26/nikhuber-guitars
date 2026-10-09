import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isDomainError } from "@/lib/domain/errors";
import { getVerleih, verleihGitarren } from "@/lib/domain/verleih";
import { formatDate, formatDateTime, heuteBerlin } from "@/lib/utils";
import { VERLEIH_STATUS_LABEL, VERLEIH_STATUS_TON } from "@/lib/verleih-shared";
import { DeleteVerleih, DokLink, VereinbarungButton, VerleihMail, ZurueckForm } from "../verleih-aktionen";
import { VerleihForm } from "../verleih-form";

export default async function VerleihDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getVerleih>>;
  try {
    data = await getVerleih(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { verleih: v, gitarre, kunde, kundeName, status } = data;
  const gitarren = await verleihGitarren();
  const titel = `${gitarre?.modell ?? "Gitarre"} #${gitarre?.seriennummer ?? "–"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={titel}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={VERLEIH_STATUS_TON[status]}>{VERLEIH_STATUS_LABEL[status]}</Badge>
            <span>an</span>
            <Link href={`/adressen/${v.kundeId}`} className="text-sm font-semibold text-blue-700 hover:underline">{kundeName}</Link>
            {v.verfuegbarBis ? <span>· zur Verfügung bis {formatDate(v.verfuegbarBis)}</span> : null}
            <span>· Auftrag</span>
            <Link href={`/auftraege/${v.auftragId}`} className="font-mono text-[13px] font-semibold text-blue-700 hover:underline">{gitarre?.nummer}</Link>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/verleih" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteVerleih id={v.id} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader><CardTitle>Verleih</CardTitle></CardHeader>
          <CardContent>
            <VerleihForm
              key={String(v.updatedAt)}
              kundeName={kundeName}
              gitarren={gitarren.map((g) => ({
                id: g.id, label: `${g.modell ?? "–"} #${g.seriennummer ?? "–"} (${g.nummer})`, wert: g.umsatzerwartung,
              }))}
              values={{
                id: v.id, auftragId: v.auftragId, kundeId: v.kundeId, versendetAm: v.versendetAm,
                verfuegbarBis: v.verfuegbarBis, zurueckAm: v.zurueckAm, zweck: v.zweck, zubehoer: v.zubehoer,
                wert: v.wert, bemerkung: v.bemerkung,
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Rückgabe</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {v.zurueckAm ? (
                <p className="text-green-700">Zurück am {formatDate(v.zurueckAm)}.</p>
              ) : (
                <>
                  <ZurueckForm id={v.id} heute={heuteBerlin()} />
                  <div className="border-t border-line pt-3">
                    <VerleihMail
                      id={v.id}
                      art="ERINNERUNG"
                      label="Erinnerung senden …"
                      disabled={!v.versendetAm}
                    />
                    <p className="mt-1 text-xs text-muted">
                      {v.letzteErinnerungAm
                        ? `Zuletzt erinnert: ${formatDateTime(v.letzteErinnerungAm)} (${v.erinnerungen}×)`
                        : "Noch keine Erinnerung gesendet."}
                      {!kunde?.email ? " Beim Kontakt fehlt die E-Mail-Adresse." : ""}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Übergabevereinbarung</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {v.unterschriebenAm ? (
                <div className="rounded-md bg-green-50 px-3 py-2 text-green-800">
                  Unterschrieben von <b>{v.unterschriebenName}</b> am {formatDateTime(v.unterschriebenAm)}
                  {v.unterschriftIp ? <span className="block text-xs">IP {v.unterschriftIp}</span> : null}
                </div>
              ) : v.unterschriftAngefordertAm ? (
                <p className="text-amber-700">Zur Unterschrift gesendet am {formatDateTime(v.unterschriftAngefordertAm)} — noch nicht unterschrieben.</p>
              ) : (
                <p className="text-muted">Noch nicht versendet.</p>
              )}
              <div className="space-y-1">
                {v.unterschriebenAnhangId ? <DokLink anhangId={v.unterschriebenAnhangId} label="Unterschriebene Vereinbarung (PDF)" /> : null}
                {v.vereinbarungAnhangId ? <DokLink anhangId={v.vereinbarungAnhangId} label="Vereinbarung ohne Unterschrift (PDF)" /> : null}
              </div>
              {!v.unterschriebenAm ? (
                <div className="flex flex-wrap items-start gap-2 border-t border-line pt-3">
                  <VereinbarungButton id={v.id} vorhanden={!!v.vereinbarungAnhangId} />
                  <VerleihMail
                    id={v.id}
                    art="VEREINBARUNG"
                    label={v.unterschriftAngefordertAm ? "Erneut zur Unterschrift senden …" : "Zur Unterschrift senden …"}
                    disabled={!v.verfuegbarBis}
                  />
                </div>
              ) : null}
              {!v.verfuegbarBis ? <p className="text-xs text-muted">Dafür zuerst „Zur Verfügung bis“ eintragen.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
