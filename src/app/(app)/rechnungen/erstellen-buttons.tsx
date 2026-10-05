"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IDLE } from "@/lib/domain/action-state";
import { festschreibenAction } from "./actions";

const HINWEIS =
  "Rechnung jetzt erstellen?\n\nDas PDF (E-Rechnung) wird archiviert und die Rechnung festgeschrieben. " +
  "Positionen, Datum und Anzahlung können danach nicht mehr geändert werden (Korrektur nur über Gutschrift/Storno).";

/** „Rechnung erstellen" bzw. „… und per E-Mail versenden" (Workflow: Vorschau → erstellen → Mail). */
export function ErstellenButtons({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);

  function erstellen(mitMail: boolean) {
    if (!confirm(HINWEIS)) return;
    setFehler(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await festschreibenAction(IDLE, fd);
      if (!res?.ok) {
        setFehler(res?.message ?? "Fehler beim Erstellen.");
        return;
      }
      if (mitMail || confirm("Rechnung erstellt. Jetzt per E-Mail versenden?")) {
        router.push(`/rechnungen/${id}/mail`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled={pending} onClick={() => erstellen(false)}>
        {pending ? "Erstelle …" : "Rechnung erstellen"}
      </Button>
      <Button disabled={pending} onClick={() => erstellen(true)}>
        Rechnung erstellen und per E-Mail versenden
      </Button>
      {fehler ? <span className="w-full text-sm text-red-600">{fehler}</span> : null}
    </div>
  );
}
