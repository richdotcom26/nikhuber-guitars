import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { listLieferanten } from "@/lib/domain/artikel";
import { ArtikelForm } from "../artikel-form";

export default async function NeuerArtikelPage() {
  const lieferanten = await listLieferanten();
  return (
    <div>
      <PageHeader
        title="Neuer Artikel"
        actions={<Link href="/artikel" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <ArtikelForm
        mode="neu"
        values={{ artikelgruppe: "SONSTIGES" }}
        lieferanten={lieferanten.map((l) => ({
          id: l.id,
          label: l.firma || l.nachname || l.kurzname || l.id,
        }))}
      />
    </div>
  );
}
