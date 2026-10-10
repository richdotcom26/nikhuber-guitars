"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WIKI, type WikiArtikel, type WikiBlock } from "@/lib/wiki";

/** `**fett**` → <strong>. */
function Text({ s }: { s: string }) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
          : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

function blockText(b: WikiBlock): string {
  if ("p" in b) return b.p;
  if ("ul" in b) return b.ul.join(" ");
  return b.hinweis;
}

function Block({ b }: { b: WikiBlock }) {
  if ("p" in b) return <p><Text s={b.p} /></p>;
  if ("ul" in b) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {b.ul.map((li, i) => <li key={i}><Text s={li} /></li>)}
      </ul>
    );
  }
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
      <Text s={b.hinweis} />
    </p>
  );
}

export function WikiPanel() {
  const [q, setQ] = useState("");

  const treffer = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return WIKI;
    return WIKI.filter((a) =>
      [a.titel, a.bereich, ...a.bloecke.map(blockText)].join(" ").toLowerCase().includes(n),
    );
  }, [q]);

  const bereiche = useMemo(() => {
    const m = new Map<string, WikiArtikel[]>();
    for (const a of treffer) m.set(a.bereich, [...(m.get(a.bereich) ?? []), a]);
    return [...m.entries()];
  }, [treffer]);

  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
      {/* eigene Scrollleiste: bleibt unter der festen Kopfnavigation stehen und scrollt bei vielen Einträgen */}
      <aside className="space-y-3 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Im Wiki suchen …"
          className="h-9"
        />
        <nav className="space-y-6 text-sm">
          {bereiche.map(([bereich, artikel]) => (
            <div key={bereich}>
              <div className="mb-1.5 text-base font-bold text-brand">{bereich}</div>
              <ul className="space-y-0.5">
                {artikel.map((a) => (
                  <li key={a.id}>
                    <a href={`#wiki-${a.id}`} className="block rounded px-2 py-1 text-ink hover:bg-brand-soft">
                      {a.titel}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="space-y-10">
        {bereiche.length === 0 ? (
          <p className="text-sm text-muted">Nichts gefunden für „{q}“.</p>
        ) : null}
        {bereiche.map(([bereich, artikel]) => (
          <section key={bereich} className="space-y-3">
            <h2 className="text-xl font-bold text-brand">{bereich}</h2>
            {artikel.map((a) => (
              <Card key={a.id} id={`wiki-${a.id}`} className="scroll-mt-4">
                <CardContent className="space-y-3 pt-5 text-sm leading-relaxed text-neutral-700">
                  <h3 className="text-base font-semibold text-ink">{a.titel}</h3>
                  {a.bloecke.map((b, i) => <Block key={i} b={b} />)}
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
