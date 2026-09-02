import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { BetriebsmittelForm } from "../betriebsmittel-form";

export default function NeuBetriebsmittelPage() {
  return (
    <div>
      <PageHeader
        title="Betriebsmittel anlegen"
        actions={<Link href="/betriebsmittel" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <BetriebsmittelForm mode="neu" values={{}} />
    </div>
  );
}
