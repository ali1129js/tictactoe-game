interface Props {
  /** Cumulative bot win rate after each round, 0..1. */
  series: readonly number[];
}

const W = 320;
const H = 100;
const PAD = 6;
const CHANCE = 1 / 3;

/** The bot's running win rate, with the one-in-three chance level as a dashed line. */
export function Sparkline({ series }: Props) {
  const y = (v: number) => PAD + (1 - v) * (H - 2 * PAD);
  const x = (i: number) =>
    series.length <= 1 ? W / 2 : PAD + (i / (series.length - 1)) * (W - 2 * PAD);
  const points = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  const description =
    last === undefined
      ? "Bot win rate chart: no rounds played yet."
      : `Bot win rate chart: ${Math.round(last * 100)}% after ${series.length} rounds. Chance level is 33%.`;

  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} preserveAspectRatio="none">
        <line x1={PAD} x2={W - PAD} y1={y(CHANCE)} y2={y(CHANCE)} className="spark-chance" />
        {series.length > 1 && <polyline points={points} className="spark-line" fill="none" />}
        {series.length === 1 && last !== undefined && (
          <circle cx={x(0)} cy={y(last)} r="3" className="spark-dot" />
        )}
      </svg>
      <figcaption className="muted small">
        Bot win rate over time (dashed: 33% chance level)
      </figcaption>
    </figure>
  );
}
