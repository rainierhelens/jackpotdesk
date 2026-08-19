import { describe, expect, it } from "vitest";
import type { GameSpec } from "../types";
import {
  heatBook,
  mintFromHeat,
  mintUniform,
  sampleWeighted,
  sliceHeatDraws,
  sliceShiftDraws,
  shiftMax,
  ticketFromTray,
  type HeatWindow,
} from "./lotteryHeat";
import type { OfficialDraw } from "./winners";

const spec: GameSpec = {
  id: "powerball",
  label: "Test",
  whiteMax: 10,
  extraMax: 4,
  extraLabel: "Ball",
  ticketCost: 2,
  jackpotOdds: 1,
};

function draw(date: string, whites: number[], extra: number): OfficialDraw {
  return { date, whites, extra };
}

const DRAWS: OfficialDraw[] = [
  draw("2026-08-10", [1, 2, 3, 4, 5], 1),
  draw("2026-08-06", [1, 6, 7, 8, 9], 2),
  draw("2026-08-01", [2, 3, 4, 5, 6], 5),
];

describe("sliceHeatDraws", () => {
  it("keeps newest-first last-N windows", () => {
    expect(sliceHeatDraws(DRAWS, { preset: "50" })).toHaveLength(3);
    expect(sliceHeatDraws(DRAWS, { preset: "all" })).toEqual(DRAWS);
  });

  it("filters a custom inclusive date range", () => {
    const window: HeatWindow = {
      preset: "custom",
      from: "2026-08-06",
      to: "2026-08-10",
    };
    const sliced = sliceHeatDraws(DRAWS, window);
    expect(sliced.map((d) => d.date)).toEqual(["2026-08-10", "2026-08-06"]);
  });
});

describe("sliceShiftDraws", () => {
  it("walks from the oldest pane to the newest", () => {
    const pane = 2;
    expect(shiftMax(DRAWS, pane)).toBe(1);
    expect(sliceShiftDraws(DRAWS, pane, 0).map((d) => d.date)).toEqual([
      "2026-08-06",
      "2026-08-01",
    ]);
    expect(sliceShiftDraws(DRAWS, pane, 1).map((d) => d.date)).toEqual([
      "2026-08-10",
      "2026-08-06",
    ]);
  });
});

describe("heatBook", () => {
  it("counts whites and signs deviation vs uniform", () => {
    const book = heatBook(DRAWS, spec, { preset: "all" });
    expect(book).not.toBeNull();
    if (!book) return;
    expect(book.draws).toBe(3);
    expect(book.since).toBe("2026-08-01");
    expect(book.asOf).toBe("2026-08-10");
    const one = book.whites.find((c) => c.n === 1);
    const ten = book.whites.find((c) => c.n === 10);
    expect(one?.count).toBe(2);
    expect(ten?.count).toBe(0);
    expect(one?.expected).toBeCloseTo((3 * 5) / 10);
    expect(one?.deviation).toBeCloseTo(2 - 1.5);
    expect(ten?.deviation).toBeCloseTo(0 - 1.5);
    expect(one?.lastDrawn).toBe("2026-08-10");
    expect(one?.share).toBeCloseTo(2 / 3);
  });

  it("drops out-of-range specials from the extra row", () => {
    const book = heatBook(DRAWS, spec, { preset: "all" });
    expect(book).not.toBeNull();
    if (!book) return;
    const extraDraws = 2;
    expect(book.extras.find((c) => c.n === 1)?.count).toBe(1);
    expect(book.extras.find((c) => c.n === 5)).toBeUndefined();
    expect(book.extras[0].expected).toBeCloseTo(extraDraws / spec.extraMax);
  });

  it("returns null on an empty custom slice", () => {
    expect(
      heatBook(DRAWS, spec, {
        preset: "custom",
        from: "2020-01-01",
        to: "2020-01-02",
      }),
    ).toBeNull();
  });
});

describe("mint helpers", () => {
  it("samples a legal unique board", () => {
    const weights = [3, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const picked = sampleWeighted(weights, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    expect(picked.every((n) => n >= 1 && n <= 10)).toBe(true);
  });

  it("mints uniform and weighted tickets inside the matrix", () => {
    const book = heatBook(DRAWS, spec, { preset: "all" });
    expect(book).not.toBeNull();
    if (!book) return;
    const a = mintUniform(spec);
    const b = mintFromHeat(spec, book);
    for (const ticket of [a, b]) {
      expect(ticket.whites).toHaveLength(5);
      expect(new Set(ticket.whites).size).toBe(5);
      expect(ticket.extra).toBeGreaterThanOrEqual(1);
      expect(ticket.extra).toBeLessThanOrEqual(spec.extraMax);
    }
  });

  it("builds a tray ticket only when the slip is full", () => {
    expect(ticketFromTray([1, 2, 3, 4], 1)).toBeNull();
    expect(ticketFromTray([1, 2, 3, 4, 5], null)).toBeNull();
    const ticket = ticketFromTray([5, 1, 3, 2, 4], 2);
    expect(ticket?.whites).toEqual([1, 2, 3, 4, 5]);
    expect(ticket?.extra).toBe(2);
  });
});
