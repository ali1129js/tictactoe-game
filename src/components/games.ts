import type { GameId } from "../lib/storage";

export const GAME_LABELS: Readonly<Record<GameId, string>> = {
  tictactoe: "Tic-tac-toe",
  rps: "Rock-paper-scissors",
};
