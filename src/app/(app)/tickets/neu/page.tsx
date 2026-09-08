import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { requireUser } from "@/lib/domain/context";
import { aktiveBenutzer } from "@/lib/domain/ticket";
import { TicketForm } from "../ticket-form";

export default async function NeuTicketPage() {
  const [benutzer, user] = await Promise.all([aktiveBenutzer(), requireUser()]);
  return (
    <div>
      <PageHeader
        title="Ticket anlegen"
        actions={<Link href="/tickets" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <TicketForm mode="neu" values={{}} benutzer={benutzer} currentUserId={user.id} />
      <p className="mt-3 max-w-2xl text-xs text-muted">
        Screenshots lassen sich nach dem Anlegen auf der Ticket-Seite anhängen.
      </p>
    </div>
  );
}
