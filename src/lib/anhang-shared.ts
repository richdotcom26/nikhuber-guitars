/** Client-sichere Anhang-Konstanten (kein DB-/Storage-Zugriff). */

export const ANHANG_ART_VALUES = [
  "BELEG_PDF", "BILD", "CITES", "LACEY", "ZERTIFIKAT", "SONSTIGES",
] as const;
export type AnhangArt = (typeof ANHANG_ART_VALUES)[number];

export const ANHANG_ART_LABEL: Record<AnhangArt, string> = {
  BELEG_PDF: "Beleg-PDF",
  BILD: "Bild",
  CITES: "CITES",
  LACEY: "Lacey Act",
  ZERTIFIKAT: "Zertifikat",
  SONSTIGES: "Sonstiges",
};
export const ANHANG_ART = ANHANG_ART_VALUES.map((value) => ({ value, label: ANHANG_ART_LABEL[value] }));

export const ANHANG_TRAEGER = [
  "auftrag", "angebot", "rechnung", "artikel", "holzInventar", "todo", "mailversand",
] as const;
export type AnhangTraeger = (typeof ANHANG_TRAEGER)[number];

/** Spaltenname je Träger in der anhang-Tabelle. */
export const ANHANG_SPALTE: Record<AnhangTraeger, string> = {
  auftrag: "auftrag_id",
  angebot: "angebot_id",
  rechnung: "rechnung_id",
  artikel: "artikel_id",
  holzInventar: "holz_inventar_id",
  todo: "todo_id",
  mailversand: "mailversand_id",
};

export function formatBytes(n: number | null | undefined): string {
  if (!n) return "–";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
