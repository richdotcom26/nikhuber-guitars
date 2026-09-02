import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHolz, holzFormOptionen, holzhaendlerListe } from "@/lib/domain/holz";
import { isDomainError } from "@/lib/domain/errors";
import { DeleteHolzButton, StatusUndReservierung } from "../holz-actions";
import { HolzForm } from "../holz-form";
import { AnhangCard } from "../../_components/anhang-card";

export default async function HolzDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getHolz>>;
  try {
    data = await getHolz(id);
  } catch (e) {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const h = data.holz;
  const [{ arten, orte, unterarten, strukturen }, haendler] = await Promise.all([holzFormOptionen(), holzhaendlerListe()]);
  const formValues = { ...h };

  return (
    <div className="space-y-5">
      <PageHeader
        title={h.inventarId}
        description="Physischer Holz-Blank"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/holzbestand" className={buttonClasses("outline")}>Zurück</Link>
            <DeleteHolzButton id={h.id} />
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Status &amp; Reservierung</CardTitle></CardHeader>
        <CardContent>
          <StatusUndReservierung id={h.id} status={h.status} auftrag={data.auftragInfo} />
        </CardContent>
      </Card>

      <HolzForm
        mode="edit"
        values={formValues}
        holzarten={arten.map((a) => ({ id: a.id, label: a.holz, grob: a.grob }))}
        lagerorte={orte.map((o) => ({ id: o.id, label: `${o.code}${o.bezeichnung ? ` – ${o.bezeichnung}` : ""}` }))}
        holzhaendler={haendler.map((x) => ({ id: x.id, label: x.firma || x.nachname || x.kurzname || x.id }))}
        unterarten={unterarten}
        strukturen={strukturen}
      />
      <Card>
        <CardHeader><CardTitle>Bilder &amp; Dokumente</CardTitle></CardHeader>
        <CardContent>
          <AnhangCard traeger="holzInventar" id={h.id} revalidate={`/holzbestand/${h.id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
