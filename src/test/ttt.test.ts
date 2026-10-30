import { describe, expect, it } from "vitest";
import {
  LINES,
  boardKey,
  emptyBoard,
  isOver,
  legalMoves,
  nextPlayer,
  other,
  play,
  winner,
  winnerLine,
} from "../lib/ttt/engine";
import type { Board, Player } from "../lib/ttt/engine";
import { analyse, describeScore, searchCost } from "../lib/ttt/minimax";
import { MEDIUM_MISTAKE_RATE, chooseMove } from "../lib/ttt/ai";
import { seededRng } from "../lib/rng";

describe("engine", () => {
  it("detects every winning line for both players", () => {
    for (const line of LINES) {
      for (const p of ["X", "O"] as const) {
        const b = emptyBoard();
        for (const i of line) b[i] = p;
        expect(winner(b)).toBe(p);
        expect(winnerLine(b)?.line).toEqual(line);
        expect(isOver(b)).toBe(true);
      }
    }
  });

  it("knows an empty board has no winner and nine moves", () => {
    expect(winner(emptyBoard())).toBeNull();
    expect(legalMoves(emptyBoard())).toHaveLength(9);
    expect(isOver(emptyBoard())).toBe(false);
  });

  it("rejects moves on taken or invalid cells and never mutates the board", () => {
    const b = emptyBoard();
    const next = play(b, 4, "X");
    expect(b[4]).toBeNull();
    expect(next[4]).toBe("X");
    expect(() => play(next, 4, "O")).toThrow();
    expect(() => play(b, 9, "O")).toThrow();
    expect(() => play(b, -1, "O")).toThrow();
    expect(() => play(b, 1.5, "O")).toThrow();
  });

  it("works out whose turn it is, X first", () => {
    expect(nextPlayer(emptyBoard())).toBe("X");
    expect(nextPlayer(play(emptyBoard(), 0, "X"))).toBe("O");
  });
});

/** Every position reachable by legal play (stopping at finished games), keyed by cells. */
function allPositions(): Board[] {
  const seen = new Map<string, Board>();
  const visit = (b: Board, turn: Player): void => {
    const key = boardKey(b);
    if (seen.has(key)) return;
    seen.set(key, b);
    if (isOver(b)) return;
    for (const m of legalMoves(b)) visit(play(b, m, turn), other(turn));
  };
  visit(emptyBoard(), "X");
  return [...seen.values()];
}

describe("minimax", () => {
  const positions = allPositions();

  it("finds the 5,478 legal tic-tac-toe positions, a known figure", () => {
    expect(positions).toHaveLength(5478);
  });

  it("values the empty board as a draw with perfect play, and every first move at most a draw", () => {
    const a = analyse(emptyBoard(), "X", "minimax");
    expect(a.bestScore).toBe(0);
    expect(a.evaluations.every((e) => e.score <= 0)).toBe(true);
    expect(a.evaluations).toHaveLength(9);
  });

  it("searches the full game tree once, 549,945 positions below the root (a known figure)", () => {
    expect(analyse(emptyBoard(), "X", "minimax").nodes).toBe(549945);
  });

  it("alpha-beta returns exactly the same move scores as plain minimax, in every position", () => {
    for (const board of positions) {
      if (isOver(board)) continue;
      const turn = nextPlayer(board);
      const plain = analyse(board, turn, "minimax");
      const pruned = analyse(board, turn, "alphabeta");
      expect(pruned.evaluations).toEqual(plain.evaluations);
      expect(pruned.best).toEqual(plain.best);
      expect(pruned.bestScore).toBe(plain.bestScore);
      expect(pruned.nodes).toBeLessThanOrEqual(plain.nodes);
    }
  });

  it("alpha-beta looks at far fewer positions from the empty board", () => {
    const cost = searchCost(emptyBoard(), "X");
    expect(cost.alphabeta).toBeLessThan(cost.minimax / 3);
  });

  it("takes an immediate win and blocks an immediate loss", () => {
    // X X . / O O . / . . .   X to move: win at 2.
    const win: Board = ["X", "X", null, "O", "O", null, null, null, null];
    expect(analyse(win, "X").best).toEqual([2]);
    // Same position with O to move: O wins at 5.
    expect(analyse(win, "O").best).toEqual([5]);
    // X . . / . O . / . . X ... O must not lose: X X . / O . . / . . . with O to move must block at 2.
    const block: Board = ["X", "X", null, "O", null, null, null, null, null];
    expect(analyse(block, "O").best).toEqual([2]);
  });

  it("prefers the faster win", () => {
    // X X . / . . . / O O .  X to move: 2 wins now (score 9); any slower plan scores less.
    const b: Board = ["X", "X", null, null, null, null, "O", "O", null];
    const a = analyse(b, "X");
    expect(a.best).toEqual([2]);
    expect(describeScore(a.bestScore)).toEqual({ verdict: "win", moves: 1 });
  });

  it("describes scores", () => {
    expect(describeScore(0)).toEqual({ verdict: "draw", moves: 0 });
    expect(describeScore(7)).toEqual({ verdict: "win", moves: 2 });
    expect(describeScore(-9).verdict).toBe("loss");
  });

  it("never loses: against every possible opponent line, whichever optimal move it picks, as X and as O", () => {
    let games = 0;
    let aiWins = 0;
    const walk = (board: Board, turn: Player, ai: Player): void => {
      const w = winner(board);
      if (w !== null) {
        games++;
        expect(w, `AI (${ai}) lost from ${boardKey(board)}`).toBe(ai);
        aiWins++;
        return;
      }
      const moves = legalMoves(board);
      if (moves.length === 0) {
        games++;
        return; // draw
      }
      if (turn === ai) {
        // Branch over EVERY move the AI might choose as equally best, so no tie-break can hide a bug.
        for (const m of analyse(board, ai).best) walk(play(board, m, ai), other(turn), ai);
      } else {
        for (const m of moves) walk(play(board, m, turn), other(turn), ai);
      }
    };
    walk(emptyBoard(), "X", "X");
    const asX = games;
    walk(emptyBoard(), "X", "O");
    expect(asX).toBeGreaterThan(500);
    expect(games).toBeGreaterThan(asX);
    expect(aiWins).toBeGreaterThan(0); // it does win when the opponent errs
  });

  it("two perfect players always draw", () => {
    const rng = seededRng(7);
    for (let g = 0; g < 20; g++) {
      let b: Board = emptyBoard();
      let turn: Player = "X";
      while (!isOver(b)) {
        b = play(b, chooseMove(b, turn, "perfect", rng).move, turn);
        turn = other(turn);
      }
      expect(winner(b)).toBeNull();
    }
  });
});

describe("difficulty levels", () => {
  it("random only ever plays legal moves, and spreads over the board", () => {
    const rng = seededRng(1);
    const board = play(play(emptyBoard(), 0, "X"), 4, "O");
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const d = chooseMove(board, "X", "random", rng);
      expect(legalMoves(board)).toContain(d.move);
      expect(d.reason).toBe("random");
      seen.add(d.move);
    }
    expect(seen.size).toBe(7);
  });

  it("perfect always plays a best move and says so", () => {
    const rng = seededRng(2);
    for (const board of allPositions().slice(0, 600)) {
      if (isOver(board)) continue;
      const turn = nextPlayer(board);
      const d = chooseMove(board, turn, "perfect", rng);
      expect(d.reason).toBe("optimal");
      expect(d.analysis.best).toContain(d.move);
    }
  });

  it("medium blunders about 30% of the time on purpose, but only plays legal moves", () => {
    const rng = seededRng(3);
    const board = play(play(play(emptyBoard(), 0, "X"), 4, "O"), 8, "X");
    let random = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const d = chooseMove(board, "O", "medium", rng);
      expect(legalMoves(board)).toContain(d.move);
      if (d.reason === "random") random++;
    }
    expect(random / n).toBeGreaterThan(MEDIUM_MISTAKE_RATE - 0.04);
    expect(random / n).toBeLessThan(MEDIUM_MISTAKE_RATE + 0.04);
  });

  it("medium loses sometimes, perfect never does, when playing a perfect opponent", () => {
    const rng = seededRng(11);
    const results = { mediumLosses: 0, perfectLosses: 0 };
    for (let g = 0; g < 60; g++) {
      for (const level of ["medium", "perfect"] as const) {
        let b: Board = emptyBoard();
        let turn: Player = "X";
        while (!isOver(b)) {
          const level_ = turn === "O" ? level : "perfect";
          b = play(b, chooseMove(b, turn, level_, rng).move, turn);
          turn = other(turn);
        }
        if (winner(b) === "X") results[level === "medium" ? "mediumLosses" : "perfectLosses"]++;
      }
    }
    expect(results.perfectLosses).toBe(0);
    expect(results.mediumLosses).toBeGreaterThan(0);
  }, 20000);
});
