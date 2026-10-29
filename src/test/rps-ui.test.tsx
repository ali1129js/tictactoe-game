import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Rps } from "../games/rps/Rps";
import { seededRng } from "../lib/rng";
import { KEYS } from "../lib/storage";

const renderRps = (seed = 3) => render(<Rps rng={seededRng(seed)} />);
const stat = (name: string): string => {
  const dt = screen.getByText(name, { selector: "dt" });
  return dt.parentElement?.querySelector("dd")?.textContent ?? "";
};

describe("rock-paper-scissors UI", () => {
  it("starts with empty stats and no clear prediction", () => {
    renderRps();
    expect(screen.getByRole("status")).toHaveTextContent("Pick a move to start");
    expect(stat("Rounds")).toBe("0");
    expect(stat("Bot win rate")).toBe("–");
    expect(stat("Prediction accuracy")).toBe("–");
    expect(screen.getByText(/No clear favourite yet/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /no rounds played yet/ })).toBeInTheDocument();
  });

  it("plays a round on click and updates the stats", async () => {
    const user = userEvent.setup();
    renderRps();
    await user.click(screen.getByRole("button", { name: "Rock" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /You played Rock, the bot played (Rock|Paper|Scissors)\./,
    );
    expect(stat("Rounds")).toBe("1");
    const won = Number(stat("You won")) + Number(stat("Bot won")) + Number(stat("Ties"));
    expect(won).toBe(1);
  });

  it("plays with the keyboard shortcuts R, P, S and 1, 2, 3", async () => {
    const user = userEvent.setup();
    renderRps();
    await user.keyboard("r");
    expect(screen.getByRole("status")).toHaveTextContent("You played Rock");
    await user.keyboard("p");
    expect(screen.getByRole("status")).toHaveTextContent("You played Paper");
    await user.keyboard("S");
    expect(screen.getByRole("status")).toHaveTextContent("You played Scissors");
    await user.keyboard("1");
    expect(screen.getByRole("status")).toHaveTextContent("You played Rock");
    expect(stat("Rounds")).toBe("4");
    await user.keyboard("x");
    expect(stat("Rounds")).toBe("4");
  });

  it("learns a predictable player: the bot's win rate and its stated confidence climb", async () => {
    const user = userEvent.setup();
    renderRps();
    for (let i = 0; i < 30; i++) await user.keyboard("r");
    expect(stat("Rounds")).toBe("30");
    expect(parseInt(stat("Bot win rate"), 10)).toBeGreaterThan(60);
    expect(parseInt(stat("Prediction accuracy"), 10)).toBeGreaterThan(80);
    expect(screen.getByText(/The bot thinks you will play Rock \(\d+% sure/)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Bot win rate chart: \d+% after 30 rounds/ }),
    ).toBeInTheDocument();
  });

  it("switches model: Markov shows its memory control, Frequency hides it, and the choice is remembered", async () => {
    const user = userEvent.setup();
    const { unmount } = renderRps();
    expect(screen.getByRole("group", { name: "Memory in moves" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(JSON.parse(localStorage.getItem(KEYS.rps) ?? "{}")).toMatchObject({
      model: "markov",
      order: 3,
    });
    await user.click(screen.getByRole("button", { name: "Frequency" }));
    expect(screen.queryByRole("group", { name: "Memory in moves" })).not.toBeInTheDocument();
    unmount();
    renderRps();
    expect(screen.getByRole("button", { name: "Frequency" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps the player's history when the model is switched", async () => {
    const user = userEvent.setup();
    renderRps();
    for (let i = 0; i < 10; i++) await user.keyboard("p");
    await user.click(screen.getByRole("button", { name: "Frequency" }));
    expect(stat("Rounds")).toBe("10");
    expect(screen.getByText(/The bot thinks you will play Paper/)).toBeInTheDocument();
  });

  it("can hide the prediction panel and reset the stats", async () => {
    const user = userEvent.setup();
    renderRps();
    await user.keyboard("rr");
    await user.click(screen.getByRole("checkbox", { name: "Show what the bot expects" }));
    expect(screen.queryByRole("heading", { name: "What the bot expects" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset stats" }));
    expect(stat("Rounds")).toBe("0");
    expect(screen.getByRole("status")).toHaveTextContent("Pick a move to start");
  });

  it("shows probabilities that add up in the bars", async () => {
    const user = userEvent.setup();
    renderRps();
    await user.keyboard("rrr");
    const panel = screen.getByRole("heading", { name: "What the bot expects" }).closest("section");
    const values = within(panel as HTMLElement)
      .getAllByRole("listitem")
      .map((li) => parseInt(li.querySelector(".bar-value")?.textContent ?? "0", 10));
    expect(values).toHaveLength(3);
    expect(values.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(99);
    expect(values.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(101);
  });

  it("does not play when typing in a form field", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="note" />
        <Rps rng={seededRng(1)} />
      </>,
    );
    await user.type(screen.getByRole("textbox", { name: "note" }), "rps");
    expect(stat("Rounds")).toBe("0");
  });
});
