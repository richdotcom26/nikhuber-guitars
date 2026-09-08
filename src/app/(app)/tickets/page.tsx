import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { listTickets } from "@/lib/domain/ticket";
import {
  formatAufwand, TICKET_PRIO_LABEL, TICKET_STATUS, TICKET_STATUS_LABEL, TICKET_STATUS_TON,
  TICKET_TYP, TICKET_TYP_LABEL, type TicketPrio, type TicketStatus, type TicketTyp,
} from "@/lib/ticket-shared";
import { formatDate } from "@/lib/utils";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; typ?: string; status?: string; mir?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const typ = sp.typ ?? "";
  const status = sp.status ?? "";
  const mir = sp.mir === "1";
  const page = Number(sp.page) || 1;

  const { rows, total, offen, pageCount } = await listTickets({ q, typ, status, mir, page });

  const linkWith = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries({ q, typ, status, mir: mir ? "1" : undefined, ...patch })) {
      if (val) p.set(k, val);
    }
    const s = p.toString();
    return s ? `/tickets?${s}` : "/tickets";
  };

  return (
    <div>
      <PageHeader
        title="Tickets"
        count={`${offen} offen · ${total} gesamt`}
        actions={<Link href="/tickets/neu" className={buttonClasses()}>Neues Ticket</Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Titel / Beschreibung" className="h-8 w-64" />
        <Select name="typ" defaultValue={typ} className="h-8 w-40">
          <option value="">Alle Typen</option>
          {TICKET_TYP.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select name="status" defaultValue={status} className="h-8 w-40">
          <option value="">Alle Status</option>
          {TICKET_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" name="mir" value="1" defaultChecked={mir} />
          mir zugewiesen
        </label>
        <Button size="sm" variant="outline" type="submit">Filtern</Button>
        {(q || typ || status || mir) ? (
          <Link href="/tickets" className="text-xs text-neutral-500 hover:underline">zurücksetzen</Link>
        ) : null}
      </form>

      <Table>
        <THead>
          <TR>
            <TH className="w-20">Typ</TH>
            <TH>Titel</TH>
            <TH className="w-28">Status</TH>
            <TH className="w-20">Prio</TH>
            <TH className="w-32">Bearbeiter</TH>
            <TH className="w-24">Aufwand</TH>
            <TH className="w-24">Erstellt</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((t) => (
            <TR key={t.id} className="hover:bg-brand-soft/40">
              <TD>{TICKET_TYP_LABEL[t.typ as TicketTyp] ?? t.typ}</TD>
              <TD className="font-medium">
                <Link href={`/tickets/${t.id}`} className="hover:text-brand hover:underline">
                  {t.titel}
                </Link>
                {t.kommentare > 0 ? (
                  <span className="ml-2 text-xs text-neutral-400">{t.kommentare} Kommentar(e)</span>
                ) : null}
              </TD>
              <TD>
                <Badge tone={TICKET_STATUS_TON[t.status as TicketStatus] ?? "neutral"}>
                  {TICKET_STATUS_LABEL[t.status as TicketStatus] ?? t.status}
                </Badge>
              </TD>
              <TD className="text-xs text-neutral-500">{TICKET_PRIO_LABEL[t.prioritaet as TicketPrio] ?? t.prioritaet}</TD>
              <TD className="text-xs text-neutral-500">{t.zugewiesenAnName ?? "–"}</TD>
              <TD className="text-xs text-neutral-500 tabular-nums">{formatAufwand(t.aufwandMinuten)}</TD>
              <TD className="text-xs text-neutral-500">{formatDate(t.createdAt)}</TD>
            </TR>
          ))}
          {rows.length === 0 ? (
            <TR><TD colSpan={7} className="py-4 text-center text-neutral-400">Keine Tickets.</TD></TR>
          ) : null}
        </TBody>
      </Table>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={linkWith({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={linkWith({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
