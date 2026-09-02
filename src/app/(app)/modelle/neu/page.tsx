import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { listLieferanten } from "@/lib/domain/artikel";
import { ArtikelForm } from "../../artikel/artikel-form";

export default async function NeuesModellPage() {
  const lieferanten = await listLieferanten();
  return (
    <div>
      <PageHeader
        title="Neues Modell"
        actions={<Link href="/modelle" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <ArtikelForm
        mode="neu"
        isModell
        values={{ artikelgruppe: "MODEL" }}
        lieferanten={lieferanten.map((l) => ({
          id: l.id,
          label: l.firma || l.nachname || l.kurzname || l.id,
        }))}
      />
    </div>
  );
}
