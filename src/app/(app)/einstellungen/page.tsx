import { PageHeader } from "@/components/page-header";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { listArbeitsschrittVorrat } from "@/lib/domain/arbeitsschritt";
import { listModellgruppen } from "@/lib/domain/bauplanung";
import { requireUser } from "@/lib/domain/context";
import { listBenutzer } from "@/lib/domain/benutzer";
import {
  getFirmaSetting, listPortoArtikel, listStaaten, listZaehler, listZahlungsbedingungen,
} from "@/lib/domain/stammdaten";
import { listArbeitstage } from "@/lib/domain/arbeitszeit";
import { ArbeitsschrittePanel } from "./arbeitsschritte-panel";
import { ArbeitszeitPanel } from "./arbeitszeit-panel";
import { BenutzerPanel } from "./benutzer-panel";
import { FirmaForm } from "./firma-form";
import { ModellgruppenPanel } from "./modellgruppen-panel";
import { StaatenPanel } from "./staaten-panel";
import { listMailVorlagen } from "@/lib/domain/textbausteine";
import { listThemes } from "@/lib/domain/theme";
import { TextbausteinePanel } from "./textbausteine-panel";
import { ThemesPanel } from "./themes-panel";
import { WikiPanel } from "./wiki-panel";
import { MahnwesenPanel } from "./mahnwesen-panel";
import { DatevPanel } from "./datev-panel";
import { mahnKonfig } from "@/lib/domain/mahnung";
import { ZaehlerPanel } from "./zaehler-panel";
import { ZahlungenPanel } from "./zahlungen-panel";

const BASE_TABS: readonly TabItem[] = [
  { key: "firma", label: "Firma" },
  { key: "zahlungen", label: "Zahlungsbedingungen" },
  { key: "staaten", label: "Staaten" },
  { key: "modellgruppen", label: "Modellgruppen" },
  { key: "arbeitsschritte", label: "Arbeitsschritte" },
  { key: "zaehler", label: "Belegnummern" },
  { key: "textbausteine", label: "Textbausteine" },
  { key: "mahnwesen", label: "Mahnwesen" },
  { key: "datev", label: "DATEV" },
  { key: "themes", label: "Themes" },
  { key: "wiki", label: "Wiki" },
];

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const user = await requireUser();
  const TABS: readonly TabItem[] = user.rolle === "ADMIN"
    ? [...BASE_TABS, { key: "benutzer", label: "Benutzer" }, { key: "arbeitszeit", label: "Arbeitszeit" }]
    : BASE_TABS;
  const active = TABS.some((t) => t.key === tab) ? tab! : "firma";

  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Firmenstammdaten, Zahlungsbedingungen, Staaten, Modellgruppen, Arbeitsschritte, Belegnummernkreise und das Wiki mit Erklärungen zu allen Funktionen."
      />
      <Tabs items={TABS} active={active} basePath="/einstellungen" className="mb-5" />

      {active === "firma" && <FirmaForm setting={await getFirmaSetting()} />}
      {active === "zahlungen" && <ZahlungenPanel rows={await listZahlungsbedingungen()} />}
      {active === "staaten" && (
        <StaatenPanel
          rows={await listStaaten()}
          zahlungsbedingungen={await listZahlungsbedingungen()}
          portoArtikel={await listPortoArtikel()}
        />
      )}
      {active === "modellgruppen" && <ModellgruppenPanel rows={await listModellgruppen()} />}
      {active === "arbeitsschritte" && <ArbeitsschrittePanel rows={await listArbeitsschrittVorrat()} />}
      {active === "zaehler" && <ZaehlerPanel rows={await listZaehler()} />}
      {active === "textbausteine" && <TextbausteinePanel rows={await listMailVorlagen()} />}
      {active === "mahnwesen" && <MahnwesenPanel cfg={await mahnKonfig()} />}
      {active === "datev" && <DatevPanel s={await getFirmaSetting()} />}
      {active === "themes" && (
        <ThemesPanel
          rows={(await listThemes()).map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
          istAdmin={user.rolle === "ADMIN"}
        />
      )}
      {active === "wiki" && <WikiPanel />}
      {active === "arbeitszeit" && user.rolle === "ADMIN" && (
        <ArbeitszeitPanel
          rows={(await listArbeitstage()).map((r) => ({
            ...r,
            beginn: r.beginn?.toISOString() ?? null,
            ende: r.ende?.toISOString() ?? null,
            updatedAt: r.updatedAt.toISOString(),
          }))}
        />
      )}
      {active === "benutzer" && user.rolle === "ADMIN" && (
        <BenutzerPanel
          rows={(await listBenutzer()).map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))}
        />
      )}
    </div>
  );
}
