"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IDLE } from "@/lib/domain/action-state";
import { unterschreibenAction } from "./actions";

const TXT = {
  DE: {
    name: "Vor- und Nachname", unterschrift: "Unterschrift (mit Maus oder Finger)", loeschen: "Löschen",
    akzeptiert: "Ich habe die Vereinbarung gelesen und bin mit den Bedingungen einverstanden.",
    senden: "Verbindlich unterschreiben", sendet: "wird gespeichert …", leer: "Bitte unterschreiben.",
    danke: "Vielen Dank! Die unterschriebene Vereinbarung wurde gespeichert.",
  },
  EN: {
    name: "Full name", unterschrift: "Signature (with mouse or finger)", loeschen: "Clear",
    akzeptiert: "I have read the agreement and accept its terms.",
    senden: "Sign", sendet: "saving …", leer: "Please sign.",
    danke: "Thank you! The signed agreement has been saved.",
  },
} as const;

/** Name + Unterschriftsfeld (Canvas) + Zustimmung → Server Action. */
export function UnterschriftForm({ token, sprache }: { token: string; sprache: "DE" | "EN" }) {
  const t = TXT[sprache];
  const [state, action, pending] = useActionState(unterschreibenAction, IDLE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leer, setLeer] = useState(true);
  const [png, setPng] = useState("");
  const zeichnet = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f4d";
  }, []);

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    zeichnet.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = punkt(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const zug = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zeichnet.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = punkt(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setLeer(false);
  };
  const ende = () => {
    if (!zeichnet.current) return;
    zeichnet.current = false;
    if (canvasRef.current && !leer) setPng(canvasRef.current.toDataURL("image/png"));
  };
  const loeschen = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setLeer(true);
    setPng("");
  };

  if (state?.ok) {
    return <p className="mt-6 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{t.danke}</p>;
  }

  return (
    <form action={action} className="mt-6 space-y-4 border-t border-line pt-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="unterschrift" value={png} />
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t.name}</span>
        <input
          name="name"
          required
          minLength={3}
          autoComplete="name"
          className="h-10 w-full rounded-md border border-field-border bg-field px-3 text-ink"
        />
      </label>
      <div className="text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted">{t.unterschrift}</span>
          <button type="button" onClick={loeschen} className="text-xs font-semibold text-blue-700 hover:underline">{t.loeschen}</button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={zug}
          onPointerUp={ende}
          onPointerLeave={ende}
          className="h-40 w-full touch-none rounded-md border border-field-border bg-white"
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="akzeptiert" required className="mt-0.5" />
        <span>{t.akzeptiert}</span>
      </label>
      {state && !state.ok ? <p className="text-sm text-red-600">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending || leer}
        className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:bg-neutral-400"
        title={leer ? t.leer : undefined}
      >
        {pending ? t.sendet : t.senden}
      </button>
    </form>
  );
}
