"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Select } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import {
  ANHANG_ART, ANHANG_ART_LABEL, formatBytes,
  type AnhangArt, type AnhangTraeger,
} from "@/lib/anhang-shared";
import { formatDate } from "@/lib/utils";
import {
  anhangUrlAction, deleteAnhangAction, uploadAnhangAction,
} from "./anhang-actions";

export interface AnhangItem {
  id: string;
  art: AnhangArt | null;
  dateiname: string | null;
  groesse: number | null;
  mime: string | null;
  createdAt: string | Date;
}

export function AnhangPanel({
  traeger,
  id,
  rows,
  revalidate,
  title = "Anhänge",
}: {
  traeger: AnhangTraeger;
  id: string;
  rows: AnhangItem[];
  /** Pfad für revalidatePath nach Upload/Löschen. */
  revalidate: string;
  title?: string;
}) {
  const [upState, upAction] = useActionState(uploadAnhangAction, IDLE);
  const [delState, delAction] = useActionState(deleteAnhangAction, IDLE);
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  function oeffnen(anhangId: string) {
    setOpenId(anhangId);
    startTransition(async () => {
      try {
        const url = await anhangUrlAction(anhangId);
        window.open(url, "_blank", "noopener");
      } finally {
        setOpenId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-600">{title} ({rows.length})</span>
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200 text-sm">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                onClick={() => oeffnen(a.id)}
                disabled={pending && openId === a.id}
                className="flex-1 truncate text-left text-blue-700 hover:underline"
                title={a.dateiname ?? ""}
              >
                {pending && openId === a.id ? "öffne …" : (a.dateiname ?? "(ohne Namen)")}
              </button>
              {a.art ? <Badge tone="neutral">{ANHANG_ART_LABEL[a.art]}</Badge> : null}
              <span className="w-16 shrink-0 text-right text-xs text-neutral-400">{formatBytes(a.groesse)}</span>
              <span className="w-20 shrink-0 text-right text-xs text-neutral-400">{formatDate(a.createdAt)}</span>
              <form action={delAction} className="shrink-0" onSubmit={(e) => { if (!confirm("Anhang löschen?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="_revalidate" value={revalidate} />
                <SubmitButton size="sm" variant="ghost" className="text-red-600" pendingText="…">×</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-neutral-400">Keine Anhänge.</p>
      )}
      {delState && !delState.ok ? <FormMessage state={delState} /> : null}

      <form action={upAction} className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <input type="hidden" name="traeger" value={traeger} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="_revalidate" value={revalidate} />
        <input
          type="file"
          name="datei"
          required
          className="text-xs file:mr-2 file:rounded file:border-0 file:bg-neutral-900 file:px-2 file:py-1 file:text-white"
        />
        <Select name="art" defaultValue="" className="h-8 w-32 text-xs">
          <option value="">Art (auto)</option>
          {ANHANG_ART.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <SubmitButton size="sm" variant="outline" pendingText="lädt …">Hochladen</SubmitButton>
        {upState ? <FormMessage state={upState} className="w-full" /> : null}
      </form>
    </div>
  );
}
