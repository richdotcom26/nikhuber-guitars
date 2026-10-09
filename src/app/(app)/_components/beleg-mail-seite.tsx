import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { belegMailKontext, type MailBeleg } from "@/lib/domain/beleg-mail";
import { isDomainError } from "@/lib/domain/errors";
import { mailKonfig } from "@/lib/mail/transport";
import { BelegMailForm } from "./beleg-mail-form";

/** Gemeinsame Seite „E-Mail an den Kunden" für Angebot und Auftrag. */
export async function BelegMailSeite({ art, id }: { art: MailBeleg; id: string }) {
  const zurueck = art === "angebot" ? `/angebote/${id}` : `/auftraege/${id}`;
  let ctx: Awaited<ReturnType<typeof belegMailKontext>>;
  try {
    ctx = await belegMailKontext(art, id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    if (isDomainError(e) && e.code === "STATE") redirect(zurueck);
    throw e;
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title={`E-Mail zu ${art === "angebot" ? "Angebot" : "Auftrag"} ${ctx.beleg.nummer}`}
        description="Mail an den Kunden mit Textbaustein; Dateien des Belegs können angehängt werden. Die Mail steht danach im Mailversand."
        actions={<Link href={zurueck} className={buttonClasses("outline")}>Abbrechen</Link>}
      />
      {!mailKonfig() ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">SMTP ist nicht konfiguriert — Versand nicht möglich.</div>
      ) : null}
      <BelegMailForm ctx={ctx} />
    </div>
  );
}
