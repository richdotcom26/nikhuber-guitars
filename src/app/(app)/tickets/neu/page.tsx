import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { aktiveBenutzer } from "@/lib/domain/ticket";
import { TicketForm } from "../ticket-form";

export default async function NeuTicketPage() {
  const benutzer = await aktiveBenutzer();
  return (
    <div>
      <PageHeader
        title="Ticket anlegen"
        actions={<Link href="/tickets" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <TicketForm mode="neu" values={{}} benutzer={benutzer} />
    </div>
  );
}
