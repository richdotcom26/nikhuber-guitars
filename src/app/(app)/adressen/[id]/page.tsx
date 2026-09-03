import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { anzeigename, berechneBriefkopf, getKunde, KONTAKTARTEN } from "@/lib/domain/adressen";
import { isDomainError } from "@/lib/domain/errors";
import { listStaaten, listZahlungsbedingungen } from "@/lib/domain/stammdaten";
import { AnsprechpartnerPanel } from "../ansprechpartner-panel";
import { DeleteKundeButton } from "../delete-kunde-button";
import { KundeForm } from "../kunde-form";
import { LieferadressenPanel } from "../lieferadressen-panel";

const KONTAKTART_LABEL = Object.fromEntries(KONTAKTARTEN.map((k) => [k.value, k.label]));

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getKunde>>;
  try {
    data = await getKunde(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { kunde: k, ansprechpartner, lieferadressen } = data;
  const [staaten, zbs] = await Promise.all([listStaaten(), listZahlungsbedingungen()]);
  const formValues = { ...k }; // Variable statt Literal -> keine Excess-Property-Prüfung

  const staat = k.staatId ? staaten.find((s) => s.id === k.staatId) : undefined;
  const briefkopfText = berechneBriefkopf({
    ...k,
    staatName: staat?.name ?? null,
    istInland: (staat?.region ?? k.region) === "D",
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={anzeigename(k)}
        description={
          <span className="flex items-center gap-2">
            <Badge>{KONTAKTART_LABEL[k.kontaktart] ?? k.kontaktart}</Badge>
            {k.kundenNr ? <span>Nr. {k.kundenNr}</span> : null}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/adressen" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteKundeButton id={k.id} />
          </div>
        }
      />

      <KundeForm
        mode="edit"
        values={formValues}
        staaten={staaten.map((s) => ({ id: s.id, name: s.name, region: s.region }))}
        zahlungsbedingungen={zbs.map((z) => ({ id: z.id, bezeichnung: z.bezeichnung }))}
      />

      <Card className="max-w-3xl">
        <CardHeader><CardTitle>Briefkopf (berechnet)</CardTitle></CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700">{briefkopfText || "–"}</pre>
        </CardContent>
      </Card>

      <div className="max-w-3xl space-y-5">
        <AnsprechpartnerPanel kundeId={k.id} rows={ansprechpartner} />
        <LieferadressenPanel kundeId={k.id} rows={lieferadressen} />
      </div>
    </div>
  );
}
