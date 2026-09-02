"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  angebotKopfSchema, createAngebot, setAngebotKunde, updateAngebotKopf,
} from "@/lib/domain/angebot";
import {
  addPosition, angebotToAuftrag, applyModellvorlage, deleteAllePositionen,
  deletePosition, generatePositionen, getArtikelForPosition, tierPreis, updatePosition,
} from "@/lib/domain/belege";

function rev(id: string) {
  revalidatePath(`/angebote/${id}`);
  revalidatePath("/angebote");
}

export async function createAngebotAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let id: string | null = null;
  const res = await runAction(async () => {
    const kundeId = fd.get("kundeId");
    id = await createAngebot(typeof kundeId === "string" && kundeId ? kundeId : null);
    return ok("Angebot angelegt.");
  });
  if (id) redirect(`/angebote/${id}`);
  return res;
}

export async function setKundeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const kundeId = String(fd.get("kundeId") ?? "");
    if (!id || !kundeId) return fail("ID / Kunde fehlt.");
    await setAngebotKunde(id, kundeId);
    rev(id);
    return ok("Kunde übernommen (Snapshot aktualisiert).");
  });
}

export async function saveKopfAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await updateAngebotKopf(id, parseForm(angebotKopfSchema, fd));
    rev(id);
    return ok("Gespeichert.");
  });
}

export async function applyVorlageAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const modellId = String(fd.get("modellId") ?? "");
    const overwrite = fd.get("overwrite") === "true";
    if (!modellId) return fail("Kein Modell gewählt.");
    await applyModellvorlage("angebot", id, modellId, overwrite);
    rev(id);
    return ok("Modellvorlage übernommen.");
  });
}

export async function generatePositionenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await generatePositionen("angebot", id);
    rev(id);
    return ok("Positionen erzeugt.");
  });
}

export async function deleteAllePositionenAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await deleteAllePositionen("angebot", id);
    rev(id);
    return ok("Alle Positionen gelöscht.");
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
          einzelpreis = tierPreis(
            a,
            fd.get("vertriebsweg") as string | null,
            fd.get("waehrung") as string | null,
            null,
          );
        }
      }
    }
    await addPosition("angebot", id, {
      artikelId,
      artikelName: name,
      artikelBeschreibung: beschreibung,
      anzahl,
      einzelpreis,
      reRelevant: true,
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
    const g = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" ? v : null;
    };
    if (g("anzahl") != null) patch.anzahl = Number(g("anzahl")!.replace(",", ".")) || 0;
    if (g("einzelpreis") != null) {
      const s = g("einzelpreis")!.replace(",", ".").trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(g("rabattProzent")!.replace(",", ".")) || 0;
    if (fd.has("reRelevant")) patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
    if (g("artikelName") != null) patch.artikelName = g("artikelName");
    await updatePosition("angebot", id, posId, patch);
    rev(id);
    return ok("Position gespeichert.");
  });
}

export async function deletePositionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    await deletePosition("angebot", id, String(fd.get("posId") ?? ""));
    rev(id);
    return ok("Position gelöscht.");
  });
}

export async function angebotToAuftragAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let auftragId: string | null = null;
  const res = await runAction(async () => {
    const id = String(fd.get("id") ?? "");
    auftragId = await angebotToAuftrag(id);
    return ok("Auftrag erstellt.");
  });
  if (auftragId) redirect(`/auftraege/${auftragId}`);
  return res;
}
