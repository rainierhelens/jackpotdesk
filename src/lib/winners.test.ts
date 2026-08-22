import { describe, expect, it } from "vitest";
import {
  officialDrawFrom,
  parseCaLatestDraw,
  withNewerOfficial,
} from "./winners.ts";

describe("officialDrawFrom", () => {
  it("keeps Friday Mega Millions with Mega Ball 24", () => {
    expect(
      officialDrawFrom("megamillions", "2026-08-21T00:00:00.000", [1, 25, 34, 48, 57], 24),
    ).toEqual({
      date: "2026-08-21",
      whites: [1, 25, 34, 48, 57],
      extra: 24,
    });
  });

  it("drops a Mega Ball above the 24-ball matrix", () => {
    expect(
      officialDrawFrom("megamillions", "2026-08-21", [1, 25, 34, 48, 57], 25),
    ).toBeNull();
  });
});

describe("parseCaLatestDraw", () => {
  it("reads California MostRecentDraw the same way the jackpot bake does", () => {
    const draw = parseCaLatestDraw("megamillions", {
      MostRecentDraw: {
        DrawDate: "2026-08-21T07:00:00",
        WinningNumbers: {
          "0": { Number: "1", IsSpecial: false },
          "1": { Number: "25", IsSpecial: false },
          "2": { Number: "34", IsSpecial: false },
          "3": { Number: "48", IsSpecial: false },
          "4": { Number: "57", IsSpecial: false },
          "5": { Number: "24", IsSpecial: true },
        },
      },
    });
    expect(draw).toEqual({
      date: "2026-08-21",
      whites: [1, 25, 34, 48, 57],
      extra: 24,
    });
  });
});

describe("withNewerOfficial", () => {
  const tuesday = {
    date: "2026-08-18",
    whites: [5, 19, 30, 38, 59],
    extra: 12,
  };
  const friday = {
    date: "2026-08-21",
    whites: [1, 25, 34, 48, 57],
    extra: 24,
  };

  it("prepends California's board when NY Open Data is still on the prior draw", () => {
    expect(withNewerOfficial([tuesday], friday)).toEqual([friday, tuesday]);
  });

  it("leaves NY alone when California is the same morning or older", () => {
    expect(withNewerOfficial([friday, tuesday], friday)).toEqual([friday, tuesday]);
    expect(withNewerOfficial([friday], tuesday)).toEqual([friday]);
  });
});
