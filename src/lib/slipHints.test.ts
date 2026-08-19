import { describe, expect, it } from "vitest";
import type { HeatBook, HeatCell } from "./lotteryHeat";
import { buildPatternModel, type PatternDraw } from "./patternLab";
import {
  crowdRemainders,
  heatRemainders,
  HINT_CAP,
  partialCrowd,
  patternRemainders,
  toggleTrayWhite,
} from "./slipHints";

function cell(
  n: number,
  deviation: number,
  gapDays: number,
  count = 0,
): HeatCell {
  return {
    n,
    count,
    share: 0,
    lastDrawn: null,
    gapDays,
    expected: 1,
    deviation,
  };
}

function book(whites: HeatCell[]): HeatBook {
  return {
    draws: 10,
    extraDraws: 0,
    since: "2020-01-01",
    asOf: "2026-08-01",
    whiteMax: whites.length,
    extraMax: 0,
    extraLabel: "",
    pick: 5,
    whites,
    extras: [],
  };
}

/**
 * History plants pair 1-2 and never draws 10. Heat and crowd favorites
 * are wired to other numbers so a blend would leak across lists.
 */
function pairDraws(): PatternDraw[] {
  const draws: PatternDraw[] = [];
  for (let i = 0; i < 40; i++) {
    draws.push({
      numbers: i < 32 ? [1, 2, 3 + (i % 5)] : [1, 4, 8],
    });
  }
  return draws;
}

const HEAT = book([
  cell(1, 0.2, 4, 2),
  cell(2, -1.5, 2, 0),
  cell(3, 0.1, 6, 1),
  cell(4, -0.4, 3, 1),
  cell(5, -0.2, 5, 1),
  cell(6, -0.3, 8, 1),
  cell(7, -2.0, 1, 0),
  cell(8, 0.0, 9, 1),
  cell(9, 0.4, 7, 2),
  cell(10, 4.8, 200, 8),
]);

// 7 is lonely; 2 and 10 are crowded. Pattern favorite 2 stays heavy.
const CROWD_WHITE = [1.1, 1.4, 1.05, 1.02, 1.0, 0.98, 0.45, 1.01, 1.08, 1.5];
const CROWD_EXTRA = [1.2, 0.55, 1.1, 0.9, 1.05];

describe("empty tray", () => {
  it("returns empty lists so a blank slip invents no favorites", () => {
    const heat = heatRemainders(HEAT, []);
    expect(heat.overChance).toEqual([]);
    expect(heat.longestGap).toEqual([]);
    expect(patternRemainders(buildPatternModel(pairDraws(), 10)!, [])).toEqual(
      [],
    );
    const crowd = crowdRemainders(CROWD_WHITE, [], HINT_CAP, CROWD_EXTRA, null);
    expect(crowd.whites).toEqual([]);
    expect(crowd.extras).toEqual([]);
  });
});

describe("unmixed remainders", () => {
  const model = buildPatternModel(pairDraws(), 10)!;
  const taken = [1];

  it("never includes numbers already on the slip", () => {
    const heat = heatRemainders(HEAT, taken);
    const pattern = patternRemainders(model, taken);
    const crowd = crowdRemainders(
      CROWD_WHITE,
      taken,
      HINT_CAP,
      CROWD_EXTRA,
      2,
    );
    const whites = [
      ...heat.overChance,
      ...heat.longestGap,
      ...pattern,
      ...crowd.whites,
    ];
    expect(whites.every((chip) => chip.n !== 1)).toBe(true);
    expect(crowd.extras.every((chip) => chip.n !== 2)).toBe(true);
  });

  it("ranks Heat only by this-window deviation and gap", () => {
    const heat = heatRemainders(HEAT, taken);
    expect(heat.overChance[0]?.n).toBe(10);
    expect(heat.overChance.map((c) => c.n)).not.toContain(7);
    expect(heat.overChance.map((c) => c.n)).not.toContain(2);
    expect(heat.longestGap[0]?.n).toBe(10);
    expect(heat.overChance.every((c) => c.why.includes("this window"))).toBe(
      true,
    );
  });

  it("ranks pattern only by pair history with the slip", () => {
    const pattern = patternRemainders(model, taken);
    expect(pattern[0]?.n).toBe(2);
    expect(pattern.map((c) => c.n)).not.toContain(10);
    expect(pattern.every((c) => c.why.includes("pair history"))).toBe(true);
  });

  it("ranks crowd only by pick-rate weight", () => {
    const crowd = crowdRemainders(
      CROWD_WHITE,
      taken,
      HINT_CAP,
      CROWD_EXTRA,
      null,
    );
    expect(crowd.whites[0]?.n).toBe(7);
    expect(crowd.whites.map((c) => c.n)).not.toContain(10);
    expect(crowd.extras[0]?.n).toBe(2);
    expect(crowd.whites.every((c) => c.why.includes("picked"))).toBe(true);
  });
});

describe("toggleTrayWhite", () => {
  it("adds until full, then replaces the last-added number", () => {
    expect(toggleTrayWhite([], 8, 5)).toEqual([8]);
    expect(toggleTrayWhite([8, 3, 12, 19, 41], 7, 5)).toEqual([
      8, 3, 12, 19, 7,
    ]);
  });

  it("drops a number already on the slip", () => {
    expect(toggleTrayWhite([8, 3, 12], 3, 5)).toEqual([8, 12]);
  });
});

describe("partialCrowd", () => {
  it("is the product of the selected weights, not a percentile", () => {
    expect(partialCrowd(CROWD_WHITE, [])).toBe(1);
    expect(partialCrowd(CROWD_WHITE, [7])).toBeCloseTo(0.45);
    expect(partialCrowd(CROWD_WHITE, [7, 2], 0.55)).toBeCloseTo(0.45 * 1.4 * 0.55);
  });
});
