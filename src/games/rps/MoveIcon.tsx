import type { Move } from "../../lib/rps/game";

/** Simple line icons. Decorative: the buttons and text carry the names. */
export function MoveIcon({ move }: { move: Move }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
      className="move-icon"
    >
      {move === "rock" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M9 28l5-14 13-5 11 7 3 13-8 9H17z" />
          <path d="M14 14l8 9 9-2M22 23l-2 13" />
        </g>
      )}
      {move === "paper" && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <path d="M12 7h18l8 8v26H12z" />
          <path d="M30 7v8h8M18 24h14M18 31h14" />
        </g>
      )}
      {move === "scissors" && (
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="14" cy="36" r="5" />
          <circle cx="34" cy="36" r="5" />
          <path d="M17 32L34 8M31 32L14 8" />
        </g>
      )}
    </svg>
  );
}
