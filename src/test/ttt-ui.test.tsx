import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { seededRng } from "../lib/rng";
import { KEYS } from "../lib/storage";
import { TicTacToe } from "../games/ttt/TicTacToe";

const renderGame = (seed = 1) => render(<TicTacToe aiDelayMs={0} rng={seededRng(seed)} />);
const cells = () =>
  within(screen.getByRole("group", { name: "Tic-tac-toe board" })).getAllByRole("button");
const symbols = () =>
  cells().map((c) => /, (X|O)$/.exec(c.getAttribute("aria-label") ?? "")?.[1] ?? "");
const status = () => screen.getByRole("status").textContent ?? "";

describe("tic-tac-toe UI", () => {
  it("shows nine labelled squares and whose turn it is", () => {
    renderGame();
    expect(cells()).toHaveLength(9);
    expect(screen.getByRole("button", { name: "centre, empty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "top left, empty" })).toBeInTheDocument();
    expect(status()).toBe("Your turn (X).");
  });

  it("places your X and the AI answers with an O", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "top left, empty" }));
    expect(screen.getByRole("button", { name: "top left, X" })).toBeInTheDocument();
    await waitFor(() => expect(symbols().filter((s) => s === "O")).toHaveLength(1));
    expect(status()).toBe("Your turn (X).");
    // A perfect AI answers a corner opening in the centre.
    expect(screen.getByRole("button", { name: "centre, O" })).toBeInTheDocument();
  });

  it("ignores clicks on taken squares", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "top left, empty" }));
    await waitFor(() => expect(symbols().filter((s) => s === "O")).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "top left, X" }));
    await user.click(screen.getByRole("button", { name: "centre, O" }));
    expect(symbols().filter(Boolean)).toHaveLength(2);
  });

  it("lets the AI open when it moves first, and then you play O", async () => {
    localStorage.setItem(
      KEYS.ttt,
      JSON.stringify({ difficulty: "perfect", first: "ai", showWhy: false }),
    );
    renderGame();
    await waitFor(() => expect(symbols().filter((s) => s === "X")).toHaveLength(1));
    expect(status()).toBe("Your turn (O).");
  });

  it("moves focus with the arrow keys, wrapping at the edges, with one tab stop", async () => {
    const user = userEvent.setup();
    renderGame();
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1);
    const at = (name: string) => screen.getByRole("button", { name });
    at("centre, empty").focus();
    await user.keyboard("{ArrowRight}");
    expect(at("middle right, empty")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(at("middle left, empty")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(at("top left, empty")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(at("bottom left, empty")).toHaveFocus();
    await user.keyboard("{End}");
    expect(at("bottom right, empty")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(at("top left, empty")).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(at("middle right, empty")).toHaveFocus();
  });

  it("can be played with the keyboard alone", async () => {
    const user = userEvent.setup();
    renderGame();
    screen.getByRole("button", { name: "centre, empty" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "centre, X" })).toBeInTheDocument();
    await waitFor(() => expect(symbols().filter((s) => s === "O")).toHaveLength(1));
    await user.keyboard(" "); // focus stays on the (now taken) square, so Space does nothing
    expect(symbols().filter(Boolean)).toHaveLength(2);
  });

  it("never lets you beat the perfect AI, and keeps score", async () => {
    const user = userEvent.setup();
    renderGame(7);
    for (let game = 1; game <= 3; game++) {
      for (let guard = 0; guard < 12 && !/win|draw/i.test(status()); guard++) {
        const free = cells().find((c) => c.getAttribute("aria-disabled") === "false");
        if (!free) {
          await waitFor(() =>
            expect(
              cells().some((c) => c.getAttribute("aria-disabled") === "false") ||
                /win|draw/i.test(status()),
            ).toBe(true),
          );
          continue;
        }
        await user.click(free);
      }
      expect(status()).not.toMatch(/You win/);
      await user.click(screen.getByRole("button", { name: "New game" }));
      expect(symbols().filter(Boolean)).toHaveLength(0);
    }
    const text = screen.getByLabelText("Scoreboard").textContent ?? "";
    const [, ai, draws] = /AI \(O\)(\d+)Draws(\d+)/.exec(text) ?? [];
    expect(Number(ai) + Number(draws)).toBe(3);
  });

  it("changes difficulty, remembers it and resets the scoreboard", async () => {
    const user = userEvent.setup();
    const { unmount } = renderGame();
    await user.click(screen.getByRole("button", { name: "Random" }));
    expect(screen.getByRole("button", { name: "Random" })).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(localStorage.getItem(KEYS.ttt) ?? "{}")).toMatchObject({
      difficulty: "random",
    });
    unmount();
    renderGame();
    expect(screen.getByRole("button", { name: "Random" })).toHaveAttribute("aria-pressed", "true");
  });

  it("ignores corrupt saved settings", () => {
    localStorage.setItem(KEYS.ttt, JSON.stringify({ difficulty: "godlike" }));
    renderGame();
    expect(screen.getByRole("button", { name: "Perfect" })).toHaveAttribute("aria-pressed", "true");
  });

  describe("why panel", () => {
    it("is hidden by default and explains the AI's move when switched on", async () => {
      const user = userEvent.setup();
      renderGame();
      expect(
        screen.queryByRole("heading", { name: "Why the AI played that" }),
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole("checkbox", { name: "Show why the AI moved" }));
      expect(screen.getByText(/has not moved yet/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "top left, empty" }));
      await waitFor(() => expect(symbols().filter((s) => s === "O")).toHaveLength(1));
      const panel = screen
        .getByRole("heading", { name: "Why the AI played that" })
        .closest("section");
      expect(panel).not.toBeNull();
      const p = within(panel as HTMLElement);
      expect(p.getByText(/AI \(O\) played centre: the best it could find/)).toBeInTheDocument();
      // All 8 replies were evaluated, the played one is marked.
      expect(p.getAllByRole("listitem")).toHaveLength(8);
      expect(p.getByText(/centre: draw \(played\)/)).toBeInTheDocument();
      // Replying to a corner anywhere but the centre loses against perfect play.
      expect(p.getByText(/top middle: AI loses in/)).toBeInTheDocument();
      const cost =
        /alpha-beta pruning visited ([\d,]+) positions,\s+where plain minimax needs ([\d,]+)/.exec(
          panel?.textContent ?? "",
        );
      expect(cost).not.toBeNull();
      const [alphabeta, minimax] = [cost?.[1], cost?.[2]].map((n) =>
        Number((n ?? "").replace(/,/g, "")),
      );
      expect(alphabeta).toBeGreaterThan(0);
      expect(alphabeta).toBeLessThan(minimax ?? 0);
    });

    it("says when a random mistake was made on purpose", async () => {
      const user = userEvent.setup();
      localStorage.setItem(
        KEYS.ttt,
        JSON.stringify({ difficulty: "random", first: "you", showWhy: true }),
      );
      // Try seeds until the random AI plays a clearly worse move than the best.
      let seen = false;
      for (let seed = 1; seed <= 40 && !seen; seed++) {
        const { unmount } = renderGame(seed);
        await user.click(screen.getByRole("button", { name: "top left, empty" }));
        await waitFor(() => expect(symbols().filter((s) => s === "O")).toHaveLength(1));
        seen = screen.queryByText(/at random \(Random level makes mistakes on purpose\)/) !== null;
        unmount();
      }
      expect(seen).toBe(true);
    });
  });
});
