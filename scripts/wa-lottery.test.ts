import { describe, expect, it } from "vitest";
import { mergeDraws } from "./wa-lottery.mjs";

describe("mergeDraws", () => {
  it("keeps prior draws the 180-day scrape no longer serves", () => {
    const fresh = [{ date: "2026-08-18", numbers: [1, 2, 3, 4, 5] }];
    const previous = [
      { date: "2025-01-01", numbers: [6, 7, 8, 9, 10] },
      { date: "2026-08-18", numbers: [1, 2, 3, 4, 5] },
    ];
    const merged = mergeDraws(fresh, previous);
    expect(merged.map((d) => d.date)).toEqual(["2026-08-18", "2025-01-01"]);
    expect(merged).toHaveLength(2);
  });
});
