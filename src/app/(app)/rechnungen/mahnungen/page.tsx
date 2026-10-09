import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { listMahnvorschlaege, mahnKonfig } from "@/lib/domain/mahnung";
import { formatMoney } from "@/lib/utils";
import { MahnListe } from "./mahn-liste";

export default async function MahnungenPage({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  const sp = await searchParams;
  const alle = sp.alle === "1";
  const [rows, cfg] = await Promise.all([listMahnvorschlaege({ alle }), mahnKonfig()]);

  return (
    <div>
      <PageHeader
        title="Mahnvorschläge"
        count={`${rows.length} Rechnungen`}
        description={
          `1. Erinnerung ab ${cfg.tage[0]} Tagen (${formatMoney(cfg.gebuehr[0])}) · ` +
          `2. Erinnerung ab ${cfg.tage[1]} Tagen (${formatMoney(cfg.gebuehr[1])}) · ` +
          `letzte Mahnung ab ${cfg.tage[2]} Tagen (${formatMoney(cfg.gebuehr[2])}) – Einstellungen → Buchhaltung`
        }
        actions={<Link href="/rechnungen" className={buttonClasses("outline")}>Zurück zu Rechnungen</Link>}
      />
      <div className="mb-3 text-sm">
        <Link href={alle ? "/rechnungen/mahnungen" : "/rechnungen/mahnungen?alle=1"} className="text-brand hover:underline">
          {alle ? "nur fällige anzeigen" : "alle offenen Rechnungen anzeigen"}
        </Link>
      </div>
      <MahnListe
        rows={rows.map((r) => ({
          id: r.id, nummer: r.nummer, rechnungsdatum: r.rechnungsdatum, tage: r.tage,
          betrag: r.betrag, netto: r.netto, waehrung: r.waehrung, kunde: r.kdFirma || [r.kdVorname, r.kdNachname].filter(Boolean).join(" ") || "–",
          email: r.email, pdf: !!r.pdf, letzteStufe: r.letzteStufe, letzteAm: r.letzteAm,
          naechsteStufe: r.naechsteStufe, faellig: r.faellig, gebuehr: r.gebuehr,
        }))}
      />
    </div>
  );
}
