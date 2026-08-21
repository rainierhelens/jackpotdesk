import { describe, expect, it } from "vitest";
import {
  DESK_LINE_LEAD,
  DESK_LINE_LINK,
  DESK_LINE_MAX,
  compactDeskBoard,
  deskLine,
  deskOfTotal,
  type DeskLineBlock,
} from "./recapPayload";

const POWERBALL: DeskLineBlock = {
  label: "Powerball",
  officialDate: "2026-08-18",
  officialWhites: [5, 12, 23, 44, 61],
  officialExtra: 9,
  tone: "no",
  rungs: [
    {
      rank: 1,
      whites: [3, 12, 28, 44, 55],
      extra: 9,
      extraHit: true,
    },
    {
      rank: 2,
      whites: [1, 8, 19, 33, 60],
      extra: 4,
      extraHit: false,
    },
    {
      rank: 3,
      whites: [10, 11, 23, 40, 50],
      extra: 18,
      extraHit: false,
    },
  ],
};

const LOTTO: DeskLineBlock = {
  label: "Lotto",
  officialDate: "2026-08-16",
  officialWhites: [5, 8, 19, 28, 32, 41],
  officialExtra: null,
  rungs: [
    {
      rank: 1,
      whites: [5, 11, 19, 30, 32, 40],
      extra: null,
    },
  ],
};

describe("deskLine", () => {
  const line = deskLine(POWERBALL);

  it("opens with same-odds and stays tweet length", () => {
    expect(line.startsWith(DESK_LINE_LEAD)).toBe(true);
    expect(line.length).toBeLessThanOrEqual(DESK_LINE_MAX);
    expect(line).not.toContain("\u2014");
  });

  it("prints the official board and last night #1 as a scored replay", () => {
    expect(line).toContain("Powerball 2026-08-18");
    expect(line).toContain(compactDeskBoard([5, 12, 23, 44, 61], 9));
    expect(line).toContain("Last night #1");
    expect(line).toContain(compactDeskBoard([3, 12, 28, 44, 55], 9));
    expect(line).toContain("shared 12 44 + 09");
    expect(line).toContain("2 of 5");
  });

  it("adds #2/#3, the EV call, and the recap link when they fit", () => {
    expect(line).toContain("#2");
    expect(line).toContain("0 of 5");
    expect(line).toContain("#3");
    expect(line).toContain("shared 23");
    expect(line).toContain("1 of 5");
    expect(line).toContain("SKIP.");
    expect(line).toContain(DESK_LINE_LINK);
  });

  it("does not forecast or blast tonight's #1", () => {
    expect(line).not.toMatch(/tonight'?s #1/i);
    expect(line).not.toMatch(/winning numbers|beats Quick Pick|Fable|tip sheet/i);
  });

  it("uses N of 6 on Lotto and never N of 5", () => {
    const lotto = deskLine(LOTTO);
    expect(lotto).toContain("Lotto 2026-08-16");
    expect(lotto).toContain("3 of 6");
    expect(lotto).toContain("shared 05 19 32");
    expect(lotto).not.toMatch(/\d of 5/);
    expect(lotto).not.toMatch(/\bSKIP\b|ENTERTAIN ONLY|RARE PLUS/);
    expect(lotto.length).toBeLessThanOrEqual(DESK_LINE_MAX);
  });

  it("keeps Hit 5 and Powerball as N of 5", () => {
    expect(deskOfTotal("Powerball", [5, 12, 23, 44, 61])).toBe(5);
    expect(deskOfTotal("Hit 5", [5, 8, 19, 28, 41])).toBe(5);
    expect(deskOfTotal("Lotto", [5, 8, 19, 28, 32, 41])).toBe(6);
    expect(deskLine({
      label: "Hit 5",
      officialDate: "2026-08-16",
      officialWhites: [5, 8, 19, 28, 41],
      officialExtra: null,
      rungs: [{ rank: 1, whites: [5, 11, 19, 30, 40], extra: null }],
    })).toContain("2 of 5");
  });

  it("never includes a store, city, or winner name, even if officialStore is set", () => {
    const withStore = deskLine({
      ...POWERBALL,
      officialStore: "Buena Market, Burien",
    });
    const lotto = deskLine({
      ...LOTTO,
      officialStore: "Fred Meyer, Lacey",
    });
    for (const text of [line, withStore, lotto]) {
      expect(text).not.toMatch(
        /Buena Market|Fred Meyer|Burien|Lacey|\bstore\b|claimed-prize|winner name/i,
      );
    }
    expect(withStore).toBe(line);
  });
});
