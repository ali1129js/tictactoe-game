import { counterTo, outcome } from "./game";
import type { Move, Outcome } from "./game";
import { confidenceOf, topMoves } from "./models";
import type { Prediction, Predictor } from "./models";
import { pick } from "../rng";
import type { Rng } from "../rng";

export interface Round {
  player: Move;
  bot: Move;
  outcome: Outcome;
  /** What the model believed before this round. */
  prediction: Prediction;
  /** The single move the model expected, or null when it had no favourite (a tie, e.g. at the start). */
  expected: Move | null;
  confidence: number;
}

/** The bot's move for the current state: it plays whatever beats the move it expects. */
export function chooseBotMove(
  predictor: Predictor,
  rng: Rng,
): { bot: Move; prediction: Prediction } {
  const prediction = predictor.predict();
  const expected = pick(rng, topMoves(prediction.probs));
  return { bot: counterTo(expected), prediction };
}

/**
 * Plays one round. The bot commits to its move before seeing the player's, then learns from it.
 * The player's move is passed in, but the bot's choice only depends on earlier rounds.
 */
export function playRound(predictor: Predictor, player: Move, rng: Rng): Round {
  const { bot, prediction } = chooseBotMove(predictor, rng);
  const round = buildRound(prediction, bot, player);
  predictor.update(player);
  return round;
}

/** Assembles the record of a round from what the model believed, what the bot played and what the player played. */
export function buildRound(prediction: Prediction, bot: Move, player: Move): Round {
  const favourites = topMoves(prediction.probs);
  return {
    player,
    bot,
    outcome: outcome(player, bot),
    prediction,
    expected: favourites.length === 1 ? (favourites[0] ?? null) : null,
    confidence: confidenceOf(prediction.probs),
  };
}

export interface Stats {
  rounds: number;
  playerWins: number;
  botWins: number;
  ties: number;
  /** Bot wins divided by all rounds. */
  botWinRate: number;
  /** Share of rounds, among those where the model had a favourite, in which the favourite was right. */
  accuracy: number | null;
}

export function summarise(rounds: readonly Round[]): Stats {
  let playerWins = 0;
  let botWins = 0;
  let ties = 0;
  let judged = 0;
  let correct = 0;
  for (const r of rounds) {
    if (r.outcome === "player") playerWins++;
    else if (r.outcome === "bot") botWins++;
    else ties++;
    if (r.expected !== null) {
      judged++;
      if (r.expected === r.player) correct++;
    }
  }
  return {
    rounds: rounds.length,
    playerWins,
    botWins,
    ties,
    botWinRate: rounds.length === 0 ? 0 : botWins / rounds.length,
    accuracy: judged === 0 ? null : correct / judged,
  };
}

/** Cumulative bot win rate after each round, for the chart. */
export function winRateSeries(rounds: readonly Round[]): number[] {
  let wins = 0;
  return rounds.map((r, i) => {
    if (r.outcome === "bot") wins++;
    return wins / (i + 1);
  });
}
