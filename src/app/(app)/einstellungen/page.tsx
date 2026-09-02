import { PageHeader } from "@/components/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { requireUser } from "@/lib/domain/context";
import { listBenutzer } from "@/lib/domain/benutzer";
import {
  getFirmaSetting, listStaaten, listZaehler, listZahlungsbedingungen,
} from "@/lib/domain/stammdaten";
import { BenutzerPanel } from "./benutzer-panel";
import { FirmaForm } from "./firma-form";
import { StaatenPanel } from "./staaten-panel";
import { ZaehlerPanel } from "./zaehler-panel";
import { ZahlungenPanel } from "./zahlungen-panel";

const BASE_TABS: readonly TabItem[] = [
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
  const user = await requireUser();
  const TABS: readonly TabItem[] = user.rolle === "ADMIN"
    ? [...BASE_TABS, { key: "benutzer", label: "Benutzer" }]
    : BASE_TABS;
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
      {active === "benutzer" && user.rolle === "ADMIN" && (
        <BenutzerPanel
          rows={(await listBenutzer()).map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))}
        />
      )}
    </div>
  );
}
