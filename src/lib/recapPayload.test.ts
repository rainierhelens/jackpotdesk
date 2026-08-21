import { describe, expect, it } from "vitest";
import {
  DESK_LINE_LEAD,
  DESK_LINE_LINK,
  DESK_LINE_MAX,
  compactDeskBoard,
  deskLine,
  officialStoreNote,
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

  it("uses N of 6 on Lotto and omits EV when there is no tone", () => {
    const lotto = deskLine(LOTTO);
    expect(lotto).toContain("Lotto 2026-08-16");
    expect(lotto).toContain("3 of 6");
    expect(lotto).toContain("shared 05 19 32");
    expect(lotto).not.toMatch(/\bSKIP\b|ENTERTAIN ONLY|RARE PLUS/);
    expect(lotto.length).toBeLessThanOrEqual(DESK_LINE_MAX);
  });

  it("names an official store only when the hook is present", () => {
    expect(line).not.toContain("Buena Market");
    const withStore = deskLine({
      ...POWERBALL,
      officialStore: officialStoreNote({ name: "Buena Market", city: "Burien" }),
    });
    expect(withStore).toContain("Buena Market, Burien");
    expect(withStore.length).toBeLessThanOrEqual(DESK_LINE_MAX);
  });

  it("drops a store note that would blow the 280 cap", () => {
    const long = deskLine({
      ...POWERBALL,
      officialStore: "A".repeat(200),
    });
    expect(long).not.toContain("AAAA");
    expect(long.length).toBeLessThanOrEqual(DESK_LINE_MAX);
  });
});

describe("officialStoreNote", () => {
  it("returns null when no official store was named", () => {
    expect(officialStoreNote(null)).toBeNull();
    expect(officialStoreNote("")).toBeNull();
    expect(officialStoreNote({ name: "  " })).toBeNull();
  });
});
