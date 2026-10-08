"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IDLE } from "@/lib/domain/action-state";
import { buchenAction, deleteEntwurfAction } from "./actions";

const HINWEIS =
  "Entwurf jetzt buchen?\n\nDabei wird die Rechnungsnummer vergeben, das Rechnungsdatum auf heute gesetzt, " +
  "die E-Rechnung (PDF) erzeugt und unveränderbar abgelegt. Danach ist die Rechnung gesperrt — " +
  "Korrekturen nur über Storno oder Rechnungskorrektur.";

/** Entwurf: „Buchen", „Buchen und per E-Mail versenden", „Entwurf löschen". */
export function BuchenButtons({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);

  function buchen(mitMail: boolean) {
    if (!confirm(HINWEIS)) return;
    setFehler(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await buchenAction(IDLE, fd);
      if (!res?.ok) {
        setFehler(res?.message ?? "Fehler beim Buchen.");
        return;
      }
      if (mitMail || confirm(
        `${res.message ?? "Gebucht."}\n\nJetzt per E-Mail versenden?\n\n` +
        "Mit OK öffnet sich das E-Mail-Fenster: Dort Empfänger, Text und Anhänge prüfen — " +
        "verschickt wird erst mit „E-Mail senden“. Mit Abbrechen bleibst du auf der Rechnung " +
        "(Versand später über „Per E-Mail versenden“ möglich).",
      )) {
        router.push(`/rechnungen/${id}/mail`);
      } else {
        router.refresh();
      }
    });
  }

  function loeschen() {
    if (!confirm("Entwurf löschen? Er hat noch keine Nummer — es entsteht keine Lücke im Nummernkreis.")) return;
    setFehler(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await deleteEntwurfAction(IDLE, fd);
      if (res && !res.ok) setFehler(res.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" className="text-red-600" disabled={pending} onClick={loeschen}>
        Entwurf löschen
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => buchen(false)}>
        {pending ? "…" : "Buchen"}
      </Button>
      <Button disabled={pending} onClick={() => buchen(true)}>
        Buchen und per E-Mail versenden
      </Button>
      {fehler ? <span className="w-full text-sm text-red-600">{fehler}</span> : null}
    </div>
  );
}
