import { emptyBoard, isOver, nextPlayer, play, winner } from "../../lib/ttt/engine";
import type { Board, Player } from "../../lib/ttt/engine";
import type { Decision } from "../../lib/ttt/ai";

export interface Explained {
  /** The position the AI saw. */
  before: Board;
  player: Player;
  decision: Decision;
}

export interface Scores {
  you: number;
  ai: number;
  draws: number;
}

export interface GameState {
  board: Board;
  human: Player;
  scores: Scores;
  lastMove: number | null;
  /** The AI's most recent decision, for the "why" panel. */
  explained: Explained | null;
}

export type Action =
  | { type: "move"; index: number; by: "human" | "ai"; explained?: Explained }
  | { type: "new" }
  | { type: "configure"; human: Player; resetScores: boolean };

export function initialState(human: Player): GameState {
  return {
    board: emptyBoard(),
    human,
    scores: { you: 0, ai: 0, draws: 0 },
    lastMove: null,
    explained: null,
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "new":
      return { ...state, board: emptyBoard(), lastMove: null, explained: null };
    case "configure":
      return {
        ...initialState(action.human),
        scores: action.resetScores ? { you: 0, ai: 0, draws: 0 } : state.scores,
      };
    case "move": {
      if (isOver(state.board) || state.board[action.index] !== null) return state;
      const mover = nextPlayer(state.board);
      // Only the side whose turn it is may move.
      if ((action.by === "human") !== (mover === state.human)) return state;
      const board = play(state.board, action.index, mover);
      let scores = state.scores;
      if (isOver(board)) {
        const won = winner(board);
        scores =
          won === null
            ? { ...scores, draws: scores.draws + 1 }
            : won === state.human
              ? { ...scores, you: scores.you + 1 }
              : { ...scores, ai: scores.ai + 1 };
      }
      return {
        ...state,
        board,
        scores,
        lastMove: action.index,
        explained: action.explained ?? state.explained,
      };
    }
  }
}
