import { useMemo } from "react";
import { cellName } from "./names";
import type { Explained } from "./state";
import type { Difficulty } from "../../lib/ttt/ai";
import { DIFFICULTY_LABELS } from "../../lib/ttt/ai";
import { describeScore, searchCost } from "../../lib/ttt/minimax";

interface Props {
  explained: Explained | null;
  difficulty: Difficulty;
}

function scoreText(score: number): string {
  const { verdict, moves } = describeScore(score);
  if (verdict === "draw") return "draw";
  const plural = moves === 1 ? "move" : "moves";
  return verdict === "win" ? `AI wins in ${moves} ${plural}` : `AI loses in ${moves} ${plural}`;
}

function shortScore(score: number): string {
  const { verdict, moves } = describeScore(score);
  if (verdict === "draw") return "Draw";
  return verdict === "win" ? `Win ${moves}` : `Lose ${moves}`;
}

/** Explains the AI's last decision: what it saw, how each move scored and what the search cost. */
export function WhyPanel({ explained, difficulty }: Props) {
  const cost = useMemo(
    () => (explained ? searchCost(explained.before, explained.player) : null),
    [explained],
  );

  if (!explained || !cost) {
    return (
      <section className="panel why" aria-labelledby="why-title">
        <h3 id="why-title" className="panel-title">
          Why the AI played that
        </h3>
        <p className="muted">The AI has not moved yet. Once it does, its reasoning appears here.</p>
      </section>
    );
  }

  const { before, player, decision } = explained;
  const byScore = [...decision.analysis.evaluations].sort((a, b) => b.score - a.score);
  const scores = new Map(decision.analysis.evaluations.map((e) => [e.move, e.score]));
  const chosenScore = scores.get(decision.move) ?? 0;
  const mistake = decision.reason === "random" && !decision.analysis.best.includes(decision.move);
  const saving = cost.alphabeta > 0 ? Math.round((cost.minimax / cost.alphabeta) * 10) / 10 : 1;

  let headline: string;
  if (decision.reason === "optimal") {
    headline = `AI (${player}) played ${cellName(decision.move)}: the best it could find, a ${scoreText(chosenScore)} line.`;
  } else if (mistake) {
    headline = `AI (${player}) played ${cellName(decision.move)} at random (${DIFFICULTY_LABELS[difficulty]} level makes mistakes on purpose). Best was ${scoreText(decision.analysis.bestScore)}.`;
  } else {
    headline = `AI (${player}) played ${cellName(decision.move)} at random, which happened to be among its best moves.`;
  }

  return (
    <section className="panel why" aria-labelledby="why-title">
      <h3 id="why-title" className="panel-title">
        Why the AI played that
      </h3>
      <p>{headline}</p>
      <div className="mini" aria-hidden="true">
        {before.map((cell, index) => {
          const score = scores.get(index);
          const chosen = index === decision.move;
          const verdict = score === undefined ? "none" : describeScore(score).verdict;
          return (
            <div key={index} className={`mini-cell verdict-${verdict}${chosen ? " chosen" : ""}`}>
              {cell !== null ? (
                <span className={`glyph glyph-${cell}`}>{cell}</span>
              ) : (
                <span>{score === undefined ? "" : shortScore(score)}</span>
              )}
            </div>
          );
        })}
      </div>
      <h4 className="sub-title">Every move it considered</h4>
      <ul className="eval-list">
        {byScore.map(({ move, score }) => (
          <li key={move} className={move === decision.move ? "played" : undefined}>
            {cellName(move)}: {scoreText(score)}
            {move === decision.move ? " (played)" : ""}
          </li>
        ))}
      </ul>
      <p className="muted">
        Search cost: alpha-beta pruning visited {cost.alphabeta.toLocaleString("en")} positions,
        where plain minimax needs {cost.minimax.toLocaleString("en")}
        {saving > 1 ? ` (${saving}× more)` : ""}. Both give the same scores.
      </p>
    </section>
  );
}
