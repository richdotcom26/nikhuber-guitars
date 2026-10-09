import type { Metadata } from "next";
import { unterschriftKontext } from "@/lib/domain/verleih";
import { formatDateTime } from "@/lib/utils";
import { VEREINBARUNG, zubehoerListe } from "@/lib/verleih-shared";
import { UnterschriftForm } from "./unterschrift-form";

export const metadata: Metadata = { title: "Nik Huber Guitars", robots: { index: false, follow: false } };

/** Öffentliche Seite: Übergabevereinbarung lesen und elektronisch unterschreiben (Link aus der E-Mail). */
export default async function UnterschriftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await unterschriftKontext(token);

  if (!ctx) {
    return (
      <Rahmen>
        <h1 className="text-xl font-semibold text-navy">Link ungültig</h1>
        <p className="mt-2 text-sm text-muted">Dieser Link ist nicht (mehr) gültig. / This link is not valid.</p>
      </Rahmen>
    );
  }
  const d = ctx.daten;
  const t = VEREINBARUNG[d.sprache];
  const en = d.sprache === "EN";

  if (ctx.unterschriebenAm) {
    return (
      <Rahmen>
        <h1 className="text-xl font-semibold text-navy">{t.titel}</h1>
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {en
            ? `Signed by ${ctx.unterschriebenName} on ${formatDateTime(ctx.unterschriebenAm)}. Thank you!`
            : `Unterschrieben von ${ctx.unterschriebenName} am ${formatDateTime(ctx.unterschriebenAm)}. Vielen Dank!`}
        </p>
      </Rahmen>
    );
  }

  const ersetze = (x: string) => x.replace("{wert}", d.wert || "–").replace("{bis}", d.bis || "–");
  const zeile = (k: string, v: string) => (
    <div className="flex gap-3 py-0.5"><span className="w-32 shrink-0 text-muted">{k}</span><span className="font-semibold text-ink">{v || "–"}</span></div>
  );

  return (
    <Rahmen>
      <div className="text-sm text-muted">{d.firma}</div>
      <h1 className="mt-1 text-xl font-semibold text-navy">{t.titel}</h1>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase text-muted">{t.verleiher}</div>
          <div className="whitespace-pre-line">{[d.firma, ...d.firmaZeilen].join("\n")}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted">{t.leihnehmer}</div>
          <div className="whitespace-pre-line">{d.leihnehmer}</div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-line p-3 text-sm">
        <div className="mb-1 font-semibold text-ink">{t.gegenstand}</div>
        {zeile(t.modell, d.modell)}
        {zeile(t.seriennummer, d.seriennummer)}
        <div className="flex gap-3 py-0.5">
          <span className="w-32 shrink-0 text-muted">{t.zubehoer}</span>
          <ul className="font-semibold text-ink">
            {zubehoerListe(d.zubehoer).map((z, i) => <li key={i}>• {z}</li>)}
          </ul>
        </div>
        {zeile(t.wert, d.wert)}
        {d.zweck ? zeile(t.zweck, d.zweck) : null}
        {zeile(t.zeitraum, `${t.vom} ${d.vom || "–"} ${t.bis} ${d.bis || "–"}`)}
      </div>

      <h2 className="mt-4 text-sm font-semibold text-ink">{t.bedingungenTitel}</h2>
      <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm text-ink">
        {t.bedingungen.map((b, i) => <li key={i}>{ersetze(b)}</li>)}
      </ol>

      <UnterschriftForm token={token} sprache={d.sprache} />
    </Rahmen>
  );
}

function Rahmen({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-sm">{children}</div>
    </main>
  );
}
