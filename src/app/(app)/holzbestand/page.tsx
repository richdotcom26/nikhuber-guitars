import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import {
  HOLZ_STATUS, HOLZ_STATUS_LABEL, HOLZ_STATUS_TONE, type HolzStatus,
} from "@/lib/holz-shared";
import {
  listHolz, listHolzarten, listHolzartGrob, listHolzStrukturen, listHolzUnterarten, listLagerorte,
} from "@/lib/domain/holz";
import {
  HolzartenPanel, LagerortePanel, StrukturenPanel, UnterartenPanel,
} from "./masters";

const TABS: readonly TabItem[] = [
  { key: "holz", label: "Holz" },
  { key: "holzarten", label: "Holzarten" },
  { key: "unterarten", label: "Unterarten" },
  { key: "strukturen", label: "Strukturen" },
  { key: "lagerorte", label: "Lagerorte" },
];

export default async function HolzbestandPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const active = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "holz";
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "";
  const page = Number(sp.page) || 1;

  return (
    <div>
      <PageHeader
        title="Holzbestand"
        description="Physische Blanks, Holzarten und Lagerorte."
        actions={
          active === "holz"
            ? <Link href="/holzbestand/neu" className={buttonClasses()}>Holzartikel anlegen</Link>
            : undefined
        }
      />
      <Tabs items={TABS} active={active} basePath="/holzbestand" className="mb-5" />

      {active === "holz" ? <HolzListe q={q} status={status} page={page} /> : null}
      {active === "holzarten" ? <HolzartenPanel rows={(await listHolzarten()).map((r) => ({ ...r }))} /> : null}
      {active === "unterarten" ? (
        <UnterartenPanel
          rows={(await listHolzUnterarten()).map((r) => ({ ...r }))}
          grobOptionen={await listHolzartGrob()}
        />
      ) : null}
      {active === "strukturen" ? <StrukturenPanel rows={(await listHolzStrukturen()).map((r) => ({ ...r }))} /> : null}
      {active === "lagerorte" ? <LagerortePanel rows={(await listLagerorte()).map((r) => ({ ...r }))} /> : null}
    </div>
  );
}

async function HolzListe({ q, status, page }: { q: string; status: string; page: number }) {
  const { rows, total, pageCount } = await listHolz({ q, status, page });
  const chip = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ tab: "holz" });
    for (const [k, v] of Object.entries({ q, status, ...patch })) if (v) p.set(k, v);
    return `/holzbestand?${p.toString()}`;
  };
  return (
    <div>
      <form method="get" className="mb-3 flex items-center gap-2">
        <input type="hidden" name="tab" value="holz" />
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <Input name="q" defaultValue={q} placeholder="Suche Inventar-ID / Unterart / Struktur" className="h-8 w-72" />
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <ChipLink href={chip({ status: undefined })} active={!status}>Alle</ChipLink>
        {HOLZ_STATUS.map((s) => (
          <ChipLink key={s.value} href={chip({ status: s.value })} active={status === s.value}>{s.label}</ChipLink>
        ))}
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Inventar-ID</TH><TH>Holzart</TH><TH>Unterart</TH><TH>Struktur</TH>
              <TH>Qual.</TH><TH>Piece</TH><TH>Für</TH><TH>Status</TH><TH>Auftrag</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono">
                  <Link href={`/holzbestand/${r.id}`} className="font-medium hover:underline">{r.inventarId}</Link>
                </TD>
                <TD>{r.holzartName ?? "–"}</TD>
                <TD className="text-neutral-500">{r.unterart ?? "–"}</TD>
                <TD className="text-neutral-500">{r.struktur ?? "–"}</TD>
                <TD className="text-neutral-500">{r.qualitaet === "EXCEPTIONAL" ? "Exc." : r.qualitaet === "STANDARD" ? "Std." : "–"}</TD>
                <TD className="text-neutral-500">{r.piece === "EIN_PC" ? "1pc" : r.piece === "ZWEI_PC" ? "2pc" : "–"}</TD>
                <TD className="text-neutral-500">{r.fuer ?? "–"}</TD>
                <TD>
                  <Badge tone={HOLZ_STATUS_TONE[r.status as HolzStatus] ?? "neutral"}>
                    {HOLZ_STATUS_LABEL[r.status as HolzStatus] ?? r.status}
                  </Badge>
                </TD>
                <TD className="font-mono text-xs text-neutral-500">
                  {r.reserviertFuerAuftragId ? (
                    <Link href={`/auftraege/${r.reserviertFuerAuftragId}`} className="hover:underline">{r.auftragNummer}</Link>
                  ) : "–"}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={9} className="py-6 text-center text-neutral-400">
                Kein Holz erfasst — oben rechts anlegen.
              </TD></TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
          <span>Seite {page} / {pageCount} · {total} Blanks</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={chip({ page: String(page - 1) })} className={buttonClasses("outline", "sm")}>Zurück</Link> : null}
            {page < pageCount ? <Link href={chip({ page: String(page + 1) })} className={buttonClasses("outline", "sm")}>Weiter</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChipLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-2.5 py-1 text-xs " +
        (active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100")
      }
    >
      {children}
    </Link>
  );
}

