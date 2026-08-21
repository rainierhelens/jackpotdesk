import { describe, expect, it } from "vitest";
import { formatRecapHtml } from "./draw-recap.ts";
import {
  DESK_LINE_LEAD,
  DESK_LINE_LINK,
  DESK_LINE_MAX,
  SAME_ODDS_LEAD,
  digestCallLine,
  matchLine,
  recapCallLine,
  recapDeskLine,
  recapDeskStrip,
  scoreReplay,
  type RecapPayload,
} from "./lib/deskLetter.ts";
import { recapExtraClass } from "../src/lib/recapPayload.ts";

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
      officialWhites: [5, 12, 23, 44, 61],
      officialExtra: 9,
      historyBefore: 1200,
      heat: {
        draws: 80,
        whiteMax: 5,
        extraMax: 2,
        extraLabel: "Powerball",
        whites: [1, 2, 3, 4, 5].map((n) => ({ n, count: n * 3 })),
        extras: [
          { n: 1, count: 4 },
          { n: 9, count: 11 },
        ],
      },
      ladderHref: "https://www.jackpotdesk.com/?desk=national&game=powerball",
      rungs: [
        {
          rank: 1,
          board: "03  12  28  44  55  +  09 Powerball",
          whites: [3, 12, 28, 44, 55],
          extra: 9,
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
          whites: [1, 8, 19, 33, 60],
          extra: 4,
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
          whites: [10, 11, 22, 40, 50],
          extra: 18,
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
      officialWhites: [5, 8, 19, 28, 41],
      officialExtra: null,
      historyBefore: 180,
      heat: null,
      ladderHref: "https://www.jackpotdesk.com/?desk=washington&wa=hit5",
      rungs: [
        {
          rank: 1,
          board: "05  11  19  30  40",
          whites: [5, 11, 19, 30, 40],
          extra: null,
          points: 54,
          crowd: null,
          why: "2 in the top-10",
          whiteHits: 2,
          extraHit: null,
          matchLine: "2 of 5 whites",
        },
      ],
    },
    {
      id: "lotto",
      label: "Lotto",
      when: "Mon / Wed / Sat 8 p.m. PT",
      prizeLine: "Advertised $1,200,000.",
      officialDate: "2026-08-16",
      officialBoard: "05  08  19  28  32  41",
      officialWhites: [5, 8, 19, 28, 32, 41],
      officialExtra: null,
      historyBefore: 220,
      heat: null,
      ladderHref: "https://www.jackpotdesk.com/?desk=washington&wa=lotto",
      officialStore: "Buena Market, Burien",
      rungs: [
        {
          rank: 1,
          board: "05  11  19  30  32  40",
          whites: [5, 11, 19, 30, 32, 40],
          extra: null,
          points: 54,
          crowd: null,
          why: "3 in the top-10",
          whiteHits: 3,
          extraHit: null,
          matchLine: "3 of 6 whites",
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

describe("recap ball colors", () => {
  it("makes Powerball red and Mega Ball gold", () => {
    expect(recapExtraClass("Powerball")).toBe("is-powerball");
    expect(recapExtraClass("Mega Ball")).toBe("is-megaball");
    expect(recapExtraClass(null)).toBe("");
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

describe("recap page", () => {
  const html = formatRecapHtml(FIXTURE);

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

  it("paints official balls next to last night's #1 slip", () => {
    expect(html).toContain('class="recap-compare"');
    expect(html).toContain("Last night #1");
    expect(html).toContain('class="recap-ball"');
    expect(html).toContain('class="recap-ball is-powerball');
    expect(html).toContain(">09</span>");
  });

  it("styles every rung as balls and shows a small frequency map", () => {
    expect(html).toContain('class="recap-heat"');
    expect(html).toContain("Frequency before this drawing");
    expect(html).toContain("Yellow rings are last night's #1");
    expect(html).toContain("is-official");
    expect(html.match(/class="recap-balls"/g)?.length).toBeGreaterThan(3);
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
    expect(html).toContain('class="shell"');
    expect(html).toContain('class="panel desk-page"');
    expect(html).toContain("/desk-page.css");
    expect(html).not.toContain("/legal.css");
    expect(html).not.toContain("legal-nav");
    expect(html).not.toMatch(/Darren|founder|sign up|subscribe|paywall|account required/i);
    expect(html).not.toMatch(/winning numbers|AI picks|Beats Quick Pick|predict the next/i);
  });

  it("has no em dashes", () => {
    expect(html).not.toContain("\u2014");
  });

  it("lives at /recap, not a query string", () => {
    expect(html).toContain('rel="canonical" href="https://www.jackpotdesk.com/recap"');
    expect(html).toContain('href="/recap"');
    expect(html).toContain("/recap/2026-08-20");
    expect(html).not.toMatch(/[?&]tab=recap|[?&]page=recap/);
  });

  it("shows Recap in the same primary tab bar as the desk", () => {
    expect(html).toContain('aria-label="Primary"');
    expect(html).toMatch(/<a href="\/recap" class="on" aria-current="page">Recap<\/a>/);
    expect(html).toContain("Last night vs The Ladder");
    expect(html).toContain('class="recap-main"');
  });

  it("includes a copyable tweet-length desk line per game", () => {
    const power = recapDeskLine(FIXTURE.national[0]);
    const hit5 = recapDeskLine(FIXTURE.washington[0]);
    const lotto = recapDeskLine(FIXTURE.washington[1]);
    const strip = recapDeskStrip(FIXTURE);
    expect(power.startsWith("Powerball 2026-08-18")).toBe(true);
    expect(power).not.toContain(DESK_LINE_LEAD);
    expect(power.length).toBeLessThanOrEqual(DESK_LINE_MAX);
    expect(power).toContain("Last night #1 2 of 5 (12 44 + 09)");
    expect(power).toContain("#2 0 of 5");
    expect(power).toContain("#3 0 of 5");
    expect(hit5).toContain("Last night #1 2 of 5 (05 19)");
    expect(lotto).toContain("Last night #1 3 of 6 (05 19 32)");
    expect(lotto).not.toMatch(/\d of 5/);
    expect(strip).toBeTruthy();
    expect(strip!.startsWith("Lotto is 6 whites")).toBe(true);
    expect(strip).toContain("not 3 of 5");
    expect(html).toContain('class="recap-desk-line"');
    expect(html).toContain(power);
    expect(html).toContain(hit5);
    expect(html).toContain(lotto);
    expect(html).toContain(strip!);
    expect(html).toContain('id="desk-line-strip"');
    expect(html).toContain('id="desk-line-powerball"');
    expect(html).toContain('id="desk-line-hit-5"');
    expect(html).toContain('id="desk-line-lotto"');
    expect(html).toContain("Copy");
    expect(html).toContain("data-copy-target");
    expect(html).toContain("Not tonight's #1");
    expect(html).not.toMatch(/winning numbers|beats Quick Pick|Fable|tip sheet/i);
    expect(html).not.toContain("Buena Market");
    expect(html).not.toContain("Burien");
  });

  it("keeps a dated archive URL under /recap", () => {
    const archive = formatRecapHtml(FIXTURE, {
      path: "/recap/2026-08-20",
      kind: "archive",
    });
    expect(archive).toContain(
      'rel="canonical" href="https://www.jackpotdesk.com/recap/2026-08-20"',
    );
    expect(archive).toContain("Latest recap");
    expect(archive).toContain(SAME_ODDS_LEAD);
    expect(archive).toContain("Tonight's #1 is on the live desk, not on this page");
  });
});
