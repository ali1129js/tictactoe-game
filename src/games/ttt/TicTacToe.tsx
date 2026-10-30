import { useEffect, useReducer, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Segmented } from "../../components/Segmented";
import { useStoredState } from "../../hooks/useStoredState";
import { DEFAULT_TTT, KEYS, tttSettingsSchema } from "../../lib/storage";
import type { TttSettings } from "../../lib/storage";
import { DIFFICULTIES, DIFFICULTY_LABELS, chooseMove } from "../../lib/ttt/ai";
import { isOver, nextPlayer, winnerLine } from "../../lib/ttt/engine";
import type { Player } from "../../lib/ttt/engine";
import type { Rng } from "../../lib/rng";
import { cellName } from "./names";
import { initialState, reducer } from "./state";
import { WhyPanel } from "./WhyPanel";

interface Props {
  /** Pause before the AI moves, so the move is visible. Tests pass 0. */
  aiDelayMs?: number;
  rng?: Rng;
}

const humanFor = (first: TttSettings["first"]): Player => (first === "you" ? "X" : "O");

export function TicTacToe({ aiDelayMs = 450, rng = Math.random }: Props) {
  const [settings, setSettings] = useStoredState(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT);
  const [state, dispatch] = useReducer(reducer, settings.first, (first) =>
    initialState(humanFor(first)),
  );
  const [focusIndex, setFocusIndex] = useState(4);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  const ai: Player = state.human === "X" ? "O" : "X";
  const over = isOver(state.board);
  const turn = nextPlayer(state.board);
  const aiTurn = !over && turn === ai;
  const result = winnerLine(state.board);
  const { difficulty } = settings;

  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      const decision = chooseMove(state.board, ai, difficulty, rng);
      dispatch({
        type: "move",
        index: decision.move,
        by: "ai",
        explained: { before: state.board, player: ai, decision },
      });
    }, aiDelayMs);
    return () => clearTimeout(timer);
  }, [aiTurn, state.board, ai, difficulty, rng, aiDelayMs]);

  const update = (patch: Partial<TttSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (next.difficulty !== settings.difficulty || next.first !== settings.first) {
      dispatch({ type: "configure", human: humanFor(next.first), resetScores: true });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = row * 3 + ((col + 2) % 3);
        break;
      case "ArrowRight":
        next = row * 3 + ((col + 1) % 3);
        break;
      case "ArrowUp":
        next = ((row + 2) % 3) * 3 + col;
        break;
      case "ArrowDown":
        next = ((row + 1) % 3) * 3 + col;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 8;
        break;
      default:
        return;
    }
    event.preventDefault();
    cells.current[next]?.focus();
  };

  let status: string;
  if (result) {
    status =
      result.player === state.human ? `You win! (${result.player})` : `AI wins (${result.player}).`;
  } else if (over) {
    status = "It's a draw.";
  } else if (aiTurn) {
    status = `AI (${ai}) is thinking…`;
  } else {
    status = `Your turn (${state.human}).`;
  }

  const { you, ai: aiWins, draws } = state.scores;

  return (
    <div className="game">
      <div className="game-grid">
        <div className="game-main">
          <p className="status" role="status" aria-live="polite">
            {status}
          </p>
          <div role="group" aria-label="Tic-tac-toe board" className="board">
            {state.board.map((cell, index) => {
              const winning = result?.line.includes(index) === true;
              const playable = cell === null && !over && !aiTurn;
              return (
                <button
                  key={index}
                  ref={(el) => {
                    cells.current[index] = el;
                  }}
                  type="button"
                  className={`cell${winning ? " win" : ""}${state.lastMove === index ? " last" : ""}`}
                  aria-label={`${cellName(index)}, ${cell ?? "empty"}`}
                  aria-disabled={!playable}
                  tabIndex={focusIndex === index ? 0 : -1}
                  onFocus={() => setFocusIndex(index)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                  onClick={() => {
                    if (playable) dispatch({ type: "move", index, by: "human" });
                  }}
                >
                  {cell !== null && <span className={`glyph glyph-${cell}`}>{cell}</span>}
                </button>
              );
            })}
          </div>
          <p className="hint muted">
            Use the arrow keys to move between squares, Enter or Space to play.
          </p>
          <dl className="scoreboard" aria-label="Scoreboard">
            <div>
              <dt>You ({state.human})</dt>
              <dd>{you}</dd>
            </div>
            <div>
              <dt>AI ({ai})</dt>
              <dd>{aiWins}</dd>
            </div>
            <div>
              <dt>Draws</dt>
              <dd>{draws}</dd>
            </div>
          </dl>
        </div>

        <div className="game-side">
          <div className="panel">
            <h3 className="panel-title">Settings</h3>
            <div className="field">
              <span className="field-label">Difficulty</span>
              <Segmented
                label="Difficulty"
                value={settings.difficulty}
                options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
                onChange={(d) => update({ difficulty: d })}
              />
              <p className="muted small">
                {difficulty === "random" && "Plays any legal move."}
                {difficulty === "medium" &&
                  "Plays the best move, but blunders about 3 times in 10."}
                {difficulty === "perfect" && "Minimax with alpha-beta pruning. It cannot lose."}
              </p>
            </div>
            <div className="field">
              <span className="field-label">Who moves first</span>
              <Segmented
                label="Who moves first"
                value={settings.first}
                options={[
                  { value: "you", label: "You" },
                  { value: "ai", label: "AI" },
                ]}
                onChange={(first) => update({ first })}
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.showWhy}
                onChange={(event) => update({ showWhy: event.target.checked })}
              />
              Show why the AI moved
            </label>
            <button type="button" className="button" onClick={() => dispatch({ type: "new" })}>
              New game
            </button>
          </div>
          {settings.showWhy && <WhyPanel explained={state.explained} difficulty={difficulty} />}
        </div>
      </div>
    </div>
  );
}
