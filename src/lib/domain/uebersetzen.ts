import "server-only";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

/**
 * Übersetzung DE → EN über DeepL (API-Key in DEEPL_API_KEY; Free-Keys enden auf „:fx“).
 * Platzhalter `{{…}}` werden als XML-Tags geschützt und bleiben unverändert.
 */
export async function uebersetzeDeEn(texte: string[]): Promise<string[]> {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const key = process.env.DEEPL_API_KEY;
  if (!key) {
    throw new DomainError("STATE", "Übersetzung nicht eingerichtet: DEEPL_API_KEY fehlt (kostenloser DeepL-API-Key, in Vercel hinterlegen).");
  }
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const schuetze = (s: string) =>
    esc(s).replace(/\{\{\s*(\w+)\s*\}\}/g, "<ph>$1</ph>").replace(/\n/g, "<br/>");
  const zurueck = (s: string) =>
    unesc(s.replace(/<ph>(\w+)<\/ph>/g, "{{$1}}").replace(/<br\/?>/g, "\n"));

  const res = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: texte.map(schuetze),
      source_lang: "DE",
      target_lang: "EN-GB",
      tag_handling: "xml",
      ignore_tags: ["ph"],
      formality: "prefer_less",
    }),
  });
  if (!res.ok) throw new DomainError("STATE", `DeepL-Fehler ${res.status}: ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { translations: { text: string }[] };
  return json.translations.map((t) => zurueck(t.text));
}
