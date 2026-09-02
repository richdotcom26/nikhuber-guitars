import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { listStaaten, listZahlungsbedingungen } from "@/lib/domain/stammdaten";
import { KundeForm } from "../kunde-form";

export default async function NeuerKontaktPage() {
  const [staaten, zbs] = await Promise.all([listStaaten(), listZahlungsbedingungen()]);

  return (
    <div>
      <PageHeader
        title="Neuer Kontakt"
        actions={<Link href="/adressen" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <KundeForm
        mode="neu"
        values={{ kontaktart: "KUNDE" }}
        staaten={staaten.map((s) => ({ id: s.id, name: s.name, region: s.region }))}
        zahlungsbedingungen={zbs.map((z) => ({ id: z.id, bezeichnung: z.bezeichnung }))}
      />
    </div>
  );
}
