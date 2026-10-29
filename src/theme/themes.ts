import type { ThemeName } from "../lib/storage";

export interface ThemeTokens {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  /** Player X, selected controls, the main chart line. */
  accent: string;
  onAccent: string;
  /** Player O and the bot. */
  accent2: string;
  focus: string;
  danger: string;
}

export const THEME_LABELS: Readonly<Record<ThemeName, string>> = {
  light: "Light",
  dark: "Dark",
  contrast: "High contrast",
};

/** Single source of truth for colours: applied as CSS variables, and checked by the contrast tests. */
export const THEMES: Readonly<Record<ThemeName, ThemeTokens>> = {
  light: {
    bg: "#eef3f9",
    surface: "#ffffff",
    text: "#14202e",
    textMuted: "#46566a",
    border: "#66788f",
    accent: "#1a5ba6",
    onAccent: "#ffffff",
    accent2: "#9a4a00",
    focus: "#0b4a99",
    danger: "#a11d1d",
  },
  dark: {
    bg: "#0e1621",
    surface: "#172233",
    text: "#e8eef7",
    textMuted: "#a9b8cc",
    border: "#6c7f9b",
    accent: "#7ab8e8",
    onAccent: "#0b1420",
    accent2: "#ffb066",
    focus: "#ffd166",
    danger: "#ff9d96",
  },
  contrast: {
    bg: "#000000",
    surface: "#000000",
    text: "#ffffff",
    textMuted: "#f0f0f0",
    border: "#ffffff",
    accent: "#ffe14d",
    onAccent: "#000000",
    accent2: "#ff9bd6",
    focus: "#00e5ff",
    danger: "#ff9090",
  },
};

export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name;
  const tokens = THEMES[name];
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }
  root.style.colorScheme = name === "light" ? "light" : "dark";
}

/** First visit: honour the operating system (more contrast, then dark), otherwise light. */
export function preferredTheme(
  match: (q: string) => { matches: boolean } = (q) => window.matchMedia(q),
): ThemeName {
  if (match("(prefers-contrast: more)").matches) return "contrast";
  if (match("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

/* WCAG 2.x relative luminance and contrast ratio. */
function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
