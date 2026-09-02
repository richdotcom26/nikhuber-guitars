import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { holzFormOptionen, holzhaendlerListe } from "@/lib/domain/holz";
import { HolzForm } from "../holz-form";

export default async function NeuHolzPage() {
  const [{ arten, orte, unterarten, strukturen }, haendler] = await Promise.all([holzFormOptionen(), holzhaendlerListe()]);
  return (
    <div>
      <PageHeader
        title="Holzartikel anlegen"
        actions={<Link href="/holzbestand" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <HolzForm
        mode="neu"
        values={{}}
        holzarten={arten.map((a) => ({ id: a.id, label: a.holz, grob: a.grob }))}
        lagerorte={orte.map((o) => ({ id: o.id, label: `${o.code}${o.bezeichnung ? ` – ${o.bezeichnung}` : ""}` }))}
        holzhaendler={haendler.map((h) => ({ id: h.id, label: h.firma || h.nachname || h.kurzname || h.id }))}
        unterarten={unterarten}
        strukturen={strukturen}
      />
    </div>
  );
}
