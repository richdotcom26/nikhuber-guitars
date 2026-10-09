import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { auftragMailKontext } from "@/lib/domain/auftrag-mail";
import { isDomainError } from "@/lib/domain/errors";
import { mailKonfig } from "@/lib/mail/transport";
import { AuftragMailForm } from "./mail-form";

export default async function AuftragMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx: Awaited<ReturnType<typeof auftragMailKontext>>;
  try {
    ctx = await auftragMailKontext(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    if (isDomainError(e) && e.code === "STATE") redirect(`/auftraege/${id}`);
    throw e;
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title={`E-Mail zu Auftrag ${ctx.auftrag.nummer}`}
        description="Mail an den Kunden mit Textbaustein; Dateien des Auftrags können angehängt werden. Die Mail steht danach im Mailversand."
        actions={<Link href={`/auftraege/${id}`} className={buttonClasses("outline")}>Abbrechen</Link>}
      />
      {!mailKonfig() ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">SMTP ist nicht konfiguriert — Versand nicht möglich.</div>
      ) : null}
      <AuftragMailForm ctx={ctx} />
    </div>
  );
}
