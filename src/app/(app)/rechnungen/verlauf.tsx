import Link from "next/link";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { VerlaufEreignis } from "@/lib/domain/rechnung-verlauf";

const PUNKT: Record<VerlaufEreignis["ton"], string> = {
  neutral: "bg-neutral-400",
  blue: "bg-brand",
  green: "bg-green-600",
  red: "bg-red-600",
  amber: "bg-amber-500",
};

/** Chronologischer Verlauf einer Rechnung inkl. verbundener Belege (Server-Komponente). */
export function Verlauf({ ereignisse }: { ereignisse: VerlaufEreignis[] }) {
  if (!ereignisse.length) return <p className="text-sm text-muted">Noch keine Ereignisse.</p>;
  return (
    <ol className="relative space-y-3 border-l border-line pl-4 text-sm">
      {ereignisse.map((e, i) => (
        <li key={i} className="relative">
          <span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface", PUNKT[e.ton])} />
          <div className="text-xs tabular-nums text-muted">
            {e.nurDatum ? formatDate(e.zeit) : formatDateTime(e.zeit)}
            {e.wer ? <> · {e.wer}</> : null}
          </div>
          <div className={e.eigen ? "text-ink" : "text-muted"}>
            {e.text}
            {e.link ? (
              <>
                {" "}
                <Link href={e.link.href} className="font-medium text-blue-700 hover:underline">{e.link.label}</Link>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
