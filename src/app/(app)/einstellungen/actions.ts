"use server";

import { revalidatePath } from "next/cache";
import {
  type ActionState, ok, parseForm, runAction,
} from "@/lib/domain/action-state";
import {
  createStaat, createZahlungsbedingung, deleteZahlungsbedingung,
  firmaSettingSchema, staatSchema, updateFirmaSetting, updateStaat,
  updateZahlungsbedingung, zahlungsbedingungSchema,
} from "@/lib/domain/stammdaten";
import {
  deleteTextbaustein, saveTextbaustein, textbausteinSchema,
} from "@/lib/domain/textbausteine";
import {
  aktiviereTheme, dupliziereTheme, loescheTheme, saveTheme, themeSchema,
} from "@/lib/domain/theme";
import { arbeitstagSchema, deleteArbeitstag, saveArbeitstag } from "@/lib/domain/arbeitszeit";
import { updateMahnKonfig } from "@/lib/domain/mahnung";
import { updateDatevKonfig } from "@/lib/domain/datev";
import { uebersetzeDeEn } from "@/lib/domain/uebersetzen";

const BASE = "/einstellungen";

export async function saveFirmaSettingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await updateFirmaSetting(parseForm(firmaSettingSchema, formData));
    revalidatePath(BASE);
    return ok("Firmendaten gespeichert.");
  });
}

export async function saveZahlungsbedingungAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = formData.get("id");
    const input = parseForm(zahlungsbedingungSchema, formData);
    if (typeof id === "string" && id) {
      await updateZahlungsbedingung(id, input);
    } else {
      await createZahlungsbedingung(input);
    }
    revalidatePath(BASE);
    return ok("Zahlungsbedingung gespeichert.");
  });
}

export async function deleteZahlungsbedingungAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "");
    await deleteZahlungsbedingung(id);
    revalidatePath(BASE);
    return ok("Zahlungsbedingung gelöscht.");
  });
}

export async function saveStaatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = formData.get("id");
    const input = parseForm(staatSchema, formData);
    if (typeof id === "string" && id) {
      await updateStaat(id, input);
    } else {
      await createStaat(input);
    }
    revalidatePath(BASE);
    return ok("Staat gespeichert.");
  });
}

/* ---- Modellgruppen ---- */

export async function saveModellgruppeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createModellgruppe, updateModellgruppe, modellgruppeSchema } =
      await import("@/lib/domain/bauplanung");
    const id = fd.get("id");
    const input = parseForm(modellgruppeSchema, fd);
    if (typeof id === "string" && id) await updateModellgruppe(id, input);
    else await createModellgruppe(input);
    revalidatePath(BASE);
    revalidatePath("/auftraege");
    revalidatePath("/bauplanung");
    return ok("Modellgruppe gespeichert.");
  });
}

export async function deleteModellgruppeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { deleteModellgruppe } = await import("@/lib/domain/bauplanung");
    await deleteModellgruppe(String(fd.get("id") ?? ""));
    revalidatePath(BASE);
    revalidatePath("/auftraege");
    revalidatePath("/bauplanung");
    return ok("Modellgruppe gelöscht.");
  });
}

/* ---- Arbeitsschritte (Vorrat) ---- */

export async function saveVorratAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createVorrat, updateVorrat, vorratSchema } = await import("@/lib/domain/arbeitsschritt");
    const id = fd.get("id");
    const input = parseForm(vorratSchema, fd);
    if (typeof id === "string" && id) await updateVorrat(id, input);
    else await createVorrat(input);
    revalidatePath(BASE);
    return ok("Arbeitsschritt gespeichert.");
  });
}

export async function deleteVorratAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { deleteVorrat } = await import("@/lib/domain/arbeitsschritt");
    await deleteVorrat(String(fd.get("id") ?? ""));
    revalidatePath(BASE);
    return ok("Arbeitsschritt gelöscht.");
  });
}

/* ---- Benutzerverwaltung (ADMIN) ---- */

export async function createBenutzerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { createBenutzer, benutzerNeuSchema } = await import("@/lib/domain/benutzer");
    const res = await createBenutzer(parseForm(benutzerNeuSchema, fd));
    revalidatePath(`${BASE}?tab=benutzer`);
    return ok(res.link
      ? `Benutzer angelegt. Passwort-Link: ${res.link}`
      : "Benutzer angelegt. Passwort-Link über die Aktion Passwort-Link erzeugen.");
  });
}

export async function updateBenutzerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { updateBenutzer, benutzerPatchSchema } = await import("@/lib/domain/benutzer");
    await updateBenutzer(String(fd.get("id") ?? ""), parseForm(benutzerPatchSchema, fd));
    revalidatePath(`${BASE}?tab=benutzer`);
    return ok("Benutzer gespeichert.");
  });
}

export async function benutzerRecoveryLinkAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { benutzerRecoveryLink } = await import("@/lib/domain/benutzer");
    const link = await benutzerRecoveryLink(String(fd.get("id") ?? ""));
    return ok(`Passwort-Link (an den Benutzer weitergeben): ${link}`);
  });
}

/* ---- Textbausteine (Mail) ---- */

export async function saveTextbausteinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "") || null;
    await saveTextbaustein(id, parseForm(textbausteinSchema, formData));
    revalidatePath(BASE);
    return ok("Textbaustein gespeichert.");
  });
}

export async function deleteTextbausteinAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await deleteTextbaustein(String(formData.get("id") ?? ""));
    revalidatePath(BASE);
    return ok("Textbaustein gelöscht.");
  });
}

/* ---- Themes ---- */

function revTheme() {
  // Theme wirkt im Root-Layout → alle Seiten neu rendern
  revalidatePath("/", "layout");
}

export async function saveThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = String(formData.get("id") ?? "") || null;
    await saveTheme(id, parseForm(themeSchema, formData));
    revTheme();
    return ok("Theme gespeichert.");
  });
}

export async function aktiviereThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await aktiviereTheme(String(formData.get("id") ?? ""));
    revTheme();
    return ok("Theme aktiviert.");
  });
}

export async function dupliziereThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await dupliziereTheme(String(formData.get("id") ?? ""));
    revTheme();
    return ok("Kopie angelegt.");
  });
}

export async function loescheThemeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await loescheTheme(String(formData.get("id") ?? ""));
    revTheme();
    return ok("Theme gelöscht.");
  });
}

/* ---- Arbeitszeit ---- */

export async function saveArbeitstagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await saveArbeitstag(parseForm(arbeitstagSchema, formData));
    revalidatePath(BASE);
    return ok("Gespeichert.");
  });
}

export async function deleteArbeitstagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await deleteArbeitstag(String(formData.get("tag") ?? ""));
    revalidatePath(BASE);
    return ok("Gelöscht.");
  });
}

export async function saveMahnKonfigAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const n = (k: string) => Number(String(fd.get(k) ?? "").replace(",", "."));
    await updateMahnKonfig({
      tage: [n("tage1"), n("tage2"), n("tage3")],
      gebuehr: [n("gebuehr1"), n("gebuehr2"), n("gebuehr3")],
    });
    revalidatePath(BASE);
    revalidatePath("/rechnungen/mahnungen");
    return ok("Mahnwesen gespeichert.");
  });
}

/** Name/Betreff/Text eines deutschen Bausteins nach Englisch übersetzen (Vorbelegung für einen neuen EN-Baustein). */
export async function uebersetzeTextbausteinAction(
  input: { name: string; betreff: string; text: string },
): Promise<{ ok: true; name: string; betreff: string; text: string } | { ok: false; message: string }> {
  try {
    const [name, betreff, text] = await uebersetzeDeEn([input.name, input.betreff, input.text]);
    return { ok: true, name, betreff, text };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveDatevKonfigAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await updateDatevKonfig(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])));
    revalidatePath(BASE);
    return ok("DATEV-Einstellungen gespeichert.");
  });
}
