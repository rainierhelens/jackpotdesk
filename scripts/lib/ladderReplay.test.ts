import { describe, expect, it } from "vitest";
import {
  LEDGER_NOTE,
  boardDelta,
  closestRank,
  emptyBook,
  mergeRows,
  rowFromReplay,
  rowsFromRecapPayload,
  type LadderReplayRow,
} from "./ladderReplay.ts";
import type { RecapPayload, ReplayRung } from "./deskLetter.ts";

const RUNG: ReplayRung = {
  rank: 1,
  board: "03  12  28  44  55  +  09 Powerball",
  whites: [3, 12, 28, 44, 55],
  extra: 9,
  points: 62,
  crowd: "0.91x crowd",
  why: "3 in the top-10",
  whiteHits: 2,
  extraHit: true,
  matchLine: "2 of 5 whites · Powerball hit",
};

function sampleRow(
  game: LadderReplayRow["game"] = "powerball",
  officialDate = "2026-08-17",
): LadderReplayRow {
  return rowFromReplay(
    game,
    officialDate,
    [7, 16, 36, 40, 48],
    20,
    1200,
    [RUNG],
    "2026-08-20T12:00:00.000Z",
  );
}

describe("boardDelta", () => {
  it("splits overlap, official-only, and ladder-only whites", () => {
    expect(boardDelta([7, 16, 36, 40, 48], [3, 12, 28, 44, 55])).toEqual({
      overlap: [],
      officialOnly: [7, 16, 36, 40, 48],
      ladderOnly: [3, 12, 28, 44, 55],
    });
    expect(boardDelta([5, 12, 23, 44, 61], [3, 12, 28, 44, 55])).toEqual({
      overlap: [12, 44],
      officialOnly: [5, 23, 61],
      ladderOnly: [3, 28, 55],
    });
  });
});

describe("closestRank", () => {
  it("keeps the lowest rank when white hits tie", () => {
    expect(
      closestRank([
        { rank: 1, whiteHits: 1, extraHit: false },
        { rank: 2, whiteHits: 1, extraHit: false },
      ]),
    ).toBe(1);
  });

  it("uses an extra-ball hit as a tie-break after whites", () => {
    expect(
      closestRank([
        { rank: 1, whiteHits: 1, extraHit: false },
        { rank: 2, whiteHits: 1, extraHit: true },
      ]),
    ).toBe(2);
  });
});

describe("mergeRows", () => {
  it("appends a new official date and never overwrites an existing row", () => {
    const first = sampleRow("powerball", "2026-08-17");
    const seeded = mergeRows(emptyBook("2026-08-20T12:00:00.000Z"), [first], first.recorded);
    expect(seeded.added).toBe(1);

    const changed: LadderReplayRow = {
      ...first,
      officialWhites: [1, 2, 3, 4, 5],
      recorded: "2026-08-21T12:00:00.000Z",
    };
    const again = mergeRows(seeded.book, [changed], changed.recorded);
    expect(again.added).toBe(0);
    expect(again.book.rows[0].officialWhites).toEqual([7, 16, 36, 40, 48]);
    expect(again.book.rows[0].recorded).toBe("2026-08-20T12:00:00.000Z");

    const next = sampleRow("powerball", "2026-08-19");
    const grown = mergeRows(again.book, [next], next.recorded);
    expect(grown.added).toBe(1);
    expect(grown.book.rows.map((row) => row.officialDate)).toEqual([
      "2026-08-19",
      "2026-08-17",
    ]);
  });

  it("keeps the archive note honest", () => {
    expect(LEDGER_NOTE).toContain("never overwritten");
    expect(LEDGER_NOTE).toContain("never the winning pick");
    expect(LEDGER_NOTE).not.toContain("\u2014");
  });
});

describe("rowsFromRecapPayload", () => {
  it("stores last night from the recap and skips tonight", () => {
    const payload: RecapPayload = {
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
          advice: "Don't buy this as an investment.",
          tone: "no",
          officialDate: "2026-08-17",
          officialBoard: "07  16  36  40  48  +  20 Powerball",
          officialWhites: [7, 16, 36, 40, 48],
          officialExtra: 20,
          historyBefore: 1200,
          heat: null,
          ladderHref: "https://www.jackpotdesk.com/?desk=national&game=powerball",
          rungs: [RUNG],
        },
      ],
      washington: [],
    };
    const rows = rowsFromRecapPayload(payload, "2026-08-20T12:00:00.000Z");
    expect(rows).toHaveLength(1);
    expect(rows[0].game).toBe("powerball");
    expect(rows[0].officialDate).toBe("2026-08-17");
    expect(rows[0].rungs[0].overlap).toEqual([]);
    expect(rows[0].rungs[0].officialOnly).toEqual([7, 16, 36, 40, 48]);
    expect(JSON.stringify(rows)).not.toContain("tonight");
  });
});
