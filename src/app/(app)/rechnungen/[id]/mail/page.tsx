import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { isDomainError } from "@/lib/domain/errors";
import { mailKonfig } from "@/lib/mail/transport";
import { rechnungMailKontext } from "@/lib/domain/rechnung-mail";
import { RechnungMailForm } from "./mail-form";

export default async function RechnungMailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let ctx: Awaited<ReturnType<typeof rechnungMailKontext>>;
  try {
    ctx = await rechnungMailKontext(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    if (isDomainError(e) && e.code === "STATE") redirect(`/rechnungen/${id}`);
    throw e;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${ctx.titel} ${ctx.rechnung.nummer} per E-Mail senden`}
        description="Die archivierte E-Rechnung (PDF) wird immer angehängt. Fotos optional."
        actions={<Link href={`/rechnungen/${id}`} className={buttonClasses("outline")}>Abbrechen</Link>}
      />
      {!mailKonfig() ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          SMTP ist nicht konfiguriert — Versand nicht möglich.
        </div>
      ) : null}
      <RechnungMailForm ctx={ctx} />
    </div>
  );
}
