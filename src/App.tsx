import { useEffect } from "react";
import { GamePicker } from "./components/GamePicker";
import { GAME_LABELS } from "./components/games";
import { Rps } from "./games/rps/Rps";
import { TicTacToe } from "./games/ttt/TicTacToe";
import { useStoredState } from "./hooks/useStoredState";
import { KEYS, gameSchema, themeSchema } from "./lib/storage";
import { applyTheme, preferredTheme } from "./theme/themes";
import { ThemeSwitcher } from "./theme/ThemeSwitcher";

export function App() {
  const [theme, setTheme] = useStoredState(KEYS.theme, themeSchema, preferredTheme());
  const [game, setGame] = useStoredState(KEYS.game, gameSchema, "tictactoe");

  useEffect(() => applyTheme(theme), [theme]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to the game
      </a>
      <header className="app-header">
        <div>
          <h1 className="app-title">Game Arcade</h1>
          <p className="muted tagline">Two classic games against AI that you can see thinking.</p>
        </div>
        <ThemeSwitcher value={theme} onChange={setTheme} />
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <GamePicker value={game} onChange={setGame} />
        <div
          role="tabpanel"
          id={`panel-${game}`}
          aria-labelledby={`tab-${game}`}
          className="tabpanel"
        >
          <h2 className="game-title">{GAME_LABELS[game]}</h2>
          {game === "tictactoe" ? <TicTacToe /> : <Rps />}
        </div>
      </main>
      <footer className="app-footer muted small">
        Rebuilt in 2026 (originally two 2018 projects). Minimax with alpha-beta pruning, and a bot
        that learns your habits.
      </footer>
    </div>
  );
}
