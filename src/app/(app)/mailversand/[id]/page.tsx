import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMailversand } from "@/lib/domain/mailversand";
import { isDomainError } from "@/lib/domain/errors";
import {
  MAIL_ART_LABEL, MAIL_STATUS_LABEL, type MailArt, type MailStatus,
} from "@/lib/mailversand-shared";
import { formatDate } from "@/lib/utils";
import { DeleteMailButton, MailStatusControl } from "../mail-controls";

/** Bodys wurden beim Import entschärft; hier noch Skripte/Styles/Handler entfernen. */
function safeBody(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");
}

export default async function MailversandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let row: Awaited<ReturnType<typeof getMailversand>>;
  try {
    row = await getMailversand(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const m = row.m;

  const bezug = row.rechnungNummer
    ? { href: `/rechnungen/${m.rechnungId}`, label: row.rechnungNummer }
    : row.auftragNummer
      ? { href: `/auftraege/${m.auftragId}`, label: row.auftragNummer }
      : row.angebotNummer
        ? { href: `/angebote/${m.angebotId}`, label: row.angebotNummer }
        : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={m.betreff ?? "(ohne Betreff)"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{MAIL_ART_LABEL[m.art as MailArt]}</Badge>
            <span>{formatDate(m.createdAt)}</span>
            <Badge tone="neutral">{MAIL_STATUS_LABEL[m.status as MailStatus]}</Badge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/mailversand" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteMailButton id={m.id} />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Kopf</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="An" value={m.an} />
            <Row label="CC" value={m.cc} />
            <Row label="BCC" value={m.bcc} />
            <Row label="Kunde" value={row.kundeName} href={m.kundeId ? `/adressen/${m.kundeId}` : undefined} />
            {bezug ? <Row label="Bezug" value={bezug.label} href={bezug.href} /> : null}
            {m.wiedervorlage ? <Row label="Wiedervorlage" value={formatDate(m.wiedervorlage)} /> : null}
            <div className="border-t border-neutral-100 pt-3">
              <MailStatusControl id={m.id} status={m.status as MailStatus} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Inhalt</CardTitle></CardHeader>
          <CardContent>
            {m.bodyHtml ? (
              <div
                className="prose prose-sm max-w-none overflow-x-auto text-sm text-neutral-800 [&_a]:text-blue-700"
                dangerouslySetInnerHTML={{ __html: safeBody(m.bodyHtml) }}
              />
            ) : (
              <p className="text-sm text-neutral-400">Kein Inhalt.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-neutral-500">{label}</span>
      {href ? (
        <Link href={href} className="text-blue-700 hover:underline">{value}</Link>
      ) : (
        <span className="break-all text-neutral-800">{value}</span>
      )}
    </div>
  );
}
