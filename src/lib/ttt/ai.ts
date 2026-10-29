import { legalMoves } from "./engine";
import type { Board, Player } from "./engine";
import { analyse } from "./minimax";
import type { Analysis } from "./minimax";
import { pick } from "../rng";
import type { Rng } from "../rng";

export const DIFFICULTIES = ["random", "medium", "perfect"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  random: "Random",
  medium: "Medium",
  perfect: "Perfect",
};

/** On medium the AI plays a random move this often instead of the best one. */
export const MEDIUM_MISTAKE_RATE = 0.3;

export interface Decision {
  move: number;
  /** "optimal": the search's choice. "random": a deliberate mistake (or the random level). */
  reason: "optimal" | "random";
  analysis: Analysis;
}

/** Chooses the AI's move. The analysis is always attached so the UI can explain the position. */
export function chooseMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  rng: Rng,
): Decision {
  const analysis = analyse(board, player, "alphabeta");
  const randomMove = (): Decision => ({
    move: pick(rng, legalMoves(board)),
    reason: "random",
    analysis,
  });
  if (difficulty === "random") return randomMove();
  if (difficulty === "medium" && rng() < MEDIUM_MISTAKE_RATE) return randomMove();
  return { move: pick(rng, analysis.best), reason: "optimal", analysis };
}
