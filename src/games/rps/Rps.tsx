import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "../../components/Segmented";
import { useStoredState } from "../../hooks/useStoredState";
import { DEFAULT_RPS, KEYS, rpsSettingsSchema } from "../../lib/storage";
import type { Rng } from "../../lib/rng";
import { buildRound, chooseBotMove, summarise, winRateSeries } from "../../lib/rps/bot";
import type { Round } from "../../lib/rps/bot";
import { MOVES, MOVE_LABELS } from "../../lib/rps/game";
import type { Move } from "../../lib/rps/game";
import {
  MODEL_KINDS,
  MODEL_LABELS,
  ORDERS,
  confidenceOf,
  createPredictor,
  topMoves,
} from "../../lib/rps/models";
import { MoveIcon } from "./MoveIcon";
import { Sparkline } from "./Sparkline";

interface Props {
  rng?: Rng;
}

const KEY_TO_MOVE: Readonly<Record<string, Move>> = {
  r: "rock",
  p: "paper",
  s: "scissors",
  "1": "rock",
  "2": "paper",
  "3": "scissors",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

function describeRound(round: Round): string {
  const verdict =
    round.outcome === "tie"
      ? "Tie."
      : round.outcome === "player"
        ? "You win this round."
        : "Bot wins this round.";
  return `You played ${MOVE_LABELS[round.player]}, the bot played ${MOVE_LABELS[round.bot]}. ${verdict}`;
}

export function Rps({ rng = Math.random }: Props) {
  const [settings, setSettings] = useStoredState(KEYS.rps, rpsSettingsSchema, DEFAULT_RPS);
  const [rounds, setRounds] = useState<Round[]>([]);

  // The model is rebuilt from the player's history, so switching models keeps what the player has shown so far.
  const { predictor, prediction } = useMemo(() => {
    const model = createPredictor(settings.model, settings.order);
    for (const round of rounds) model.update(round.player);
    return { predictor: model, prediction: model.predict() };
  }, [settings.model, settings.order, rounds]);

  const stats = useMemo(() => summarise(rounds), [rounds]);
  const series = useMemo(() => winRateSeries(rounds), [rounds]);
  const lastRound = rounds[rounds.length - 1];

  const choose = useCallback(
    (move: Move) => {
      const { bot, prediction: seen } = chooseBotMove(predictor, rng);
      setRounds((prev) => [...prev, buildRound(seen, bot, move)]);
    },
    [predictor, rng],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      const move = KEY_TO_MOVE[event.key.toLowerCase()];
      if (move) choose(move);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  const favourites = topMoves(prediction.probs);
  const favourite = favourites.length === 1 ? favourites[0] : undefined;
  const confidence = confidenceOf(prediction.probs);

  return (
    <div className="game">
      <div className="game-grid">
        <div className="game-main">
          <p className="status" role="status" aria-live="polite">
            {lastRound
              ? describeRound(lastRound)
              : "Pick a move to start. The bot is learning how you play."}
          </p>
          <div role="group" aria-label="Your move" className="moves">
            {MOVES.map((move) => (
              <button key={move} type="button" className="move" onClick={() => choose(move)}>
                <MoveIcon move={move} />
                <span>{MOVE_LABELS[move]}</span>
              </button>
            ))}
          </div>
          <p className="hint muted">Keyboard: R, P, S (or 1, 2, 3) to play.</p>

          {settings.showPrediction && (
            <section className="panel" aria-labelledby="expect-title">
              <h3 id="expect-title" className="panel-title">
                What the bot expects
              </h3>
              <p>
                {favourite
                  ? `The bot thinks you will play ${MOVE_LABELS[favourite]} (${pct(confidence)} sure, from your ${prediction.source}).`
                  : "No clear favourite yet: it is guessing."}
              </p>
              <ul className="bars">
                {MOVES.map((move) => (
                  <li key={move}>
                    <span className="bar-label">{MOVE_LABELS[move]}</span>
                    <span className="bar" aria-hidden="true">
                      <span className="bar-fill" style={{ width: pct(prediction.probs[move]) }} />
                    </span>
                    <span className="bar-value">{pct(prediction.probs[move])}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="game-side">
          <section className="panel" aria-labelledby="stats-title">
            <h3 id="stats-title" className="panel-title">
              Live stats
            </h3>
            <dl className="stat-grid">
              <div>
                <dt>Rounds</dt>
                <dd>{stats.rounds}</dd>
              </div>
              <div>
                <dt>You won</dt>
                <dd>{stats.playerWins}</dd>
              </div>
              <div>
                <dt>Bot won</dt>
                <dd>{stats.botWins}</dd>
              </div>
              <div>
                <dt>Ties</dt>
                <dd>{stats.ties}</dd>
              </div>
              <div>
                <dt>Bot win rate</dt>
                <dd>{stats.rounds === 0 ? "–" : pct(stats.botWinRate)}</dd>
              </div>
              <div>
                <dt>Prediction accuracy</dt>
                <dd>{stats.accuracy === null ? "–" : pct(stats.accuracy)}</dd>
              </div>
            </dl>
            <Sparkline series={series} />
            <p className="muted small">
              Random play gives the bot about 33%. Predictable play pushes it higher.
            </p>
          </section>

          <div className="panel">
            <h3 className="panel-title">Bot settings</h3>
            <div className="field">
              <span className="field-label">Model</span>
              <Segmented
                label="Model"
                value={settings.model}
                options={MODEL_KINDS.map((m) => ({ value: m, label: MODEL_LABELS[m] }))}
                onChange={(model) => setSettings({ ...settings, model })}
              />
              <p className="muted small">
                {settings.model === "frequency"
                  ? "Counts how often you play each move, favouring recent ones."
                  : "Looks at your last few moves to predict the next one, so it can learn patterns and cycles."}
              </p>
            </div>
            {settings.model === "markov" && (
              <div className="field">
                <span className="field-label">Memory (moves)</span>
                <Segmented
                  label="Memory in moves"
                  value={settings.order}
                  options={ORDERS.map((o) => ({ value: o, label: String(o) }))}
                  onChange={(order) => setSettings({ ...settings, order })}
                />
              </div>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={settings.showPrediction}
                onChange={(event) =>
                  setSettings({ ...settings, showPrediction: event.target.checked })
                }
              />
              Show what the bot expects
            </label>
            <button type="button" className="button" onClick={() => setRounds([])}>
              Reset stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
