"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Auftragsart } from "@/lib/auftrag-shared";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  addSchritt as _addSchritt, alleVorherigenErledigt, recomputeAuftragCompliance,
  setSchrittBemerkung, setSchrittStatus, setSchrittWartenAuf, VORRAT_NR,
} from "@/lib/domain/arbeitsschritt";
import {
  auftragKopfSchema, changeAuftragStatus, convertAuftragsart, createAuftrag,
  refreshFortschritt, setAuftragKunde, updateAuftragKopf,
} from "@/lib/domain/auftrag";
import {
  addPorto, addPosition, applyModellvorlage, deleteAllePositionen, deletePosition, generatePositionen,
  getArtikelForPosition, positionMargen, setGesamtrabatt, tierPreis, updatePosition,
} from "@/lib/domain/belege";
import { requireUser } from "@/lib/domain/context";
import { createEntwurfAusAuftrag } from "@/lib/domain/rechnung";
import {
  loescheSeriennummer, vergebeSeriennummerAuto, vergebeSeriennummerManuell,
} from "@/lib/domain/seriennummer";
import { dezimal } from "@/lib/utils";

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

/* ---- Modellvorlage (träger = auftrag) ---- */

export async function applyVorlageAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const modellId = String(fd.get("modellId") ?? "");
    const overwrite = fd.get("overwrite") === "true";
    if (!modellId) return fail("Kein Modell gewählt.");
    await applyModellvorlage("auftrag", id, modellId, overwrite);
    await recomputeAuftragCompliance(id);
    rev(id);
    return ok("Modellvorlage übernommen.");
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
export async function addPortoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const msg = await addPorto("auftrag", id);
    rev(id);
    return ok(msg);
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
    const anzahl = Number(dezimal(String(fd.get("anzahl") ?? "1"))) || 1;
    const einzelpreisRaw = dezimal(String(fd.get("einzelpreis") ?? "")).trim();
    let name = freitext || null;
    let beschreibung: string | null = null;
    let einzelpreis: number | null = einzelpreisRaw ? Number(einzelpreisRaw) : null;
    if (artikelId) {
      const a = await getArtikelForPosition(artikelId);
      if (a) {
        name = freitext || a.name;
        beschreibung = a.beschreibung ?? null;
        if (einzelpreis == null) {
          einzelpreis = tierPreis(
            a,
            fd.get("vertriebsweg") as string | null,
            fd.get("waehrung") as string | null,
            null,
            await positionMargen(),
          );
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
    if (g("anzahl") != null) patch.anzahl = Number(dezimal(g("anzahl")!)) || 0;
    if (g("einzelpreis") != null) {
      const s = dezimal(g("einzelpreis")!).trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(dezimal(g("rabattProzent")!)) || 0;
    // Zeilenformular enthält die Checkbox immer; nicht angehakt = wird nicht mitgesendet
    patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
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
    const prozentRaw = dezimal(String(fd.get("prozent") ?? "")).trim();
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

export async function setSchrittWartenAufAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const auftragId = String(fd.get("auftragId") ?? "");
    await setSchrittWartenAuf(String(fd.get("schrittId") ?? ""), String(fd.get("wartenAuf") ?? ""));
    rev(auftragId);
    return ok("Grund gespeichert.");
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

export async function vergebeSerAutoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await vergebeSeriennummerAuto(id);
    rev(id);
    revalidatePath("/seriennummern");
    return ok("Seriennummer vergeben.");
  });
}

export async function vergebeSerManuellAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await vergebeSeriennummerManuell(id, String(fd.get("eingabe") ?? ""));
    rev(id);
    revalidatePath("/seriennummern");
    return ok("Seriennummer gespeichert.");
  });
}

export async function loescheSerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await loescheSeriennummer(id);
    rev(id);
    revalidatePath("/seriennummern");
    return ok("Seriennummer entfernt.");
  });
}

export async function createRechnungAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let rechnungId: string | null = null;
  const res = await runAction(async () => {
    rechnungId = await createEntwurfAusAuftrag(String(fd.get("id") ?? ""));
    return ok("Rechnungsentwurf erstellt.");
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
