import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { MailForm } from "./mail-form";

export default function NeuMailversandPage() {
  return (
    <div>
      <PageHeader
        title="Mailversand-Eintrag anlegen"
        description="Manuelle Notiz (Telefonat, extern versendete Mail …)."
        actions={<Link href="/mailversand" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <MailForm />
    </div>
  );
}
