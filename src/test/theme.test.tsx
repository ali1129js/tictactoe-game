import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { KEYS, THEME_NAMES } from "../lib/storage";
import { THEMES, THEME_LABELS, applyTheme, contrastRatio, preferredTheme } from "../theme/themes";

describe("contrast maths", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe.each(THEME_NAMES)("%s theme contrast", (name) => {
  const t = THEMES[name];
  const min = name === "contrast" ? 7 : 4.5; // AAA for the high-contrast theme, AA otherwise

  it("keeps body and muted text readable on the page and on panels", () => {
    for (const text of [t.text, t.textMuted]) {
      expect(contrastRatio(text, t.bg)).toBeGreaterThanOrEqual(min);
      expect(contrastRatio(text, t.surface)).toBeGreaterThanOrEqual(min);
    }
  });

  it("keeps text on accent fills (pressed toggles, buttons, winning squares) readable", () => {
    expect(contrastRatio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(min);
  });

  it("keeps X, O and the selected tab readable on the board and panels", () => {
    for (const colour of [t.accent, t.accent2]) {
      expect(contrastRatio(colour, t.surface)).toBeGreaterThanOrEqual(min);
      expect(contrastRatio(colour, t.bg)).toBeGreaterThanOrEqual(min);
    }
  });

  it("uses different colours for X and O (the letters differ too, so colour is never the only cue)", () => {
    expect(t.accent).not.toBe(t.accent2);
  });

  it("keeps error text readable", () => {
    expect(contrastRatio(t.danger, t.surface)).toBeGreaterThanOrEqual(min);
    expect(contrastRatio(t.danger, t.bg)).toBeGreaterThanOrEqual(min);
  });

  it("keeps cell borders, chart lines and the focus ring visible (3:1)", () => {
    for (const c of [t.border, t.focus, t.accent, t.accent2]) {
      expect(contrastRatio(c, t.bg)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(c, t.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it("applies every token as a CSS variable and sets the root attribute", () => {
    const root = document.createElement("div");
    applyTheme(name, root);
    expect(root.dataset.theme).toBe(name);
    expect(root.style.getPropertyValue("--text")).toBe(t.text);
    expect(root.style.getPropertyValue("--on-accent")).toBe(t.onAccent);
    expect(root.style.getPropertyValue("--accent2")).toBe(t.accent2);
    expect(root.style.getPropertyValue("--text-muted")).toBe(t.textMuted);
  });
});

describe("theme choice", () => {
  const media = (set: string[]) => (q: string) => ({ matches: set.includes(q) });

  it("follows the operating system on a first visit: more contrast, then dark, else light", () => {
    expect(preferredTheme(media([]))).toBe("light");
    expect(preferredTheme(media(["(prefers-color-scheme: dark)"]))).toBe("dark");
    expect(
      preferredTheme(media(["(prefers-color-scheme: dark)", "(prefers-contrast: more)"])),
    ).toBe("contrast");
  });

  it("switches theme from the switcher, applies it to the page and remembers it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    expect(document.documentElement.dataset.theme).toBe("light");
    for (const name of THEME_NAMES) {
      await user.click(screen.getByRole("button", { name: THEME_LABELS[name] }));
      expect(document.documentElement.dataset.theme).toBe(name);
      expect(screen.getByRole("button", { name: THEME_LABELS[name] })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    expect(JSON.parse(localStorage.getItem(KEYS.theme) ?? "null")).toBe("contrast");
    unmount();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe("contrast");
  });

  it("ignores a corrupt saved theme", () => {
    localStorage.setItem(KEYS.theme, JSON.stringify("neon"));
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
