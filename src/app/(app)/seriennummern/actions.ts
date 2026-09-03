"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, ok, runAction } from "@/lib/domain/action-state";
import {
  auftraegeOhneSeriennummer, vergebeSeriennummerAuto, vergebeSeriennummerManuell,
} from "@/lib/domain/seriennummer";

export interface AuftragHit {
  id: string;
  nummer: string;
  kdFirma: string | null;
  kdVorname: string | null;
  kdNachname: string | null;
  kurzname: string | null;
  firma: string | null;
}

/** Typeahead: Produktionsaufträge ohne Seriennummer. */
export async function searchAuftragOhneSnAction(q: string): Promise<AuftragHit[]> {
  const rows = await auftraegeOhneSeriennummer(q, 15);
  return rows.map((r) => ({
    id: r.id, nummer: r.nummer,
    kdFirma: r.kdFirma, kdVorname: r.kdVorname, kdNachname: r.kdNachname,
    kurzname: r.kurzname, firma: r.firma,
  }));
}

export async function neueSnAutoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await vergebeSeriennummerAuto(String(fd.get("id") ?? ""));
    revalidatePath("/seriennummern");
    return ok("Seriennummer automatisch vergeben.");
  });
}

export async function neueSnManuellAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await vergebeSeriennummerManuell(String(fd.get("id") ?? ""), String(fd.get("eingabe") ?? ""));
    revalidatePath("/seriennummern");
    return ok("Seriennummer gespeichert.");
  });
}
