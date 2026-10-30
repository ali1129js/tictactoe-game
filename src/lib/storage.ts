import { z } from "zod";
import { DIFFICULTIES } from "./ttt/ai";
import { MODEL_KINDS, ORDERS } from "./rps/models";

export const THEME_NAMES = ["light", "dark", "contrast"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const GAME_IDS = ["tictactoe", "rps"] as const;
export type GameId = (typeof GAME_IDS)[number];

export const themeSchema = z.enum(THEME_NAMES);
export const gameSchema = z.enum(GAME_IDS);

const orderSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const tttSettingsSchema = z.object({
  difficulty: z.enum(DIFFICULTIES),
  /** Who moves first (and so plays X). */
  first: z.enum(["you", "ai"]),
  showWhy: z.boolean(),
});
export type TttSettings = z.infer<typeof tttSettingsSchema>;

export const rpsSettingsSchema = z.object({
  model: z.enum(MODEL_KINDS),
  order: orderSchema,
  showPrediction: z.boolean(),
});
export type RpsSettings = z.infer<typeof rpsSettingsSchema>;

export const DEFAULT_TTT: TttSettings = { difficulty: "perfect", first: "you", showWhy: false };
export const DEFAULT_RPS: RpsSettings = { model: "markov", order: ORDERS[1], showPrediction: true };

/** Versioned keys, so a future shape change can ignore old data instead of crashing on it. */
export const KEYS = {
  theme: "arcade.v1.theme",
  game: "arcade.v1.game",
  ttt: "arcade.v1.ttt",
  rps: "arcade.v1.rps",
} as const;

/** Reads and validates a value; anything missing, corrupt or of the wrong shape gives the fallback. */
export function readStored<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/** Storage can be full or blocked (private mode); the app still works, it just forgets. */
export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
