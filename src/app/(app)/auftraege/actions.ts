"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Auftragsart } from "@/lib/auftrag-shared";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addSchritt as _addSchritt, alleVorherigenErledigt, setSchrittBemerkung, setSchrittStatus,
  VORRAT_NR,
} from "@/lib/domain/arbeitsschritt";
import {
  auftragKopfSchema, changeAuftragStatus, convertAuftragsart, createAuftrag,
  refreshFortschritt, setAuftragKunde, updateAuftragKopf,
} from "@/lib/domain/auftrag";
import {
  addPosition, deleteAllePositionen, deletePosition, generatePositionen,
  getArtikelForPosition, setGesamtrabatt, tierPreis, updatePosition,
} from "@/lib/domain/belege";
import { requireUser } from "@/lib/domain/context";
import { createRechnungFromAuftrag } from "@/lib/domain/rechnung";

function rev(id: string) {
  revalidatePath(`/auftraege/${id}`);
  revalidatePath("/auftraege");
}

export async function createAuftragAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    const art = String(fd.get("art") ?? "PRODUKTION") as Auftragsart;
    const kundeId = fd.get("kundeId");
    id = await createAuftrag(art, typeof kundeId === "string" && kundeId ? kundeId : null);
    return ok("Auftrag angelegt.");
  });
  if (id) redirect(`/auftraege/${id}`);
  return res;
}

export async function setKundeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const kundeId = String(fd.get("kundeId") ?? "");
    if (!id || !kundeId) return fail("ID / Kunde fehlt.");
    await setAuftragKunde(id, kundeId);
    rev(id);
    return ok("Kunde übernommen.");
  });
}

export async function saveKopfAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateAuftragKopf(id, parseForm(auftragKopfSchema, fd));
    rev(id);
    return ok("Gespeichert.");
  });
}

export async function changeStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const ziel = String(fd.get("ziel") ?? "");
    await changeAuftragStatus(id, ziel as never);
    rev(id);
    return ok(`Status → ${ziel}.`);
  });
}

export async function convertArtAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await convertAuftragsart(id, String(fd.get("art") ?? "") as Auftragsart);
    rev(id);
    return ok("Auftragsart geändert.");
  });
}

/* ---- Positionen (träger = auftrag) ---- */

export async function generatePositionenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await generatePositionen("auftrag", id);
    rev(id);
    return ok("Positionen erzeugt.");
  });
}
export async function deleteAllePositionenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await deleteAllePositionen("auftrag", id);
    rev(id);
    return ok("Positionen gelöscht.");
  });
}
export async function addPositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const artikelId = String(fd.get("artikelId") ?? "") || null;
    const freitext = String(fd.get("freitext") ?? "").trim();
    const anzahl = Number(String(fd.get("anzahl") ?? "1").replace(",", ".")) || 1;
    const einzelpreisRaw = String(fd.get("einzelpreis") ?? "").replace(",", ".").trim();
    let name = freitext || null;
    let beschreibung: string | null = null;
    let einzelpreis: number | null = einzelpreisRaw ? Number(einzelpreisRaw) : null;
    if (artikelId) {
      const a = await getArtikelForPosition(artikelId);
      if (a) {
        name = freitext || a.name;
        beschreibung = a.beschreibung ?? null;
        if (einzelpreis == null) {
          einzelpreis = tierPreis(a, fd.get("vertriebsweg") as string | null, fd.get("waehrung") as string | null, null);
        }
      }
    }
    await addPosition("auftrag", id, {
      artikelId, artikelName: name, artikelBeschreibung: beschreibung, anzahl, einzelpreis, reRelevant: true,
    });
    rev(id);
    return ok("Position hinzugefügt.");
  });
}
export async function updatePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const posId = String(fd.get("posId") ?? "");
    const patch: Record<string, unknown> = {};
    const g = (k: string) => { const v = fd.get(k); return typeof v === "string" ? v : null; };
    if (g("anzahl") != null) patch.anzahl = Number(g("anzahl")!.replace(",", ".")) || 0;
    if (g("einzelpreis") != null) {
      const s = g("einzelpreis")!.replace(",", ".").trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(g("rabattProzent")!.replace(",", ".")) || 0;
    if (fd.has("reRelevant")) patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
    await updatePosition("auftrag", id, posId, patch);
    rev(id);
    return ok("Position gespeichert.");
  });
}
export async function deletePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await deletePosition("auftrag", id, String(fd.get("posId") ?? ""));
    rev(id);
    return ok("Position gelöscht.");
  });
}
export async function setGesamtrabattAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const aktiv = fd.get("aktiv") === "on" || fd.get("aktiv") === "true";
    const prozentRaw = String(fd.get("prozent") ?? "").replace(",", ".").trim();
    await setGesamtrabatt("auftrag", id, { aktiv, prozent: prozentRaw ? Number(prozentRaw) : null });
    rev(id);
    return ok("Gesamtrabatt gesetzt.");
  });
}

/* ---- Arbeitsschritte ---- */

export async function setSchrittStatusAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const auftragId = String(fd.get("auftragId") ?? "");
    await setSchrittStatus(String(fd.get("schrittId") ?? ""), String(fd.get("status") ?? ""));
    await refreshFortschritt(auftragId);
    rev(auftragId);
    return ok("Schritt aktualisiert.");
  });
}

export async function alleVorherigenErledigtAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const auftragId = String(fd.get("auftragId") ?? "");
    await alleVorherigenErledigt(String(fd.get("schrittId") ?? ""));
    await refreshFortschritt(auftragId);
    rev(auftragId);
    return ok("Vorherige Schritte erledigt.");
  });
}

export async function saveSchrittBemerkungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const auftragId = String(fd.get("auftragId") ?? "");
    const dauerRaw = String(fd.get("dauerMinuten") ?? "").trim();
    await setSchrittBemerkung(
      String(fd.get("schrittId") ?? ""),
      String(fd.get("bemerkung") ?? ""),
      dauerRaw ? Number(dauerRaw) : null,
    );
    rev(auftragId);
    return ok("Bemerkung gespeichert.");
  });
}

export async function createRechnungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let rechnungId: string | null = null;
  const res = await runAction(async () => {
    rechnungId = await createRechnungFromAuftrag(String(fd.get("id") ?? ""));
    return ok("Rechnung erstellt.");
  });
  if (rechnungId) redirect(`/rechnungen/${rechnungId}`);
  return res;
}

export async function addComplianceSchrittAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const auftragId = String(fd.get("auftragId") ?? "");
    const nr = Number(fd.get("nr"));
    const user = await requireUser();
    await _addSchritt(auftragId, nr || VORRAT_NR.REPARATUR, user.id);
    rev(auftragId);
    return ok("Schritt hinzugefügt.");
  });
}
