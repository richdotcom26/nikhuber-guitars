import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { getKunde } from "@/lib/domain/adressen";

export interface KundeSnapshot {
  kundeId: string | null;
  kdBriefkopf: string | null;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kdStrasse: string | null;
  kdPlz: string | null;
  kdOrt: string | null;
  kdRegion: string | null;
  kdWaehrung: string | null;
  kdVertriebsweg: string | null;
  kdSprache: string | null;
  kdSteuerpflichtig: boolean | null;
}

/**
 * Kundenblock in Angebot/Auftrag: links der vollständige Briefkopf (Firma fett), rechts Telefon/Mobil/E-Mail
 * mit „E-Mail schreiben" und die Kennzeichen (Region, Währung, Vertriebsweg, Sprache, Steuer).
 */
export async function KundeBlock({ beleg, mailHref }: { beleg: KundeSnapshot; mailHref: string }) {
  const name = beleg.kdFirma || [beleg.kdVorname, beleg.kdNachname].filter(Boolean).join(" ");
  const briefkopf = beleg.kdBriefkopf
    || [name, beleg.kdStrasse, [beleg.kdPlz, beleg.kdOrt].filter(Boolean).join(" ")].filter(Boolean).join("\n");
  const k = beleg.kundeId ? (await getKunde(beleg.kundeId).catch(() => null))?.kunde ?? null : null;
  const zeilen = briefkopf.split("\n").map((z) => z.trim()).filter(Boolean);
  const fettErste = !!beleg.kdFirma?.trim() && zeilen[0] === beleg.kdFirma.trim();
  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        {zeilen.map((z, i) => (
          <div key={i} className={i === 0 && fettErste ? "font-semibold text-ink" : "text-ink"}>{z}</div>
        ))}
        {beleg.kundeId ? (
          <Link href={`/adressen/${beleg.kundeId}`} className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
            → Kundendatensatz
          </Link>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="space-y-0.5">
          {k?.telefon ? <div><span className="text-muted">Tel.</span> <a href={`tel:${k.telefon}`} className="text-ink hover:underline">{k.telefon}</a></div> : null}
          {k?.mobil ? <div><span className="text-muted">Mobil</span> <a href={`tel:${k.mobil}`} className="text-ink hover:underline">{k.mobil}</a></div> : null}
          {k?.email ? (
            <div className="truncate"><span className="text-muted">E-Mail</span> <span className="text-ink">{k.email}</span></div>
          ) : <div className="text-xs text-muted">keine E-Mail hinterlegt</div>}
          {beleg.kundeId ? (
            <Link href={mailHref} className={buttonClasses("outline", "sm") + " mt-1"}>✉ E-Mail schreiben …</Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {beleg.kdRegion ? <Badge>{beleg.kdRegion}</Badge> : null}
          {beleg.kdWaehrung ? <Badge>{beleg.kdWaehrung}</Badge> : null}
          {beleg.kdVertriebsweg ? <Badge>{beleg.kdVertriebsweg}</Badge> : null}
          {beleg.kdSprache ? <Badge>{beleg.kdSprache}</Badge> : null}
          {beleg.kdSteuerpflichtig === true ? <Badge tone="amber">steuerpflichtig</Badge> : null}
          {beleg.kdSteuerpflichtig === false ? <Badge tone="green">steuerfrei</Badge> : null}
        </div>
      </div>
    </div>
  );
}
