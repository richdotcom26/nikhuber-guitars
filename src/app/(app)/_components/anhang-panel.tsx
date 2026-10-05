"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
  anhangUrlAction, deleteAnhangAction, setMitRechnungAction, uploadAnhangAction,
} from "./anhang-actions";

export interface AnhangItem {
  id: string;
  art: AnhangArt | null;
  dateiname: string | null;
  groesse: number | null;
  mime: string | null;
  mitRechnung?: boolean;
  createdAt: string | Date;
  /** Signierte Inline-URL für die Vorschau (nur bei image/* und PDF). */
  previewUrl?: string | null;
}

export function AnhangPanel({
  traeger,
  id,
  rows,
  revalidate,
  title = "Anhänge",
  paste = false,
  rechnungFlag = false,
}: {
  traeger: AnhangTraeger;
  id: string;
  rows: AnhangItem[];
  /** Pfad für revalidatePath nach Upload/Löschen. */
  revalidate: string;
  title?: string;
  /** Screenshot direkt aus der Zwischenablage (Strg+V) hochladen. */
  paste?: boolean;
  /** Bei Fotos Häkchen „Mit Rechnung senden" anzeigen (Auftrag). */
  rechnungFlag?: boolean;
}) {
  const [upState, upAction] = useActionState(uploadAnhangAction, IDLE);
  const [delState, delAction] = useActionState(deleteAnhangAction, IDLE);
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!paste) return;
    function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const img = Array.from(e.clipboardData.items)
        .find((it) => it.kind === "file" && it.type.startsWith("image/"));
      const blob = img?.getAsFile();
      if (!blob) return;
      e.preventDefault();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const datei = new File([blob], `screenshot-${Date.now()}.${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.set("traeger", traeger);
      fd.set("id", id);
      fd.set("_revalidate", revalidate);
      fd.set("art", "BILD");
      fd.set("datei", datei);
      upAction(fd);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [paste, traeger, id, revalidate, upAction]);

  // Vorschau (Lightbox) für Bilder/PDFs
  const vorschaubar = rows.filter((r) => r.previewUrl);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const view = viewIdx != null ? vorschaubar[viewIdx] : null;

  useEffect(() => {
    if (viewIdx == null) return;
    const n = vorschaubar.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewIdx(null);
      else if (e.key === "ArrowRight") setViewIdx((i) => (i == null ? i : (i + 1) % n));
      else if (e.key === "ArrowLeft") setViewIdx((i) => (i == null ? i : (i - 1 + n) % n));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewIdx, vorschaubar.length]);

  function anzeigen(a: AnhangItem) {
    const i = vorschaubar.findIndex((r) => r.id === a.id);
    if (i >= 0) setViewIdx(i);
    else oeffnen(a.id);
  }

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
              {a.previewUrl ? (
                <button type="button" onClick={() => anzeigen(a)} className="shrink-0" title="Vorschau">
                  {isPdf(a) ? (
                    <span className="grid h-14 w-14 place-items-center rounded border border-line bg-red-50 text-xs font-semibold text-red-700">
                      PDF
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.previewUrl}
                      alt={a.dateiname ?? "Bild"}
                      loading="lazy"
                      className="h-14 w-14 rounded border border-line object-cover transition-opacity hover:opacity-80"
                    />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => anzeigen(a)}
                disabled={pending && openId === a.id}
                className="flex-1 truncate text-left text-blue-700 hover:underline"
                title={a.dateiname ?? ""}
              >
                {pending && openId === a.id ? "öffne …" : (a.dateiname ?? "(ohne Namen)")}
              </button>
              {rechnungFlag && a.mime?.startsWith("image/") ? (
                <MitRechnungToggle id={a.id} an={!!a.mitRechnung} back={revalidate} />
              ) : null}
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

      {paste ? (
        <p className="text-xs text-muted">
          Tipp: Screenshot mit <kbd className="rounded border border-line bg-field px-1">Strg</kbd>
          {" "}+{" "}
          <kbd className="rounded border border-line bg-field px-1">V</kbd> direkt hier einfügen.
        </p>
      ) : null}

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

      {view && viewIdx != null ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/85"
          onClick={() => setViewIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center gap-3 px-4 py-2 text-sm text-white" onClick={(e) => e.stopPropagation()}>
            <span className="flex-1 truncate">{view.dateiname ?? "(ohne Namen)"}</span>
            {vorschaubar.length > 1 ? (
              <span className="text-xs text-white/60">{viewIdx + 1} / {vorschaubar.length}</span>
            ) : null}
            <button
              type="button"
              onClick={() => oeffnen(view.id)}
              className="rounded border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
            >
              Herunterladen
            </button>
            <button
              type="button"
              onClick={() => setViewIdx(null)}
              className="rounded px-2 py-1 text-lg leading-none hover:bg-white/10"
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-6">
            {isPdf(view) ? (
              <iframe
                src={view.previewUrl!}
                title={view.dateiname ?? "PDF"}
                className="h-full w-full max-w-5xl rounded bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={view.previewUrl!}
                alt={view.dateiname ?? "Bild"}
                className="max-h-full max-w-full rounded object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {vorschaubar.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Vorheriges"
                  onClick={(e) => { e.stopPropagation(); setViewIdx((viewIdx - 1 + vorschaubar.length) % vorschaubar.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Nächstes"
                  onClick={(e) => { e.stopPropagation(); setViewIdx((viewIdx + 1) % vorschaubar.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Häkchen „Mit Rechnung senden" — optimistisch, speichert sofort. */
function MitRechnungToggle({ id, an, back }: { id: string; an: boolean; back: string }) {
  const [wert, setWert] = useState(an);
  const [pending, startTransition] = useTransition();
  return (
    <label
      className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-muted"
      title="Foto beim Versand der Rechnung vorausgewählt anhängen"
    >
      <input
        type="checkbox"
        checked={wert}
        disabled={pending}
        onChange={(e) => {
          const neu = e.target.checked;
          setWert(neu);
          startTransition(async () => {
            const res = await setMitRechnungAction(id, neu, back);
            if (!res?.ok) setWert(!neu);
          });
        }}
      />
      Mit Rechnung
    </label>
  );
}

function isPdf(a: AnhangItem) {
  return a.mime === "application/pdf";
}
