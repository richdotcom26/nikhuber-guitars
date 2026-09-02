import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { anzeigename, KONTAKTARTEN, listKunden } from "@/lib/domain/adressen";
import { formatMoney } from "@/lib/utils";

const KONTAKTART_LABEL = Object.fromEntries(KONTAKTARTEN.map((k) => [k.value, k.label]));
const KONTAKTART_TONE: Record<string, "neutral" | "blue" | "green" | "amber" | "violet"> = {
  KUNDE: "neutral",
  HAENDLER: "blue",
  ARTIST: "violet",
  LIEFERANT: "amber",
  HOLZHAENDLER: "amber",
  INDUSTRIE: "green",
  SONSTIGE: "neutral",
};

export default async function AdressenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; art?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const art = sp.art ?? "";
  const page = Number(sp.page) || 1;

  const { rows, total, pageCount } = await listKunden({ q, kontaktart: art, page });

  const chipHref = (value: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (value) p.set("art", value);
    const s = p.toString();
    return s ? `/adressen?${s}` : "/adressen";
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (art) p.set("art", art);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return s ? `/adressen?${s}` : "/adressen";
  };

  return (
    <div>
      <PageHeader
        title="Adressen"
        description={`${total} Kontakte`}
        actions={
          <Link href="/adressen/neu" className={buttonClasses()}>Neuer Kontakt</Link>
        }
      />

      <form method="get" className="mb-3 flex items-center gap-2">
        {art ? <input type="hidden" name="art" value={art} /> : null}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Suche Firma / Name / Nr / Ort"
          className="h-8 w-64"
        />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
        {q ? (
          <Link href={chipHref(art)} className={buttonClasses("ghost", "sm")}>× Filter</Link>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chipHref("")} active={!art}>Alle</ChipLink>
        {KONTAKTARTEN.map((k) => (
          <ChipLink key={k.value} href={chipHref(k.value)} active={art === k.value}>
            {k.label}
          </ChipLink>
        ))}
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Art</TH>
              <TH>Name</TH>
              <TH>Kurzname</TH>
              <TH>Ort</TH>
              <TH>Staat</TH>
              <TH>Region</TH>
              <TH className="text-right">RG</TH>
              <TH className="text-right">Umsatz 12 M</TH>
              <TH>Whg</TH>
              <TH>Vertriebsweg</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Badge tone={KONTAKTART_TONE[r.kontaktart] ?? "neutral"}>
                    {KONTAKTART_LABEL[r.kontaktart] ?? r.kontaktart}
                  </Badge>
                </TD>
                <TD className="font-medium">
                  <Link href={`/adressen/${r.id}`} className="hover:underline">
                    {anzeigename(r)}
                  </Link>
                </TD>
                <TD className="text-neutral-500">{r.kurzname ?? "–"}</TD>
                <TD className="text-neutral-500">{r.ort ?? "–"}</TD>
                <TD className="text-neutral-500">{r.staatName ?? "–"}</TD>
                <TD className="text-neutral-500">{r.region ?? "–"}</TD>
                <TD className="text-right tabular-nums">{r.anzahlRg || "–"}</TD>
                <TD className="text-right tabular-nums">
                  {Number(r.ums12) > 0
                    ? formatMoney(r.ums12, r.waehrung === "USD" ? "USD" : "EUR")
                    : "–"}
                </TD>
                <TD>{r.waehrung ?? "–"}</TD>
                <TD className="text-neutral-500">{r.vertriebsweg ?? "–"}</TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={10} className="py-6 text-center text-neutral-400">Keine Treffer.</TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonClasses("outline", "sm")}>Zurück</Link>
            ) : null}
            {page < pageCount ? (
              <Link href={pageHref(page + 1)} className={buttonClasses("outline", "sm")}>Weiter</Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-2.5 py-1 text-xs " +
        (active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 text-neutral-600 hover:bg-neutral-100")
      }
    >
      {children}
    </Link>
  );
}
