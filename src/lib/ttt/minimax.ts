import { LINES, SIZE, legalMoves, other, play } from "./engine";
import type { Board, Player } from "./engine";

/** A win is worth WIN_SCORE minus the plies it took, so faster wins score higher and slower losses score higher. */
export const WIN_SCORE = 10;

export type Algorithm = "minimax" | "alphabeta";

interface Counter {
  nodes: number;
}

/*
 * The searches work on a mutable scratch copy of the board (0 empty, 1 X, 2 O) that is changed and
 * restored in place. That avoids allocating a board per position, which matters when the whole game
 * tree (about half a million positions) is searched from an empty board.
 */
type Work = Uint8Array;
const CODE: Readonly<Record<Player, number>> = { X: 1, O: 2 };

function toWork(board: Board): Work {
  return Uint8Array.from(board, (c) => (c === null ? 0 : CODE[c]));
}

function winnerCode(w: Work): number {
  for (const [a, b, c] of LINES) {
    const first = w[a] ?? 0;
    if (first !== 0 && first === w[b] && first === w[c]) return first;
  }
  return 0;
}

function hasEmpty(w: Work): boolean {
  for (let i = 0; i < SIZE; i++) if (w[i] === 0) return true;
  return false;
}

/** Value for `me` with `turn` to move, `depth` plies from the root. Plain minimax. */
function minimaxValue(w: Work, turn: number, me: number, depth: number, c: Counter): number {
  c.nodes++;
  const win = winnerCode(w);
  if (win !== 0) return win === me ? WIN_SCORE - depth : depth - WIN_SCORE;
  if (!hasEmpty(w)) return 0;
  const maximising = turn === me;
  let best = maximising ? -Infinity : Infinity;
  for (let i = 0; i < SIZE; i++) {
    if (w[i] !== 0) continue;
    w[i] = turn;
    const v = minimaxValue(w, 3 - turn, me, depth + 1, c);
    w[i] = 0;
    best = maximising ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

/** Same value as minimaxValue, but stops looking at a branch once it cannot change the result. */
function alphaBetaValue(
  w: Work,
  turn: number,
  me: number,
  depth: number,
  alpha: number,
  beta: number,
  c: Counter,
): number {
  c.nodes++;
  const win = winnerCode(w);
  if (win !== 0) return win === me ? WIN_SCORE - depth : depth - WIN_SCORE;
  if (!hasEmpty(w)) return 0;
  const maximising = turn === me;
  let best = maximising ? -Infinity : Infinity;
  for (let i = 0; i < SIZE; i++) {
    if (w[i] !== 0) continue;
    w[i] = turn;
    const v = alphaBetaValue(w, 3 - turn, me, depth + 1, alpha, beta, c);
    w[i] = 0;
    if (maximising) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export interface MoveEvaluation {
  move: number;
  /** From the mover's point of view: positive wins, 0 draws, negative loses. */
  score: number;
}

export interface Analysis {
  evaluations: MoveEvaluation[];
  best: number[];
  bestScore: number;
  /** Positions visited by the search. */
  nodes: number;
}

/**
 * Scores every legal move for `player`. Each move gets its own full-window search,
 * so the scores are exact (not just bounds) and identical for both algorithms.
 */
export function analyse(
  board: Board,
  player: Player,
  algorithm: Algorithm = "alphabeta",
): Analysis {
  const counter: Counter = { nodes: 0 };
  const me = CODE[player];
  const evaluations: MoveEvaluation[] = legalMoves(board).map((move) => {
    const work = toWork(play(board, move, player)); // play() also rejects an illegal position
    const score =
      algorithm === "minimax"
        ? minimaxValue(work, CODE[other(player)], me, 1, counter)
        : alphaBetaValue(work, CODE[other(player)], me, 1, -Infinity, Infinity, counter);
    return { move, score };
  });
  const bestScore = evaluations.reduce((m, e) => Math.max(m, e.score), -Infinity);
  const best = evaluations.filter((e) => e.score === bestScore).map((e) => e.move);
  return { evaluations, best, bestScore, nodes: counter.nodes };
}

/** How much work each algorithm needs for the same position. */
export function searchCost(board: Board, player: Player): { minimax: number; alphabeta: number } {
  return {
    minimax: analyse(board, player, "minimax").nodes,
    alphabeta: analyse(board, player, "alphabeta").nodes,
  };
}

/** Human-readable verdict for a score. `moves` counts the mover's own moves until the result. */
export function describeScore(score: number): { verdict: "win" | "draw" | "loss"; moves: number } {
  if (score === 0) return { verdict: "draw", moves: 0 };
  const plies = WIN_SCORE - Math.abs(score);
  return { verdict: score > 0 ? "win" : "loss", moves: Math.ceil(plies / 2) };
}
