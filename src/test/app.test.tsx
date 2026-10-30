import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { KEYS } from "../lib/storage";

describe("game picker", () => {
  it("offers both games as tabs, with tic-tac-toe selected first", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Tic-tac-toe", "Rock-paper-scissors"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Tic-tac-toe");
    expect(screen.getByRole("group", { name: "Tic-tac-toe board" })).toBeInTheDocument();
  });

  it("switches games with a click and remembers the choice", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole("tab", { name: "Rock-paper-scissors" }));
    expect(screen.getByRole("group", { name: "Your move" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Tic-tac-toe board" })).not.toBeInTheDocument();
    unmount();
    render(<App />);
    expect(screen.getByRole("tab", { name: "Rock-paper-scissors" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("works from the keyboard: arrows, Home and End move between tabs and select them", async () => {
    const user = userEvent.setup();
    render(<App />);
    const ttt = screen.getByRole("tab", { name: "Tic-tac-toe" });
    const rps = screen.getByRole("tab", { name: "Rock-paper-scissors" });
    expect(ttt).toHaveAttribute("tabindex", "0");
    expect(rps).toHaveAttribute("tabindex", "-1");
    ttt.focus();
    await user.keyboard("{ArrowRight}");
    expect(rps).toHaveFocus();
    expect(rps).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(ttt).toHaveFocus();
    await user.keyboard("{End}");
    expect(rps).toHaveFocus();
    await user.keyboard("{Home}");
    expect(ttt).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(rps).toHaveFocus();
  });

  it("ignores a corrupt saved game", () => {
    localStorage.setItem(KEYS.game, JSON.stringify("chess"));
    render(<App />);
    expect(screen.getByRole("tab", { name: "Tic-tac-toe" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("has a skip link and a main landmark", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "Skip to the game" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
