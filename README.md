# Game Arcade

Two classic games against AI you can watch thinking, rebuilt in 2026 from two 2018 projects
(`tictactoe-game` and `rps-game`). React 19, TypeScript in strict mode, Vite. No backend, no
tracking, no external requests.

## The games

### Tic-tac-toe: an AI that cannot lose

- **Perfect**: minimax with alpha-beta pruning. It never loses (this is tested over every reachable position).
- **Medium**: plays the best move, but about 3 times in 10 plays a random one instead.
- **Random**: plays any legal move.
- **Show why the AI moved** opens a panel with the position the AI saw, the verdict for every move it
  considered (win in N, draw, lose in N), and how many positions the search visited with and without
  pruning.

Scores are exact: a win scores `10 − plies`, a loss `plies − 10`, so the AI prefers faster wins and
slower losses. Each root move gets its own full-window search, so alpha-beta and plain minimax report
the same value for every move; pruning only changes how much work is done. From the empty board, plain
minimax visits 549,945 positions and alpha-beta 34,202 (about 16× fewer).

### Rock-paper-scissors: a bot that learns you

The bot predicts your next move, then plays the move that beats it. Two models, switchable at any time
without losing your history:

- **Frequency**: how often you played each move, with Laplace smoothing and a slow decay so recent habits count more.
- **Pattern (Markov)**: an n-gram model over your last 1, 2 or 3 moves. It uses the longest context it has
  seen at least twice and backs off to shorter ones, then to plain frequency. It picks up cycles
  (R, P, S, R, P, S…) that frequency counting cannot see.

Live stats show rounds, wins, the bot's win rate, how often its favourite guess was right, a win-rate
chart against the 33% chance line, and the model's current probabilities and confidence.
Play with the buttons or the keys R / P / S (or 1 / 2 / 3).

## What the tests prove

`npm test` runs 88 tests, including:

- **Minimax never loses**: exhaustively, as X and as O, branching over every opponent move and every equally-good AI move.
- **Alpha-beta equals minimax**: identical evaluations and best moves in all 5,478 reachable positions; node counts are verified (549,945 for plain minimax from the empty board) and pruning always visits fewer.
- **The bot beats predictable players**: above 60% against a biased player (70/20/10) and above 60% against a fixed cycle, over 1,000 rounds with seeded randomness (across 30 seeds the biased result was 67–73%, the cycle 99%).
- **The bot is near 33% against uniform random play**, between 28% and 39% over 3,000 rounds (30 seeds: 32–35%).
- Themes meet WCAG contrast (AAA 7:1 for High contrast, AA 4.5:1 for Light and Dark, 3:1 for borders and focus rings), settings are validated on load, keyboard play and screen-reader labels work.

## Accessibility

Keyboard: arrow keys move around the board, Enter/Space plays, arrow keys switch game tabs, R/P/S play
rock-paper-scissors. Squares have names ("top left, empty"), results and AI moves are announced through a
live region, the chart has a text equivalent, and colour is never the only cue (X and O are letters; move
verdicts use dashed/dotted borders and words). Three themes (Light, Dark, High contrast) follow your
operating system on first visit and are remembered. `prefers-reduced-motion` is respected. Axe reports
no violations in any theme at 1280px and 390px.

## Development

```sh
npm install
npm run dev          # http://localhost:5173/tictactoe-game/
npm test             # vitest
npm run lint && npm run typecheck && npm run format:check
npm run build
```

`scripts/e2e-shots.mjs` drives a built preview in headless Chrome, takes screenshots of both games in
all three themes at 1280px and 390px, and runs axe and overflow checks.

## Deploying

`docs/deploy.workflow.yml` is a GitHub Pages workflow (lint, typecheck, test, build, deploy). It lives
in `docs/` because the credentials used to prepare this branch could not create files in
`.github/workflows`. To use it, copy it to `.github/workflows/deploy.yml` and set Pages to "GitHub
Actions". The app is built with `base: "/tictactoe-game/"`.

## Layout

```
src/lib/ttt     engine, minimax + alpha-beta, difficulty levels
src/lib/rps     moves, predictors (frequency, Markov), bot, simulations
src/games       the two game screens
src/theme       theme tokens, contrast maths, switcher
src/test        tests
```
