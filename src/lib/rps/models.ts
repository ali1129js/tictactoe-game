import { MOVES } from "./game";
import type { Move } from "./game";

export type Probabilities = Readonly<Record<Move, number>>;

export interface Prediction {
  /** How likely the model thinks each next player move is. Always sums to 1. */
  probs: Probabilities;
  /** Which part of the model produced it, for display. */
  source: string;
}

export interface Predictor {
  predict(): Prediction;
  update(move: Move): void;
}

export const MODEL_KINDS = ["frequency", "markov"] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

export const MODEL_LABELS: Readonly<Record<ModelKind, string>> = {
  frequency: "Frequency",
  markov: "Pattern (Markov)",
};

export const ORDERS = [1, 2, 3] as const;
export type Order = (typeof ORDERS)[number];
export const DEFAULT_ORDER: Order = 2;

/** Laplace smoothing: every move keeps a small chance, so no probability is ever exactly 0 or 1. */
const SMOOTHING = 1;
/** Older observations count a little less each round, so the bot can follow a player who changes habits. */
const DECAY = 0.98;
/** A context needs this many observations before the Markov model trusts it over a shorter one. */
const MIN_OBSERVATIONS = 2;

type Counts = [number, number, number];

function toProbs(counts: Readonly<Counts>): Probabilities {
  const total = counts[0] + counts[1] + counts[2] + SMOOTHING * 3;
  return {
    rock: (counts[0] + SMOOTHING) / total,
    paper: (counts[1] + SMOOTHING) / total,
    scissors: (counts[2] + SMOOTHING) / total,
  };
}

function bump(counts: Counts, move: Move): void {
  for (let i = 0; i < 3; i++) counts[i] = (counts[i] ?? 0) * DECAY;
  const i = MOVES.indexOf(move);
  counts[i] = (counts[i] ?? 0) + 1;
}

function sum(counts: Readonly<Counts>): number {
  return counts[0] + counts[1] + counts[2];
}

/** Predicts the player's next move from how often each move was played so far. */
export class FrequencyPredictor implements Predictor {
  private counts: Counts = [0, 0, 0];

  predict(): Prediction {
    return { probs: toProbs(this.counts), source: "frequency" };
  }

  update(move: Move): void {
    bump(this.counts, move);
  }
}

/**
 * Predicts the next move from the last `order` moves the player made (an n-gram / Markov chain).
 * When the exact context is too rare it backs off to a shorter one, and finally to plain frequency.
 */
export class MarkovPredictor implements Predictor {
  private readonly tables: Map<string, Counts>[];
  private readonly frequency = new FrequencyPredictor();
  private readonly history: Move[] = [];

  constructor(readonly order: Order = DEFAULT_ORDER) {
    this.tables = Array.from({ length: order }, () => new Map<string, Counts>());
  }

  private context(length: number): string | null {
    if (this.history.length < length) return null;
    return this.history.slice(this.history.length - length).join(",");
  }

  predict(): Prediction {
    for (let k = this.order; k >= 1; k--) {
      const key = this.context(k);
      const row = key === null ? undefined : this.tables[k - 1]?.get(key);
      if (row !== undefined && sum(row) >= MIN_OBSERVATIONS) {
        return { probs: toProbs(row), source: `last ${k} move${k === 1 ? "" : "s"}` };
      }
    }
    return this.frequency.predict();
  }

  update(move: Move): void {
    for (let k = 1; k <= this.order; k++) {
      const key = this.context(k);
      const table = this.tables[k - 1];
      if (key === null || table === undefined) continue;
      const row = table.get(key) ?? [0, 0, 0];
      bump(row, move);
      table.set(key, row);
    }
    this.frequency.update(move);
    this.history.push(move);
  }
}

export function createPredictor(kind: ModelKind, order: Order = DEFAULT_ORDER): Predictor {
  return kind === "frequency" ? new FrequencyPredictor() : new MarkovPredictor(order);
}

/** The most likely moves (more than one on a tie). */
export function topMoves(probs: Probabilities): Move[] {
  const max = Math.max(probs.rock, probs.paper, probs.scissors);
  return MOVES.filter((m) => Math.abs(probs[m] - max) < 1e-9);
}

export function confidenceOf(probs: Probabilities): number {
  return Math.max(probs.rock, probs.paper, probs.scissors);
}
