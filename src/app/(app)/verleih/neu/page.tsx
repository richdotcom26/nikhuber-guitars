import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { kundenPickerListe } from "@/lib/domain/angebot";
import { getKunde } from "@/lib/domain/adressen";
import { verleihGitarren } from "@/lib/domain/verleih";
import { VerleihForm } from "../verleih-form";

/** Neuer Verleih: 1. Kontakt suchen/wählen (muss in den Adressen angelegt sein), 2. Gitarre + Daten. */
export default async function NeuerVerleihPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kunde?: string; gitarre?: string }>;
}) {
  const { q = "", kunde, gitarre = "" } = await searchParams;
  const gitarren = await verleihGitarren();
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(gitarre ? { gitarre } : {}), ...extra });
    return `/verleih/neu?${p.toString()}`;
  };

  if (kunde) {
    const k = await getKunde(kunde);
    const name = k.kunde.firma || [k.kunde.vorname, k.kunde.nachname].filter(Boolean).join(" ") || k.kunde.kurzname || "–";
    const g = gitarren.find((x) => x.id === gitarre);
    return (
      <div className="space-y-5">
        <PageHeader
          title="Neuer Verleih"
          actions={<Link href="/verleih" className={buttonClasses("outline")}>Abbrechen</Link>}
        />
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Gitarre und Zeitraum</CardTitle>
            <Link href={keep({})} className="text-sm font-semibold text-blue-700 hover:underline">anderen Kontakt wählen</Link>
          </CardHeader>
          <CardContent>
            {!k.kunde.email ? (
              <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Beim Kontakt ist keine E-Mail-Adresse hinterlegt — für Vereinbarung und Erinnerung bitte im Kontakt ergänzen.
              </p>
            ) : null}
            <VerleihForm
              kundeName={name}
              gitarren={gitarren.map((x) => ({
                id: x.id,
                label: `${x.modell ?? "–"} #${x.seriennummer ?? "–"} (${x.nummer})${x.offen ? " – noch verliehen" : ""}`,
                wert: x.umsatzerwartung,
              }))}
              values={{
                auftragId: gitarre, kundeId: kunde, versendetAm: null, verfuegbarBis: null, zurueckAm: null,
                zweck: null, zubehoer: "Koffer", wert: g?.umsatzerwartung ?? null, bemerkung: null,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const kunden = q.trim() ? await kundenPickerListe(q.trim(), 20) : [];
  return (
    <div className="space-y-5">
      <PageHeader
        title="Neuer Verleih"
        description="Zuerst den Empfänger wählen — er muss in den Adressen als Kontakt angelegt sein."
        actions={<Link href="/verleih" className={buttonClasses("outline")}>Zurück</Link>}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Kontakt wählen</CardTitle>
          <Link href="/adressen/neu" target="_blank" className="text-sm font-semibold text-blue-700 hover:underline">
            Neuen Kontakt anlegen
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          <form method="get" className="flex items-center gap-2">
            {gitarre ? <input type="hidden" name="gitarre" value={gitarre} /> : null}
            <Input name="q" defaultValue={q} placeholder="Name, Firma …" className="h-8 w-72" autoFocus />
            <button type="submit" className={buttonClasses("outline", "sm")}>Suchen</button>
          </form>
          {q.trim() && kunden.length === 0 ? <p className="text-xs text-neutral-400">Kein Treffer.</p> : null}
          {kunden.length > 0 ? (
            <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
              {kunden.map((k) => {
                const name = k.firma || [k.vorname, k.nachname].filter(Boolean).join(" ") || k.kurzname || "–";
                return (
                  <li key={k.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span>{name} <span className="text-xs text-neutral-400">{k.ort ?? ""} · {k.kontaktart}</span></span>
                    <Link href={keep({ kunde: k.id })} className={buttonClasses("outline", "sm")}>Wählen</Link>
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
