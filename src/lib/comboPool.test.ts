import { describe, expect, it } from "vitest";
import { nationalPool, waPool } from "./comboPool";
import { DEFAULT_FILTERS } from "./picks";
import { combinations, GAMES } from "./prizes";
import { WA_GAMES } from "./waGames";
import { DEFAULT_WA_FILTERS } from "./waPicks";
import type { Filters, WaFilters } from "../types";

const NO_PAST = new Set<string>();
const NO_AVOID = new Set<number>();

function allOff<T extends Record<string, boolean>>(defaults: T): T {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => [key, false]),
  ) as T;
}

const WA_OFF = allOff(DEFAULT_WA_FILTERS as Record<string, boolean>) as WaFilters;
const NATIONAL_OFF = allOff(
  DEFAULT_FILTERS as Record<string, boolean>,
) as Filters;

describe("combinations", () => {
  it("matches the known Powerball white-ball space", () => {
    expect(combinations(69, 5)).toBe(11_238_513);
  });

  it("matches the known WA Lotto space", () => {
    expect(combinations(49, 6)).toBe(13_983_816);
  });
});

describe("waPool exact counting (Pick 3)", () => {
  it("keeps all 1,000 straights with every fade off", () => {
    const report = waPool(WA_GAMES.pick3, 3, WA_OFF, NO_PAST, NO_AVOID, "straight");
    expect(report.exact).toBe(true);
    expect(report.total).toBe(1_000);
    expect(report.survivors).toBe(1_000);
    expect(report.keptShare).toBe(1);
  });

  it("removes exactly the 280 straights with a repeated digit when doubles is on", () => {
    const report = waPool(
      WA_GAMES.pick3,
      3,
      { ...WA_OFF, doubles: true },
      NO_PAST,
      NO_AVOID,
      "straight",
    );
    // Straights with all digits distinct: 10 * 9 * 8 = 720.
    expect(report.exact).toBe(true);
    expect(report.survivors).toBe(720);
    expect(report.total - report.survivors).toBe(280);
  });

  it("never lets stage removals exceed the total space", () => {
    const report = waPool(
      WA_GAMES.pick3,
      3,
      DEFAULT_WA_FILTERS,
      NO_PAST,
      NO_AVOID,
      "straight",
    );
    const removed = report.stages.reduce((sum, s) => sum + s.removed, 0);
    expect(removed).toBe(report.total - report.survivors);
    expect(report.survivors).toBeGreaterThan(0);
  });
});

describe("waPool exact counting (Match 4)", () => {
  it("enumerates the full 10,626 boards", () => {
    const report = waPool(WA_GAMES.match4, 4, WA_OFF, NO_PAST, NO_AVOID, "straight");
    expect(report.exact).toBe(true);
    expect(report.total).toBe(10_626);
    expect(report.survivors).toBe(10_626);
  });
});

describe("nationalPool Monte Carlo", () => {
  it("keeps the whole space with every fade off", () => {
    const report = nationalPool(GAMES.powerball, NATIONAL_OFF, NO_PAST, NO_AVOID);
    expect(report.exact).toBe(false);
    expect(report.total).toBe(11_238_513);
    expect(report.keptShare).toBe(1);
  });

  it("reports a sane kept share with the default fades on", () => {
    const report = nationalPool(
      GAMES.powerball,
      DEFAULT_FILTERS,
      NO_PAST,
      NO_AVOID,
    );
    expect(report.keptShare).toBeGreaterThan(0);
    expect(report.keptShare).toBeLessThan(1);
    expect(report.survivors).toBeLessThan(report.total);
  });
});
