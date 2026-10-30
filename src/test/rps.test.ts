import { describe, expect, it } from "vitest";
import { MOVES, counterTo, outcome } from "../lib/rps/game";
import type { Move } from "../lib/rps/game";
import {
  FrequencyPredictor,
  MarkovPredictor,
  confidenceOf,
  createPredictor,
  topMoves,
} from "../lib/rps/models";
import { chooseBotMove, playRound, summarise, winRateSeries } from "../lib/rps/bot";
import { biasedPlayer, cyclePlayer, simulate, uniformPlayer } from "../lib/rps/simulate";
import { seededRng } from "../lib/rng";

const sumOf = (p: Readonly<Record<Move, number>>) => p.rock + p.paper + p.scissors;

describe("rules", () => {
  it("has the usual cycle", () => {
    expect(outcome("rock", "scissors")).toBe("player");
    expect(outcome("scissors", "paper")).toBe("player");
    expect(outcome("paper", "rock")).toBe("player");
    expect(outcome("rock", "paper")).toBe("bot");
    expect(outcome("paper", "paper")).toBe("tie");
  });

  it("counterTo always beats its argument", () => {
    for (const m of MOVES) expect(outcome(counterTo(m), m)).toBe("player");
  });
});

describe("frequency model", () => {
  it("starts uniform, then favours what it has seen", () => {
    const m = new FrequencyPredictor();
    expect(topMoves(m.predict().probs)).toEqual([...MOVES]);
    expect(confidenceOf(m.predict().probs)).toBeCloseTo(1 / 3, 9);
    for (let i = 0; i < 6; i++) m.update("paper");
    const p = m.predict();
    expect(topMoves(p.probs)).toEqual(["paper"]);
    expect(sumOf(p.probs)).toBeCloseTo(1, 9);
    expect(p.probs.rock).toBeGreaterThan(0);
  });

  it("follows a player who changes habits", () => {
    const m = new FrequencyPredictor();
    for (let i = 0; i < 40; i++) m.update("rock");
    for (let i = 0; i < 60; i++) m.update("scissors");
    expect(topMoves(m.predict().probs)).toEqual(["scissors"]);
  });
});

describe("markov model", () => {
  it("learns a repeating sequence and becomes confident", () => {
    const m = new MarkovPredictor(1);
    const seq: Move[] = ["rock", "paper", "scissors"];
    for (let i = 0; i < 30; i++) m.update(seq[i % 3] ?? "rock");
    // last move was scissors, so rock comes next
    const p = m.predict();
    expect(topMoves(p.probs)).toEqual(["rock"]);
    expect(confidenceOf(p.probs)).toBeGreaterThan(0.7);
    expect(p.source).toBe("last 1 move");
  });

  it("uses a longer memory when the pattern needs it", () => {
    // After 'rock' the player alternates paper, scissors: only the last TWO moves tell which.
    const seq: Move[] = ["rock", "paper", "rock", "scissors"];
    const order1 = new MarkovPredictor(1);
    const order2 = new MarkovPredictor(2);
    const played = 39; // ends on a 'rock' (index 38), after which the sequence continues with 'scissors'
    for (let i = 0; i < played; i++) {
      order1.update(seq[i % 4] ?? "rock");
      order2.update(seq[i % 4] ?? "rock");
    }
    const next = seq[played % 4] ?? "rock";
    expect(next).toBe("scissors");
    expect(topMoves(order2.predict().probs)).toEqual([next]);
    expect(confidenceOf(order2.predict().probs)).toBeGreaterThan(0.7);
    expect(confidenceOf(order1.predict().probs)).toBeLessThan(0.6); // 'rock' is followed by paper or scissors equally often
  });

  it("falls back to frequency before it has seen a context twice", () => {
    const m = new MarkovPredictor(3);
    expect(m.predict().source).toBe("frequency");
    m.update("rock");
    m.update("rock");
    expect(m.predict().source).not.toBe("");
    expect(sumOf(m.predict().probs)).toBeCloseTo(1, 9);
  });

  it("can be created from the model kind", () => {
    expect(createPredictor("frequency")).toBeInstanceOf(FrequencyPredictor);
    expect(createPredictor("markov", 3)).toBeInstanceOf(MarkovPredictor);
  });
});

describe("rounds and stats", () => {
  it("the bot commits before it sees the player's move", () => {
    const a = new FrequencyPredictor();
    const b = new FrequencyPredictor();
    for (const m of ["rock", "rock", "paper"] as const) {
      a.update(m);
      b.update(m);
    }
    const first = chooseBotMove(a, seededRng(5));
    const round = playRound(b, "scissors", seededRng(5));
    expect(round.bot).toBe(first.bot);
  });

  it("counts wins, losses, ties, win rate and prediction accuracy", () => {
    const p = new FrequencyPredictor();
    const rng = seededRng(9);
    const rounds = ["rock", "rock", "rock", "rock", "paper"].map((m) =>
      playRound(p, m as Move, rng),
    );
    const s = summarise(rounds);
    expect(s.rounds).toBe(5);
    expect(s.playerWins + s.botWins + s.ties).toBe(5);
    expect(s.botWinRate).toBeCloseTo(s.botWins / 5, 9);
    expect(rounds[0]?.expected).toBeNull(); // no favourite on round one
    expect(s.accuracy).not.toBeNull();
    const series = winRateSeries(rounds);
    expect(series).toHaveLength(5);
    expect(series[4]).toBeCloseTo(s.botWins / 5, 9);
  });

  it("has sensible empty stats", () => {
    expect(summarise([])).toEqual({
      rounds: 0,
      playerWins: 0,
      botWins: 0,
      ties: 0,
      botWinRate: 0,
      accuracy: null,
    });
  });
});

describe("the bot against simulated players (seeded, so the numbers are repeatable)", () => {
  const N = 1000;

  it("beats a biased player (70% rock, 20% paper, 10% scissors) above 60%", () => {
    for (const [kind, order] of [
      ["markov", 2],
      ["frequency", 2],
    ] as const) {
      const { stats } = simulate(biasedPlayer([7, 2, 1]), kind, order, N, seededRng(21));
      expect(stats.botWinRate, `${kind}`).toBeGreaterThan(0.6);
      expect(stats.botWins).toBeGreaterThan(stats.playerWins * 3);
    }
  });

  it("beats a fixed-cycle player (rock, paper, scissors, ...) above 60% with the Markov model", () => {
    for (const order of [1, 2, 3] as const) {
      const cycle = cyclePlayer(["rock", "paper", "scissors"]);
      const { stats } = simulate(cycle, "markov", order, N, seededRng(22));
      expect(stats.botWinRate, `order ${order}`).toBeGreaterThan(0.6);
    }
    const longer = cyclePlayer(["rock", "rock", "paper", "scissors", "paper"]);
    expect(simulate(longer, "markov", 2, N, seededRng(23)).stats.botWinRate).toBeGreaterThan(0.6);
  });

  it("shows why the models are switchable: frequency alone cannot see a cycle", () => {
    const cycle = cyclePlayer(["rock", "paper", "scissors"]);
    const { stats } = simulate(cycle, "frequency", 2, N, seededRng(24));
    expect(stats.botWinRate).toBeLessThan(0.45);
  });

  it("stays near 33% against a uniformly random player: it finds no pattern that is not there", () => {
    for (const kind of ["markov", "frequency"] as const) {
      const { stats } = simulate(uniformPlayer, kind, 2, 3000, seededRng(25));
      expect(stats.botWinRate, kind).toBeGreaterThan(0.28);
      expect(stats.botWinRate, kind).toBeLessThan(0.39);
      expect(stats.playerWins / stats.rounds).toBeGreaterThan(0.28);
    }
  });

  it("recovers when the player switches from one habit to another", () => {
    const strategy = (history: readonly Move[]): Move =>
      history.length < 200 ? "rock" : history.length % 3 === 0 ? "paper" : "scissors";
    const { rounds } = simulate(strategy, "markov", 2, 600, seededRng(26));
    const tail = summarise(rounds.slice(400));
    expect(tail.botWinRate).toBeGreaterThan(0.6);
  });
});
