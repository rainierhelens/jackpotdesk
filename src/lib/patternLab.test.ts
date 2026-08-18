import { describe, expect, it } from "vitest";
import {
  buildPatternModel,
  explainTicket,
  LADDER_DEPTH,
  LADDER_FREE_DEPTH,
  patternLadder,
  patternPickTickets,
  scoreTicket,
  type PatternDraw,
} from "./patternLab";
import { comboKey } from "./picks";
import { waDrawsFor } from "./waDraws";

/**
 * Synthetic history over a 1–10 pool, 3 numbers per draw:
 * - number 1 in every draw, number 2 in 80 of 100, number 10 never
 * - pair 1-2 co-occurs 80 times (the #1 pair by far)
 * - extras: special 1 or 2 only, out of a max of 5
 */
function syntheticDraws(): PatternDraw[] {
  const draws: PatternDraw[] = [];
  for (let i = 0; i < 100; i++) {
    const numbers =
      i < 80 ? [1, 2, 3 + (i % 6)] : [1, 3 + (i % 3), 9];
    draws.push({ numbers, extra: i % 2 === 0 ? 1 : 2 });
  }
  return draws;
}

describe("pattern model", () => {
  const model = buildPatternModel(syntheticDraws(), 10, 5)!;

  it("counts frequencies and ranks known-frequent numbers on top", () => {
    expect(model).not.toBeNull();
    expect(model.draws).toBe(100);
    expect(model.freq[0]).toBe(100); // number 1 in every draw
    expect(model.freq[9]).toBe(0); // number 10 never drawn
    expect(model.top10[0]).toBe(1);
    expect(model.weight[0]).toBeGreaterThan(model.weight[9]);
  });

  it("finds the planted #1 pair", () => {
    expect(model.topPairs[0]).toMatchObject({ a: 1, b: 2, rank: 1 });
    expect(model.topPairs[0].count).toBe(80);
  });

  it("tracks special-ball frequency within the special max", () => {
    expect(model.specialFreq).not.toBeNull();
    expect(model.specialFreq![0]).toBe(50);
    expect(model.specialFreq![1]).toBe(50);
    expect(model.specialFreq![2]).toBe(0);
  });

  it("returns null for histories too short to describe", () => {
    expect(buildPatternModel(syntheticDraws().slice(0, 5), 10, 5)).toBeNull();
  });
});

describe("pattern scoring", () => {
  const model = buildPatternModel(syntheticDraws(), 10, 5)!;

  it("scores top-frequent numbers above bottom-frequent numbers", () => {
    const top = scoreTicket(model, [1, 2, 3]);
    const bottom = scoreTicket(model, [8, 9, 10]);
    expect(top.points).toBeGreaterThan(bottom.points);
    expect(top.points).toBeGreaterThan(50);
  });

  it("rewards a frequent special ball over a never-drawn one", () => {
    const hot = scoreTicket(model, [1, 2, 3], 1);
    const cold = scoreTicket(model, [1, 2, 3], 5);
    expect(hot.points).toBeGreaterThan(cold.points);
  });

  it("explains the facts it claims", () => {
    const why = explainTicket(model, [1, 2, 3]);
    expect(why).toContain("top-10");
    expect(why).toContain("#1 pair 1-2");
    const blank = explainTicket(model, [10, 10, 10].map((n, i) => n - i));
    expect(blank.length).toBeGreaterThan(0);
  });
});

describe("pattern generation", () => {
  const model = buildPatternModel(syntheticDraws(), 10, 5)!;

  it("respects game rules and never repeats a board", () => {
    const { tickets, scanned } = patternPickTickets(model, 3, 5);
    expect(tickets.length).toBe(5);
    expect(scanned).toBeGreaterThan(0);
    const keys = new Set(tickets.map((t) => comboKey(t.numbers)));
    expect(keys.size).toBe(5);
    for (const t of tickets) {
      expect(t.numbers.length).toBe(3);
      expect(new Set(t.numbers).size).toBe(3);
      for (const n of t.numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(10);
      }
      expect(t.extra).not.toBeNull();
      expect(t.extra!).toBeGreaterThanOrEqual(1);
      expect(t.extra!).toBeLessThanOrEqual(5);
    }
  });

  it("honors a fade veto and still returns legal boards", () => {
    const { tickets, rejected } = patternPickTickets(model, 3, 5, 1, {
      reject: (nums) => nums.includes(1),
    });
    expect(tickets.length).toBe(5);
    expect(rejected).toBeGreaterThan(0);
    expect(tickets.every((t) => !t.numbers.includes(1))).toBe(true);
  });

  it("averages above the random-ticket baseline", () => {
    const { tickets } = patternPickTickets(model, 3, 5);
    const avg =
      tickets.reduce(
        (a, t) => a + scoreTicket(model, t.numbers, t.extra).points,
        0,
      ) / tickets.length;
    expect(avg).toBeGreaterThan(50);
  });

  it("keeps disjoint pairs when pairSize is set", () => {
    const draws = waDrawsFor("lotto");
    const lotto = buildPatternModel(
      draws.map((d) => ({ numbers: d.numbers })),
      49,
    )!;
    expect(lotto).not.toBeNull();
    const { tickets } = patternPickTickets(lotto, 6, 2, 2);
    expect(tickets.length).toBe(2);
    const shared = tickets[0].numbers.filter((n) =>
      tickets[1].numbers.includes(n),
    );
    expect(shared.length).toBe(0);
  });

  it("keeps the planned free/paid field sizes", () => {
    expect(LADDER_FREE_DEPTH).toBe(10);
    expect(LADDER_DEPTH).toBe(100);
    expect(LADDER_FREE_DEPTH).toBeLessThan(LADDER_DEPTH);
  });

  it("can veto faded boards and still rank deterministically", () => {
    const reject = (nums: number[]) => nums.includes(1);
    const first = patternLadder(model, 3, 20, { reject });
    const second = patternLadder(model, 3, 20, { reject });
    expect(first.entries.length).toBe(20);
    expect(first.rejected).toBeGreaterThan(0);
    expect(first.entries.every((e) => !e.numbers.includes(1))).toBe(true);
    expect(first.entries.map((e) => e.numbers)).toEqual(
      second.entries.map((e) => e.numbers),
    );
    first.entries.forEach((entry, i) => {
      expect(entry.rank).toBe(i + 1);
      if (i > 0) {
        expect(entry.points).toBeLessThanOrEqual(first.entries[i - 1].points);
      }
    });
  });

  it("serves a deterministic ladder in non-increasing score order", () => {
    const first = patternLadder(model, 3, 20);
    const second = patternLadder(model, 3, 20);
    expect(first.entries.length).toBe(20);
    expect(first.scanned).toBeGreaterThan(0);
    // Same history, same ladder — it only re-ranks when new draws land.
    expect(first.entries.map((e) => e.numbers)).toEqual(
      second.entries.map((e) => e.numbers),
    );
    const keys = new Set(first.entries.map((e) => comboKey(e.numbers)));
    expect(keys.size).toBe(20);
    first.entries.forEach((entry, i) => {
      expect(entry.rank).toBe(i + 1);
      expect(entry.numbers.length).toBe(3);
      expect(entry.why.length).toBeGreaterThan(0);
      if (i > 0) {
        expect(entry.points).toBeLessThanOrEqual(first.entries[i - 1].points);
      }
    });
    // Every ladder board carries the score-maximizing special (the modal one).
    expect(first.entries[0].extra === 1 || first.entries[0].extra === 2).toBe(
      true,
    );
    // The top of the ladder should sit well above the random baseline.
    expect(first.entries[0].points).toBeGreaterThan(55);
  });

  it("builds from real baked Washington draws and scores above baseline", () => {
    const draws = waDrawsFor("hit5");
    const hit5 = buildPatternModel(
      draws.map((d) => ({ numbers: d.numbers })),
      42,
    )!;
    expect(hit5).not.toBeNull();
    const { tickets } = patternPickTickets(hit5, 5, 5);
    expect(tickets.length).toBe(5);
    const avg =
      tickets.reduce((a, t) => a + scoreTicket(hit5, t.numbers).points, 0) /
      tickets.length;
    expect(avg).toBeGreaterThan(50);
    expect(tickets.every((t) => t.extra === null)).toBe(true);
  });
});
