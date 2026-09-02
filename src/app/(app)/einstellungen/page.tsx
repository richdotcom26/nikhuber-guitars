import { PageHeader } from "@/components/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  getFirmaSetting, listStaaten, listZaehler, listZahlungsbedingungen,
} from "@/lib/domain/stammdaten";
import { FirmaForm } from "./firma-form";
import { StaatenPanel } from "./staaten-panel";
import { ZaehlerPanel } from "./zaehler-panel";
import { ZahlungenPanel } from "./zahlungen-panel";

const TABS: readonly TabItem[] = [
  { key: "firma", label: "Firma" },
  { key: "zahlungen", label: "Zahlungsbedingungen" },
  { key: "staaten", label: "Staaten" },
  { key: "zaehler", label: "Belegnummern" },
];

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "firma";

  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Firmenstammdaten, Zahlungsbedingungen, Staaten und Belegnummernkreise."
      />
      <Tabs items={TABS} active={active} basePath="/einstellungen" className="mb-5" />

      {active === "firma" && <FirmaForm setting={await getFirmaSetting()} />}
      {active === "zahlungen" && <ZahlungenPanel rows={await listZahlungsbedingungen()} />}
      {active === "staaten" && (
        <StaatenPanel
          rows={await listStaaten()}
          zahlungsbedingungen={await listZahlungsbedingungen()}
        />
      )}
      {active === "zaehler" && <ZaehlerPanel rows={await listZaehler()} />}
    </div>
  );
}
