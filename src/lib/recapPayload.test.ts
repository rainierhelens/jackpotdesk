import { describe, expect, it } from "vitest";
import {
  DESK_LINE_LEAD,
  DESK_LINE_LINK,
  DESK_LINE_MAX,
  compactDeskBoard,
  deskLine,
  deskOfTotal,
  deskStrip,
  type DeskLineBlock,
} from "./recapPayload";
import { deskPayPhrase } from "./deskPrize";

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

const MEGA: DeskLineBlock = {
  label: "Mega Millions",
  officialDate: "2026-08-19",
  officialWhites: [2, 9, 18, 30, 50],
  officialExtra: 4,
  tone: "entertain",
  rungs: [
    { rank: 1, whites: [1, 3, 7, 11, 22], extra: 8, extraHit: false },
  ],
};

const HIT5: DeskLineBlock = {
  label: "Hit 5",
  officialDate: "2026-08-16",
  officialWhites: [5, 8, 19, 28, 41],
  officialExtra: null,
  rungs: [{ rank: 1, whites: [5, 11, 19, 30, 40], extra: null }],
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

  it("leads with official vs last night overlap, not same-odds", () => {
    expect(line.startsWith("Powerball 2026-08-18")).toBe(true);
    expect(line).not.toContain(DESK_LINE_LEAD);
    expect(line).not.toMatch(/Same hit odds as Quick Pick/);
    expect(line.length).toBeLessThanOrEqual(DESK_LINE_MAX);
    expect(line).not.toContain("\u2014");
  });

  it("prints the official board, overlap, and prize-if-played", () => {
    expect(line).toContain(compactDeskBoard([5, 12, 23, 44, 61], 9));
    expect(line).toContain("Last night #1 2 of 5 (12 44 + 09) · paid $7");
    expect(line).toContain("#2 0 of 5 · paid $0");
    expect(line).toContain("#3 1 of 5 (23) · paid $0");
    expect(line).not.toContain(compactDeskBoard([3, 12, 28, 44, 55], 9));
  });

  it("adds the EV call and recap link when they fit", () => {
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
    expect(lotto).toContain(compactDeskBoard([5, 8, 19, 28, 32, 41], null));
    expect(lotto).toContain("Last night #1 3 of 6 (05 19 32) · paid $3");
    expect(lotto).not.toMatch(/\d of 5/);
    expect(lotto).not.toMatch(/\bSKIP\b|ENTERTAIN ONLY|RARE PLUS/);
    expect(lotto.length).toBeLessThanOrEqual(DESK_LINE_MAX);
  });

  it("keeps Hit 5, Powerball, and Mega Millions as N of 5", () => {
    expect(deskOfTotal("Powerball", [5, 12, 23, 44, 61])).toBe(5);
    expect(deskOfTotal("Hit 5", [5, 8, 19, 28, 41])).toBe(5);
    expect(deskOfTotal("Mega Millions", [2, 9, 18, 30, 50])).toBe(5);
    expect(deskOfTotal("Lotto", [5, 8, 19, 28, 32, 41])).toBe(6);
    expect(deskLine(HIT5)).toContain("Last night #1 2 of 5 (05 19) · paid a free play");
    expect(deskLine(MEGA)).toContain("Last night #1 0 of 5 · paid $0");
  });

  it("pays $0 for 1 of 5 Hit 5, 1 of 6 Lotto, and 1 of 5 with no Powerball", () => {
    const hit1 = deskLine({
      ...HIT5,
      officialDate: "2026-08-20",
      officialWhites: [8, 14, 19, 26, 37],
      rungs: [{ rank: 1, whites: [8, 1, 2, 3, 4], extra: null }],
    });
    const lotto1 = deskLine({
      ...LOTTO,
      officialWhites: [5, 8, 17, 28, 32, 41],
      rungs: [{ rank: 1, whites: [17, 1, 2, 3, 4, 6], extra: null }],
    });
    const pb1 = deskLine({
      ...POWERBALL,
      rungs: [{ rank: 1, whites: [5, 1, 2, 3, 4], extra: 8, extraHit: false }],
    });
    expect(hit1).toContain("Last night #1 1 of 5 (08) · paid $0");
    expect(lotto1).toContain("Last night #1 1 of 6 (17) · paid $0");
    expect(lotto1).not.toMatch(/\d of 5/);
    expect(pb1).toContain("Last night #1 1 of 5 (05) · paid $0");
    expect(
      deskPayPhrase(
        { ...HIT5, officialWhites: [8, 14, 19, 26, 37] },
        { whites: [8, 14, 19, 26, 1], extra: null },
      ),
    ).toBe("paid $150");
    expect(
      deskPayPhrase(
        { ...LOTTO, officialWhites: [5, 8, 17, 28, 32, 41] },
        { whites: [5, 8, 17, 1, 2, 3], extra: null },
      ),
    ).toBe("paid $3");
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

describe("deskStrip", () => {
  const strip = deskStrip([POWERBALL, MEGA, HIT5, LOTTO]);

  it("fits all four games and names prize-if-played without inventing a dollar", () => {
    expect(strip).toBeTruthy();
    expect(strip!.length).toBeLessThanOrEqual(DESK_LINE_MAX);
    expect(strip!.startsWith("Last night #1.")).toBe(true);
    expect(strip).toContain("Hit 5 2 of 5 (05 19) · paid a free play");
    expect(strip).toContain("PB 2 of 5 (12 44 + 09) · paid $7");
    expect(strip).toContain("Lotto 3 of 6 (05 19 32) · paid $3");
    expect(strip).toContain("MM 0 of 5 · paid $0");
    expect(strip).toContain(DESK_LINE_LINK);
    expect(strip).not.toContain(DESK_LINE_LEAD);
    expect(strip).not.toMatch(/winning numbers|beats Quick Pick|tonight'?s #1/i);
    expect(strip).not.toMatch(/Buena Market|\bstore\b/);
  });

  it("says paid $0 across the board when every #1 is a miss", () => {
    const zero = deskStrip([
      {
        ...HIT5,
        officialWhites: [8, 14, 19, 26, 37],
        rungs: [{ rank: 1, whites: [8, 1, 2, 3, 4], extra: null }],
      },
      {
        ...POWERBALL,
        rungs: [{ rank: 1, whites: [61, 1, 2, 3, 4], extra: 8, extraHit: false }],
      },
      {
        ...LOTTO,
        officialWhites: [5, 8, 17, 28, 32, 41],
        rungs: [{ rank: 1, whites: [17, 1, 2, 3, 4, 6], extra: null }],
      },
      MEGA,
    ]);
    expect(zero).toContain("Last night #1 paid $0 across the board.");
    expect(zero).toContain("Hit 5 1 of 5 (08)");
    expect(zero).toContain("PB 1 of 5 (61)");
    expect(zero).toContain("Lotto 1 of 6 (17)");
    expect(zero).toContain("MM 0 of 5");
    expect(zero).not.toMatch(/Lotto \d of 5/);
  });

  it("returns null when there is only one game", () => {
    expect(deskStrip([LOTTO])).toBeNull();
  });
});
