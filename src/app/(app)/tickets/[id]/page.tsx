import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/domain/context";
import { isDomainError } from "@/lib/domain/errors";
import { aktiveBenutzer, getTicket } from "@/lib/domain/ticket";
import { AnhangCard } from "../../_components/anhang-card";
import {
  formatAufwand, TICKET_STATUS_LABEL, TICKET_STATUS_TON, TICKET_TYP_LABEL,
  type TicketStatus, type TicketTyp,
} from "@/lib/ticket-shared";
import { formatDateTime } from "@/lib/utils";
import { DeleteTicketButton } from "../delete-button";
import { KommentarForm } from "../kommentar-form";
import { StatusForm } from "../status-form";
import { TicketForm } from "../ticket-form";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let t: Awaited<ReturnType<typeof getTicket>>;
  try {
    t = await getTicket(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const [benutzer, user] = await Promise.all([aktiveBenutzer(), requireUser()]);
  const statusTon = TICKET_STATUS_TON[t.status as TicketStatus] ?? "neutral";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.titel}
        count={TICKET_TYP_LABEL[t.typ as TicketTyp] ?? t.typ}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/tickets" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteTicketButton id={t.id} />
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Übersicht</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <Badge tone={statusTon}>{TICKET_STATUS_LABEL[t.status as TicketStatus] ?? t.status}</Badge>
            </span>
            <StatusForm id={t.id} status={t.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            <div><dt className="text-xs text-muted">Erstellt von</dt><dd>{t.erstelltVonName ?? "–"}</dd></div>
            <div><dt className="text-xs text-muted">Bearbeiter</dt><dd>{t.zugewiesenAnName ?? "–"}</dd></div>
            <div><dt className="text-xs text-muted">Aufwand</dt><dd className="tabular-nums">{formatAufwand(t.aufwandMinuten)}</dd></div>
            <div><dt className="text-xs text-muted">Erledigt</dt><dd>{t.erledigtAm ? formatDateTime(t.erledigtAm) : "–"}</dd></div>
          </dl>
          {t.beschreibung ? (
            <div>
              <dt className="text-xs text-muted">Beschreibung</dt>
              <dd className="mt-1 whitespace-pre-wrap">{t.beschreibung}</dd>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Screenshots & Anhänge</CardTitle></CardHeader>
        <CardContent>
          <AnhangCard traeger="ticket" id={t.id} revalidate={`/tickets/${t.id}`} paste />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Verlauf ({t.kommentare.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {t.kommentare.length === 0 ? (
            <p className="text-sm text-neutral-400">Noch keine Kommentare.</p>
          ) : (
            <ul className="space-y-3">
              {t.kommentare.map((k) => (
                <li key={k.id} className="rounded-lg border border-line bg-white p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-ink">{k.autorName ?? "?"}</span>
                    <span>{formatDateTime(k.createdAt)}</span>
                    {k.istRueckfrage ? <Badge tone="amber">Rückfrage</Badge> : null}
                  </div>
                  <p className="whitespace-pre-wrap">{k.text}</p>
                </li>
              ))}
            </ul>
          )}
          <KommentarForm id={t.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bearbeiten</CardTitle></CardHeader>
        <CardContent>
          <TicketForm
            mode="edit"
            benutzer={benutzer}
            currentUserId={user.id}
            values={{
              id: t.id,
              typ: t.typ,
              titel: t.titel,
              beschreibung: t.beschreibung,
              prioritaet: t.prioritaet,
              zugewiesenAnId: t.zugewiesenAnId,
              aufwandMinuten: t.aufwandMinuten,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
