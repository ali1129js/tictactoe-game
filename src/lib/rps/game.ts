export const MOVES = ["rock", "paper", "scissors"] as const;
export type Move = (typeof MOVES)[number];

export const MOVE_LABELS: Readonly<Record<Move, string>> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

const BEATS: Readonly<Record<Move, Move>> = { rock: "scissors", paper: "rock", scissors: "paper" };
const BEATEN_BY: Readonly<Record<Move, Move>> = {
  rock: "paper",
  paper: "scissors",
  scissors: "rock",
};

/** The move that beats `move`. */
export function counterTo(move: Move): Move {
  return BEATEN_BY[move];
}

export type Outcome = "player" | "bot" | "tie";

export function outcome(player: Move, bot: Move): Outcome {
  if (player === bot) return "tie";
  return BEATS[player] === bot ? "player" : "bot";
}
