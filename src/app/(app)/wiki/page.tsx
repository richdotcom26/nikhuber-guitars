import { PageHeader } from "@/components/page-header";
import { WikiPanel } from "../einstellungen/wiki-panel";

export default function WikiPage() {
  return (
    <div>
      <PageHeader title="Wiki" description="Erklärungen zu allen Funktionen der App." />
      <WikiPanel />
    </div>
  );
}
