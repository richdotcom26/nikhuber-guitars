import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { kundenPickerListe } from "@/lib/domain/angebot";
import { CreateRechnungButton } from "./create-button";

/** Ad-hoc-Rechnung ohne Auftrag (Kleinteile, Ersatzteile …): erst Kunde wählen. */
export default async function NeueRechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const kunden = q.trim() ? await kundenPickerListe(q.trim(), 20) : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Neue Rechnung ohne Auftrag"
        description="Für Kleinteile, Ersatzteile usw. Gitarren (Modell-Artikel) werden über einen Auftrag abgerechnet."
        actions={<Link href="/rechnungen" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <Card>
        <CardHeader><CardTitle>Kunde wählen</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <form method="get" className="flex items-center gap-2">
            <Input name="q" defaultValue={q} placeholder="Name, Firma, Ort …" className="h-8 w-72" autoFocus />
            <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
          </form>
          {q.trim() && kunden.length === 0 ? <p className="text-xs text-neutral-400">Kein Treffer.</p> : null}
          {kunden.length > 0 ? (
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
              {kunden.map((k) => {
                const name = k.firma || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";
                return (
                  <li key={k.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span>
                      {name} <span className="text-xs text-neutral-400">{k.ort ?? ""} · {k.kontaktart}</span>
                    </span>
                    <CreateRechnungButton kundeId={k.id} />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
