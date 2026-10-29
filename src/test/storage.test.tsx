import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStoredState } from "../hooks/useStoredState";
import {
  DEFAULT_RPS,
  DEFAULT_TTT,
  KEYS,
  readStored,
  rpsSettingsSchema,
  tttSettingsSchema,
  writeStored,
} from "../lib/storage";

describe("readStored / writeStored", () => {
  it("round-trips valid settings", () => {
    const settings = { difficulty: "medium", first: "ai", showWhy: true } as const;
    writeStored(KEYS.ttt, settings);
    expect(readStored(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT)).toEqual(settings);
  });

  it("falls back when nothing is stored, the JSON is corrupt, or the shape is wrong", () => {
    expect(readStored(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT)).toEqual(DEFAULT_TTT);
    localStorage.setItem(KEYS.ttt, "{not json");
    expect(readStored(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT)).toEqual(DEFAULT_TTT);
    localStorage.setItem(
      KEYS.ttt,
      JSON.stringify({ difficulty: "impossible", first: "you", showWhy: false }),
    );
    expect(readStored(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT)).toEqual(DEFAULT_TTT);
    localStorage.setItem(
      KEYS.rps,
      JSON.stringify({ model: "markov", order: 9, showPrediction: true }),
    );
    expect(readStored(KEYS.rps, rpsSettingsSchema, DEFAULT_RPS)).toEqual(DEFAULT_RPS);
  });

  it("does not throw when storage is unavailable", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(readStored(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT)).toEqual(DEFAULT_TTT);
    expect(() => writeStored(KEYS.ttt, DEFAULT_TTT)).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

describe("useStoredState", () => {
  it("starts from storage, updates, and persists", () => {
    writeStored(KEYS.ttt, { ...DEFAULT_TTT, difficulty: "random" });
    const { result } = renderHook(() => useStoredState(KEYS.ttt, tttSettingsSchema, DEFAULT_TTT));
    expect(result.current[0].difficulty).toBe("random");
    act(() => result.current[1]((prev) => ({ ...prev, showWhy: true })));
    expect(result.current[0].showWhy).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEYS.ttt) ?? "{}")).toMatchObject({
      difficulty: "random",
      showWhy: true,
    });
  });
});
