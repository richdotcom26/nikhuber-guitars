import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { getBetriebsmittel } from "@/lib/domain/betriebsmittel";
import { isDomainError } from "@/lib/domain/errors";
import { formatMoney } from "@/lib/utils";
import { BetriebsmittelForm } from "../betriebsmittel-form";
import { DeleteBetriebsmittelButton } from "../delete-button";

export default async function BetriebsmittelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let row: Awaited<ReturnType<typeof getBetriebsmittel>>;
  try {
    row = await getBetriebsmittel(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={row.bezeichnung}
        description={`Bestandswert ${formatMoney(row.wert)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/betriebsmittel" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteBetriebsmittelButton id={row.id} />
          </div>
        }
      />
      <BetriebsmittelForm
        mode="edit"
        values={{
          id: row.id,
          bezeichnung: row.bezeichnung,
          artikelnummer: row.artikelnummer,
          hersteller: row.hersteller,
          lieferant: row.lieferant,
          produktkategorie: row.produktkategorie,
          einheit: row.einheit,
          menge: row.menge,
          einkaufspreis: row.einkaufspreis,
          anmerkungen: row.anmerkungen,
        }}
      />
    </div>
  );
}
