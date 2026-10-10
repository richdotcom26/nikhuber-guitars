"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type ActionState, fail, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  angebotKopfSchema, createAngebot, deleteAngebot, setAngebotArchiviert, setAngebotKunde, updateAngebotKopf,
} from "@/lib/domain/angebot";
import {
  addPorto, addPosition, angebotToAuftrag, applyModellvorlage, deleteAllePositionen,
  deletePosition, generatePositionen, getArtikelForPosition, positionMargen, tierPreis, updatePosition, setVersand,
  positionenNeuBepreisen,
} from "@/lib/domain/belege";
import { dezimal } from "@/lib/utils";

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
    if (fd.get("neuPreise") === "1") {
      const n = await positionenNeuBepreisen("angebot", id);
      rev(id);
      return ok(`Kunde übernommen, ${n} Preis(e) neu berechnet.`);
    }
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

export async function addPortoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const msg = await addPorto("angebot", id);
    rev(id);
    return ok(msg);
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
    if (g("anzahl") != null) patch.anzahl = Number(dezimal(g("anzahl")!)) || 0;
    if (g("einzelpreis") != null) {
      const s = dezimal(g("einzelpreis")!).trim();
      patch.einzelpreis = s === "" ? null : Number(s);
    }
    if (g("rabattProzent") != null) patch.rabattProzent = Number(dezimal(g("rabattProzent")!)) || 0;
    // Zeilenformular enthält die Checkbox immer; nicht angehakt = wird nicht mitgesendet
    patch.reRelevant = fd.get("reRelevant") === "on" || fd.get("reRelevant") === "true";
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

/** Versandkosten im Summenblock setzen (0 = entfernen). */
export async function setVersandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const betrag = Number(dezimal(String(fd.get("betrag") ?? "0")) || 0);
    if (!Number.isFinite(betrag)) return fail("Ungültiger Betrag.");
    await setVersand("angebot", id, { betrag, bezeichnung: String(fd.get("bezeichnung") ?? "") || null });
    rev(id);
    return ok(betrag ? "Versand gespeichert." : "Versand entfernt.");
  });
}

export async function deleteAngebotAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  let weg = false;
  const res = await runAction(async () => {
    const { nummer } = await deleteAngebot(String(fd.get("id") ?? ""));
    revalidatePath("/angebote");
    weg = true;
    return ok(`Angebot ${nummer ?? ""} gelöscht.`);
  });
  if (weg) redirect("/angebote");
  return res;
}

export async function archivAngebotAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(fd.get("id") ?? "");
    const archiv = fd.get("archiv") === "1";
    await setAngebotArchiviert(id, archiv);
    rev(id);
    revalidatePath("/angebote");
    return ok(archiv ? "Angebot archiviert (in der Liste ausgeblendet)." : "Angebot wiederhergestellt.");
  });
}
