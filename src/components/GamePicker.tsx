import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { GAME_IDS } from "../lib/storage";
import type { GameId } from "../lib/storage";
import { GAME_LABELS } from "./games";

interface Props {
  value: GameId;
  onChange: (game: GameId) => void;
}

/** Accessible tabs: arrow keys, Home and End move between games (roving tabindex). */
export function GamePicker({ value, onChange }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % GAME_IDS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + GAME_IDS.length) % GAME_IDS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = GAME_IDS.length - 1;
    else return;
    event.preventDefault();
    const id = GAME_IDS[next];
    if (id === undefined) return;
    onChange(id);
    refs.current[id]?.focus();
  };

  return (
    <div role="tablist" aria-label="Choose a game" className="tabs">
      {GAME_IDS.map((id, index) => (
        <button
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={value === id}
          aria-controls={`panel-${id}`}
          tabIndex={value === id ? 0 : -1}
          className="tab"
          onClick={() => onChange(id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {GAME_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
