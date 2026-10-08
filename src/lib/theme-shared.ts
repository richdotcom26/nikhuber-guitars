/**
 * Themes (Einstellungen → Themes): Farbfelder ↔ CSS-Variablen der Tailwind-Tokens (globals.css @theme).
 * Ein Theme überschreibt die Variablen auf :root — alle Utilities (bg-brand, text-ink …) folgen automatisch.
 */

export interface ThemeFeld {
  key: string;
  label: string;
  gruppe: "Text & Flächen" | "Akzent & Schaltflächen" | "Hauptschaltfläche" | "Eingabefelder";
  cssVar: string;
}

export const THEME_FELDER = [
  { key: "schriftDunkel", label: "Schrift dunkel", gruppe: "Text & Flächen", cssVar: "--color-navy" },
  { key: "schriftMittel", label: "Schrift mittel", gruppe: "Text & Flächen", cssVar: "--color-ink" },
  { key: "schriftGedaempft", label: "Schrift gedämpft", gruppe: "Text & Flächen", cssVar: "--color-muted" },
  { key: "seite", label: "Seitenhintergrund", gruppe: "Text & Flächen", cssVar: "--color-page" },
  { key: "karte", label: "Kartenfläche", gruppe: "Text & Flächen", cssVar: "--color-surface" },
  { key: "linie", label: "Linien & Rahmen", gruppe: "Text & Flächen", cssVar: "--color-line" },

  { key: "akzent", label: "Akzent", gruppe: "Akzent & Schaltflächen", cssVar: "--color-brand" },
  { key: "akzentDunkel", label: "Akzent dunkel", gruppe: "Akzent & Schaltflächen", cssVar: "--color-brand-dark" },
  { key: "schaltflaeche", label: "Schaltfläche", gruppe: "Akzent & Schaltflächen", cssVar: "--color-button" },
  { key: "schaltflaecheHover", label: "Schaltfläche (Hover)", gruppe: "Akzent & Schaltflächen", cssVar: "--color-button-hover" },
  { key: "akzentHell", label: "Akzent hell", gruppe: "Akzent & Schaltflächen", cssVar: "--color-brand-soft" },
  { key: "schein", label: "Schein (mit Transparenz)", gruppe: "Akzent & Schaltflächen", cssVar: "--color-glow" },

  { key: "haupt", label: "Hauptschaltfläche", gruppe: "Hauptschaltfläche", cssVar: "--color-primary" },
  { key: "hauptHover", label: "Hauptschaltfläche (Hover)", gruppe: "Hauptschaltfläche", cssVar: "--color-primary-hover" },
  { key: "hauptSchrift", label: "Schrift der Hauptschaltfläche", gruppe: "Hauptschaltfläche", cssVar: "--color-primary-fg" },

  { key: "feld", label: "Eingabefeld", gruppe: "Eingabefelder", cssVar: "--color-field" },
  { key: "feldRahmen", label: "Eingabefeld-Rahmen", gruppe: "Eingabefelder", cssVar: "--color-field-border" },
] as const satisfies readonly ThemeFeld[];

export type ThemeKey = (typeof THEME_FELDER)[number]["key"];
export type ThemeFarben = Record<ThemeKey, string>;

export const THEME_GRUPPEN = ["Text & Flächen", "Akzent & Schaltflächen", "Hauptschaltfläche", "Eingabefelder"] as const;

/** Vorlagen: „Claude" (bisherige Optik, Creme + Clay) und „Navy & Petrol" (Berater-Portal). */
export const THEME_VORLAGEN: { name: string; farben: ThemeFarben }[] = [
  {
    name: "Navy & Petrol",
    farben: {
      schriftDunkel: "#001957", schriftMittel: "#123A6E", schriftGedaempft: "#6B7280",
      seite: "#F2F4F8", karte: "#FFFFFF", linie: "#D8DEE9",
      akzent: "#109DA8", akzentDunkel: "#0F7C87", schaltflaeche: "#001957", schaltflaecheHover: "#123A6E",
      akzentHell: "#E3F5F7", schein: "rgba(16,157,168,.24)",
      haupt: "#001957", hauptHover: "#123A6E", hauptSchrift: "#FFFFFF",
      feld: "#F7F9FC", feldRahmen: "#CBD3E1",
    },
  },
  {
    name: "Claude",
    farben: {
      schriftDunkel: "#1F1C15", schriftMittel: "#2E2B24", schriftGedaempft: "#78736A",
      seite: "#F5F3EC", karte: "#FDFCF9", linie: "#E5E0D3",
      akzent: "#C96442", akzentDunkel: "#B4552F", schaltflaeche: "#C96442", schaltflaecheHover: "#B4552F",
      akzentHell: "#F4EAE2", schein: "rgba(201,100,66,.22)",
      haupt: "#C96442", hauptHover: "#B4552F", hauptSchrift: "#FFFFFF",
      feld: "#F1EEE4", feldRahmen: "#D7D0C0",
    },
  },
];

/** Nur Farbwerte zulassen (verhindert CSS-Injection über das <style>-Tag). */
const FARBE = /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*){2}(?:,\s*[\d.]+%?\s*)?\)|rgba?\(\s*[\d.]+%?(?:\s+[\d.]+%?){2}(?:\s*\/\s*[\d.]+%?)?\s*\))$/i;

export function istFarbe(v: string): boolean {
  return FARBE.test(v.trim());
}

/** Theme → CSS-Deklarationen für :root (ungültige/fehlende Werte werden ausgelassen). */
export function themeCss(farben: Partial<Record<string, string>>): string {
  const decl = THEME_FELDER
    .map((f) => {
      const v = farben[f.key]?.trim();
      return v && istFarbe(v) ? `${f.cssVar}:${v};` : "";
    })
    .join("");
  return decl;
}

/** Hex für <input type="color"> (rgba → ohne Transparenz). */
export function zuHex(v: string): string {
  const s = v.trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  if (/^#[0-9a-f]{3}$/i.test(s)) return "#" + [...s.slice(1)].map((c) => c + c).join("");
  if (/^#[0-9a-f]{8}$/i.test(s)) return s.slice(0, 7);
  const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (m) return "#" + [m[1], m[2], m[3]].map((x) => Math.round(Number(x)).toString(16).padStart(2, "0")).join("");
  return "#000000";
}
