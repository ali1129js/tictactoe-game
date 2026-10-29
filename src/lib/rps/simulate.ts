import { MOVES } from "./game";
import type { Move } from "./game";
import { createPredictor } from "./models";
import type { ModelKind, Order } from "./models";
import { playRound, summarise } from "./bot";
import type { Round, Stats } from "./bot";
import { randomInt } from "../rng";
import type { Rng } from "../rng";

/** A simulated player: given the moves so far, returns the next one. */
export type PlayerStrategy = (history: readonly Move[], rng: Rng) => Move;

/** Plays a move with the given weights (rock, paper, scissors), independently each round. */
export function biasedPlayer(weights: readonly [number, number, number]): PlayerStrategy {
  const total = weights[0] + weights[1] + weights[2];
  return (_history, rng) => {
    let r = rng() * total;
    for (let i = 0; i < 3; i++) {
      r -= weights[i] ?? 0;
      if (r < 0) return MOVES[i] ?? "rock";
    }
    return "scissors";
  };
}

/** Repeats a fixed sequence forever. */
export function cyclePlayer(sequence: readonly Move[]): PlayerStrategy {
  return (history) => sequence[history.length % sequence.length] ?? "rock";
}

export const uniformPlayer: PlayerStrategy = (_history, rng) => MOVES[randomInt(rng, 3)] ?? "rock";

export function simulate(
  strategy: PlayerStrategy,
  kind: ModelKind,
  order: Order,
  rounds: number,
  rng: Rng,
): { rounds: Round[]; stats: Stats } {
  const predictor = createPredictor(kind, order);
  const history: Move[] = [];
  const played: Round[] = [];
  for (let i = 0; i < rounds; i++) {
    const move = strategy(history, rng);
    played.push(playRound(predictor, move, rng));
    history.push(move);
  }
  return { rounds: played, stats: summarise(played) };
}
