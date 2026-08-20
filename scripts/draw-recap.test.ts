import { describe, expect, it } from "vitest";
import { formatLastNightHtml } from "./draw-recap.ts";
import {
  SAME_ODDS_LEAD,
  digestCallLine,
  matchLine,
  recapCallLine,
  scoreReplay,
  type RecapPayload,
} from "./lib/deskLetter.ts";

const FIXTURE: RecapPayload = {
  asOf: "2026-08-20",
  notes: [],
  national: [
    {
      id: "powerball",
      label: "Powerball",
      extraLabel: "Powerball",
      nextDraw: "2026-08-20",
      advertised: "380M",
      cash: "176M",
      netEv: "-$1.87",
      advice: "Don't buy this as an investment. You are paying about two dollars for a story.",
      tone: "no",
      officialDate: "2026-08-18",
      officialBoard: "05  12  23  44  61  +  09 Powerball",
      historyBefore: 1200,
      ladderHref: "https://www.jackpotdesk.com/?desk=national&game=powerball",
      rungs: [
        {
          rank: 1,
          board: "03  12  28  44  55  +  09 Powerball",
          points: 62,
          crowd: "0.91x crowd · beats 61% of random boards",
          why: "3 in the top-10 · #1 pair 12-44",
          whiteHits: 2,
          extraHit: true,
          matchLine: "2 of 5 whites · Powerball hit",
        },
        {
          rank: 2,
          board: "01  08  19  33  60  +  04 Powerball",
          points: 58,
          crowd: null,
          why: "2 in the top-10",
          whiteHits: 0,
          extraHit: false,
          matchLine: "0 of 5 whites · no Powerball",
        },
        {
          rank: 3,
          board: "10  11  22  40  50  +  18 Powerball",
          points: 55,
          crowd: null,
          why: "sum in band",
          whiteHits: 1,
          extraHit: false,
          matchLine: "1 of 5 whites · no Powerball",
        },
      ],
    },
  ],
  washington: [
    {
      id: "hit5",
      label: "Hit 5",
      when: "Daily 8 p.m. PT",
      prizeLine: "Cashpot $230,000.",
      officialDate: "2026-08-16",
      officialBoard: "05  08  19  28  41",
      historyBefore: 180,
      ladderHref: "https://www.jackpotdesk.com/?desk=washington&wa=hit5",
      rungs: [
        {
          rank: 1,
          board: "05  11  19  30  40",
          points: 54,
          crowd: null,
          why: "2 in the top-10",
          whiteHits: 2,
          extraHit: null,
          matchLine: "2 of 5 whites",
        },
      ],
    },
  ],
};

describe("scoreReplay", () => {
  it("counts white hits and the extra ball", () => {
    expect(scoreReplay([5, 12, 23, 44, 61], 9, [3, 12, 28, 44, 55], 9)).toEqual({
      whiteHits: 2,
      extraHit: true,
    });
    expect(scoreReplay([5, 12, 23, 44, 61], 9, [1, 2, 3, 4, 6], 8)).toEqual({
      whiteHits: 0,
      extraHit: false,
    });
  });

  it("skips the extra when the game has none", () => {
    expect(scoreReplay([5, 8, 19, 28, 41], null, [5, 11, 19, 30, 40], null)).toEqual({
      whiteHits: 2,
      extraHit: null,
    });
  });
});

describe("matchLine", () => {
  it("names whites and the extra without calling a winner", () => {
    expect(matchLine(2, 5, true, "Powerball")).toBe(
      "2 of 5 whites · Powerball hit",
    );
    expect(matchLine(0, 5, false, "Mega Ball")).toBe(
      "0 of 5 whites · no Mega Ball",
    );
    expect(matchLine(2, 5, null, null)).toBe("2 of 5 whites");
  });
});

describe("EV call labels", () => {
  it("uses SKIP / ENTERTAIN ONLY / RARE PLUS on the public recap", () => {
    expect(recapCallLine("no")).toBe("SKIP");
    expect(recapCallLine("entertain")).toBe("ENTERTAIN ONLY");
    expect(recapCallLine("rare")).toBe("RARE PLUS");
  });

  it("keeps the longer skip line on the private digest", () => {
    expect(digestCallLine("no")).toBe("SKIP AS AN INVESTMENT");
  });
});

describe("last-night page", () => {
  const html = formatLastNightHtml(FIXTURE);

  it("opens with live-site same-odds copy", () => {
    const firstBody = html.match(/<p>(Same hit odds[\s\S]*?)<\/p>/);
    expect(firstBody?.[1]).toContain(SAME_ODDS_LEAD);
    expect(html.indexOf(SAME_ODDS_LEAD)).toBeLessThan(
      html.indexOf("Official 2026-08-18"),
    );
  });

  it("scores last official against last night's #1-#3", () => {
    expect(html).toContain("Official 2026-08-18");
    expect(html).toContain("05  12  23  44  61");
    expect(html).toContain("2 of 5 whites · Powerball hit");
    expect(html).toContain("#1 is the strongest match to history before this drawing");
    expect(html).toContain("Not the winning pick");
  });

  it("prints the public EV call and points at tonight's live Ladder", () => {
    expect(html).toContain("SKIP");
    expect(html).toContain("Open the live Ladder for tonight");
    expect(html).toContain("Tonight's #1 is on the live desk, not on this page");
    expect(html).toContain("/?desk=national&amp;game=powerball");
  });

  it("names Desk pick as least-crowded, not a forecast", () => {
    expect(html).toContain("least-crowded board");
    expect(html).toContain("not a forecast");
  });

  it("keeps Lottery Lab as the proof page and stays a desk page", () => {
    expect(html).toContain("/lottery-lab.html");
    expect(html).toContain("JackpotDesk");
    expect(html).not.toMatch(/Darren|founder|sign up|subscribe|paywall|account required/i);
    expect(html).not.toMatch(/winning numbers|AI picks|Beats Quick Pick|predict the next/i);
  });

  it("has no em dashes", () => {
    expect(html).not.toContain("\u2014");
  });
});
