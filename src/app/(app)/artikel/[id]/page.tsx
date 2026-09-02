import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { artikelName, gruppeLabel } from "@/lib/artikel-shared";
import { getArtikel, listLieferanten } from "@/lib/domain/artikel";
import { isDomainError } from "@/lib/domain/errors";
import { ArtikelActionsBar } from "../artikel-actions-bar";
import { ArtikelForm } from "../artikel-form";

export default async function ArtikelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getArtikel>>;
  try {
    data = await getArtikel(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  // Modelle haben ihre eigene Detailseite mit Specs-Tabs.
  if (data.artikel.artikelgruppe === "MODEL") redirect(`/modelle/${id}`);

  const lieferanten = await listLieferanten();
  const a = data.artikel;
  const formValues = { ...a };

  return (
    <div className="space-y-5">
      <PageHeader
        title={artikelName(a)}
        description={
          <span className="flex items-center gap-2">
            <Badge>{gruppeLabel(a.artikelgruppe)}</Badge>
            {a.artikelNr ? <span className="font-mono">{a.artikelNr}</span> : null}
            {a.datensatzInaktiv ? <Badge tone="amber">inaktiv</Badge> : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/artikel" className={buttonClasses("outline")}>Zurück</Link>
            <ArtikelActionsBar id={a.id} isModell={false} inaktiv={a.datensatzInaktiv} />
          </div>
        }
      />
      {data.lieferantName ? (
        <p className="text-sm text-neutral-500">Lieferant: {data.lieferantName}</p>
      ) : null}
      <ArtikelForm
        mode="edit"
        values={formValues}
        lieferanten={lieferanten.map((l) => ({
          id: l.id,
          label: l.firma || l.nachname || l.kurzname || l.id,
        }))}
      />
    </div>
  );
}
