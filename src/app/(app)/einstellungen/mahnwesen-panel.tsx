"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IDLE } from "@/lib/domain/action-state";
import { saveMahnKonfigAction } from "./actions";

const STUFEN = ["1. Zahlungserinnerung (freundlich)", "2. Zahlungserinnerung (freundlich)", "Letzte Mahnung"];

export function MahnwesenPanel({ cfg }: { cfg: { tage: number[]; gebuehr: number[] } }) {
  const [state, action] = useActionState(saveMahnKonfigAction, IDLE);
  return (
    <Card>
      <CardHeader><CardTitle>Mahnwesen</CardTitle></CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          {state ? <FormMessage state={state} /> : null}
          <p className="text-sm text-muted">
            Eine Rechnung erscheint in den <Link href="/rechnungen/mahnungen" className="text-brand hover:underline">Mahnvorschlägen</Link>,
            sobald sie älter ist als die Tage der nächsten Stufe (gezählt ab Rechnungsdatum). Die Gebühr gilt je Stufe
            insgesamt, in der Währung der Rechnung (EUR bzw. USD). Texte: Einstellungen → Textbausteine.
          </p>
          <table className="text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pr-4 pb-1">Stufe</th>
                <th className="pr-4 pb-1">ab Tagen</th>
                <th className="pb-1">Mahngebühr</th>
              </tr>
            </thead>
            <tbody>
              {STUFEN.map((s, i) => (
                <tr key={s}>
                  <td className="py-1 pr-4">{s}</td>
                  <td className="py-1 pr-4">
                    <Input name={`tage${i + 1}`} type="number" min={1} defaultValue={cfg.tage[i]} className="h-8 w-24" />
                  </td>
                  <td className="py-1">
                    <Input name={`gebuehr${i + 1}`} inputMode="decimal" defaultValue={String(cfg.gebuehr[i]).replace(".", ",")} className="h-8 w-24" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <SubmitButton>Speichern</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
