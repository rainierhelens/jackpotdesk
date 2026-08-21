import { describe, expect, it } from "vitest";
import { deskPay } from "./deskPrize";
import {
  FREE_PLAY_LABEL,
  JACKPOT_UNKNOWN,
  OVERTIME_FILLING,
  OVERTIME_NOTE,
  OVERTIME_VS,
  deskSlipCost,
  formatOvertimeNet,
  overtimeHeadline,
  overtimeNet,
  overtimeScore,
  overtimeWindowRange,
  recapJackpotCash,
  recapMonthLabel,
  recapQuarterLabel,
  recapQuarterStart,
  scoreOvertime,
  scoreOvertimeNight,
  scoreOvertimeWindows,
  shiftRecapIso,
  type OvertimeBlock,
  type OvertimeDay,
} from "./deskOvertime";

const HIT5: OvertimeBlock = {
  id: "hit5",
  label: "Hit 5",
  officialWhites: [8, 14, 19, 26, 37],
  officialExtra: null,
  cashpot: 230_000,
  rungs: [
    { rank: 1, whites: [8, 1, 2, 3, 4], extra: null },
    { rank: 2, whites: [14, 1, 2, 3, 4], extra: null },
    { rank: 3, whites: [19, 1, 2, 3, 4], extra: null },
  ],
};

const LOTTO: OvertimeBlock = {
  id: "lotto",
  label: "Lotto",
  officialWhites: [5, 8, 17, 28, 32, 41],
  officialExtra: null,
  cash: "600K",
  advertised: "1.2M",
  rungs: [
    { rank: 1, whites: [5, 1, 2, 3, 4, 6], extra: null },
    { rank: 2, whites: [8, 1, 2, 3, 4, 6], extra: null },
    { rank: 3, whites: [17, 1, 2, 3, 4, 6], extra: null },
  ],
};

const POWER: OvertimeBlock = {
  id: "powerball",
  label: "Powerball",
  officialWhites: [5, 12, 23, 44, 61],
  officialExtra: 9,
  cash: "176M",
  advertised: "380M",
  rungs: [
    { rank: 1, whites: [5, 1, 2, 3, 4], extra: 8, extraHit: false },
    { rank: 2, whites: [12, 1, 2, 3, 4], extra: 8, extraHit: false },
    { rank: 3, whites: [23, 1, 2, 3, 4], extra: 8, extraHit: false },
  ],
};

const MEGA: OvertimeBlock = {
  id: "megamillions",
  label: "Mega Millions",
  officialWhites: [2, 9, 18, 30, 50],
  officialExtra: 4,
  cash: "80M",
  advertised: "200M",
  rungs: [
    { rank: 1, whites: [1, 3, 7, 11, 22], extra: 8, extraHit: false },
    { rank: 2, whites: [6, 8, 10, 12, 14], extra: 8, extraHit: false },
    { rank: 3, whites: [15, 16, 17, 19, 20], extra: 8, extraHit: false },
  ],
};

function day(
  asOf: string,
  national: OvertimeBlock[] = [],
  washington: OvertimeBlock[] = [],
): OvertimeDay {
  return { asOf, national, washington };
}

function copyBanned(text: string): void {
  expect(text).not.toContain("\u2014");
  expect(text).not.toMatch(/winning numbers|beats Quick Pick/i);
}

describe("deskSlipCost official slips", () => {
  it("costs three Hit 5 boards $3, three Lotto boards $2, three PB $6, three MM $15", () => {
    expect(deskSlipCost("hit5", 3)).toBe(3);
    expect(deskSlipCost("lotto", 3)).toBe(2);
    expect(deskSlipCost("powerball", 3)).toBe(6);
    expect(deskSlipCost("megamillions", 3)).toBe(15);
  });
});

describe("overtime official pay", () => {
  it("pays $0 for 1 of 5 Hit 5, 1 of 6 Lotto, and 1 of 5 with no Powerball", () => {
    expect(
      deskPay(HIT5, { whites: [8, 1, 2, 3, 4], extra: null }),
    ).toEqual({ kind: "zero", amount: 0, base: false });
    expect(
      deskPay(LOTTO, { whites: [5, 1, 2, 3, 4, 6], extra: null }),
    ).toEqual({ kind: "zero", amount: 0, base: false });
    expect(
      deskPay(POWER, { whites: [5, 1, 2, 3, 4], extra: 8, extraHit: false }),
    ).toEqual({ kind: "zero", amount: 0, base: false });

    const night = scoreOvertimeNight(day("2026-08-20", [POWER], [HIT5, LOTTO]));
    expect(night.paid).toBe(0);
    expect(night.games.map((row) => row.paid)).toEqual([0, 0, 0]);
    expect(night.games.find((row) => row.game === "hit5")?.line).toBe(
      "Hit 5 · 3 boards · spent $3 · paid $0 · -$3",
    );
    expect(night.games.find((row) => row.game === "lotto")?.line).toBe(
      "Lotto · 3 boards · spent $2 · paid $0 · -$2",
    );
    expect(night.games.find((row) => row.game === "powerball")?.line).toBe(
      "Powerball · 3 boards · spent $6 · paid $0 · -$6",
    );
  });

  it("credits a Hit 5 free play at $1 and labels it", () => {
    const hit5: OvertimeBlock = {
      ...HIT5,
      rungs: [
        { rank: 1, whites: [8, 14, 1, 2, 3], extra: null },
        { rank: 2, whites: [1, 2, 3, 4, 5], extra: null },
        { rank: 3, whites: [6, 7, 9, 10, 11], extra: null },
      ],
    };
    const night = scoreOvertimeNight(day("2026-08-20", [], [hit5]));
    const row = night.games[0];
    expect(row.paid).toBe(0);
    expect(row.credit).toBe(1);
    expect(row.freePlays).toBe(1);
    expect(row.anyRevenue).toBe(false);
    expect(row.beatHouse).toBe(false);
    expect(row.line).toContain(FREE_PLAY_LABEL);
    expect(row.line).toBe(
      `Hit 5 · 3 boards · spent $3 · paid $0 · ${FREE_PLAY_LABEL} · -$3`,
    );
    copyBanned(row.line);
  });

  it("uses recap cashpot / cash for a jackpot and never advertised annuity", () => {
    expect(recapJackpotCash(HIT5)).toBe(230_000);
    expect(recapJackpotCash(LOTTO)).toBe(600_000);
    expect(recapJackpotCash({ ...LOTTO, cash: null })).toBeNull();
    expect(
      recapJackpotCash({ ...POWER, cash: null, advertised: "380M" }),
    ).toBeNull();

    const jackpot: OvertimeBlock = {
      ...HIT5,
      cashpot: undefined,
      rungs: [{ rank: 1, whites: [8, 14, 19, 26, 37], extra: null }],
    };
    const night = scoreOvertimeNight(day("2026-08-20", [], [jackpot]));
    expect(night.paid).toBe(0);
    expect(night.jackpotUnknown).toBe(true);
    expect(night.net).toBeNull();
    expect(night.score).toBe(JACKPOT_UNKNOWN);
    expect(night.headline).toBe(`${OVERTIME_VS} · ${JACKPOT_UNKNOWN}`);
    expect(night.nightLine).toContain(JACKPOT_UNKNOWN);
    expect(night.nightLine).not.toMatch(/[+-]\$\d/);
    expect(night.games[0].net).toBeNull();
    expect(night.games[0].line).toContain(JACKPOT_UNKNOWN);
    expect(night.games[0].line).not.toMatch(/[+-]\$\d/);
  });

  it("keeps Mega Millions prize cash on the base ticket", () => {
    const mega: OvertimeBlock = {
      ...MEGA,
      rungs: [
        { rank: 1, whites: [1, 3, 5, 6, 7], extra: 4, extraHit: true },
        { rank: 2, whites: [8, 10, 11, 12, 13], extra: 8, extraHit: false },
        { rank: 3, whites: [14, 15, 16, 17, 19], extra: 8, extraHit: false },
      ],
    };
    const night = scoreOvertimeNight(day("2026-08-20", [mega]));
    const row = night.games[0];
    expect(row.spent).toBe(15);
    expect(row.paid).toBe(5);
    expect(row.base).toBe(true);
    expect(row.net).toBe(-10);
    expect(row.line).toBe(
      "Mega Millions · 3 boards · spent $15 · paid base $5 · -$10",
    );
  });

  it("ignores a #5 rung", () => {
    const hit5: OvertimeBlock = {
      ...HIT5,
      rungs: [
        ...HIT5.rungs,
        { rank: 5, whites: [8, 14, 19, 26, 1], extra: null },
      ],
    };
    const night = scoreOvertimeNight(day("2026-08-20", [], [hit5]));
    expect(night.games[0].boards).toBe(3);
    expect(night.games[0].spent).toBe(3);
    expect(night.games[0].paid).toBe(0);
  });
});

describe("overtime running log", () => {
  it("sums cost and paid across two mornings and still shows last night", () => {
    const miss = day("2026-08-19", [POWER, MEGA], [HIT5, LOTTO]);
    const hit: OvertimeDay = {
      asOf: "2026-08-20",
      national: [
        {
          ...POWER,
          rungs: [
            { rank: 1, whites: [5, 12, 1, 2, 3], extra: 9, extraHit: true },
            { rank: 2, whites: [1, 2, 3, 4, 6], extra: 8, extraHit: false },
            { rank: 3, whites: [7, 8, 10, 11, 13], extra: 8, extraHit: false },
          ],
        },
      ],
      washington: [
        {
          ...HIT5,
          rungs: [
            { rank: 1, whites: [8, 14, 19, 26, 1], extra: null },
            { rank: 2, whites: [1, 2, 3, 4, 5], extra: null },
            { rank: 3, whites: [6, 7, 9, 10, 11], extra: null },
          ],
        },
      ],
    };

    const board = scoreOvertime([miss, hit]);
    expect(board.mornings).toBe(2);
    expect(board.lastNight?.asOf).toBe("2026-08-20");
    expect(board.lastNight?.spent).toBe(9);
    expect(board.lastNight?.paid).toBe(157);
    expect(board.spent).toBe(9 + 3 + 6 + 15 + 2);
    expect(board.paid).toBe(157);
    expect(board.anyRevenue).toBe(true);
    expect(board.beatHouse).toBe(true);
    expect(board.net).toBe(122);
    expect(board.score).toBe("+$122");
    expect(board.headline).toBe(`${OVERTIME_VS} · +$122`);
    expect(board.acrossLine).toBe(
      "Overtime · 2 mornings · spent $35 · paid $157",
    );
    expect(board.lastNight?.nightLine).toBe(
      "Last night · spent $9 · paid $157 · +$148",
    );
    expect(board.games.find((row) => row.game === "hit5")?.line).toBe(
      "Hit 5 · 6 boards · spent $6 · paid $150 · +$144",
    );
    expect(board.revenueWatch).toBe("cash on the board");
    expect(board.houseWatch).toBe("ahead of the house");
  });

  it("reads a single morning as overtime and last night", () => {
    const board = scoreOvertime([day("2026-08-20", [MEGA], [HIT5])]);
    expect(board.mornings).toBe(1);
    expect(board.spent).toBe(18);
    expect(board.paid).toBe(0);
    expect(board.net).toBe(-18);
    expect(board.headline).toBe(`${OVERTIME_VS} · -$18`);
    expect(board.acrossLine).toBe("Overtime · 1 morning · spent $18 · paid $0");
    expect(board.lastNight?.nightLine).toBe(
      "Last night · spent $18 · paid $0 · -$18",
    );
    expect(board.revenueWatch).toBe("no cash yet");
    expect(board.houseWatch).toBe("house");
    expect(board.games.find((row) => row.game === "megamillions")?.line).toBe(
      "Mega Millions · 3 boards · spent $15 · paid $0 · -$15",
    );
  });

  it("keeps copy free of em dashes, winning numbers, and beats Quick Pick", () => {
    const board = scoreOvertime([
      day("2026-08-20", [POWER, MEGA], [HIT5, LOTTO]),
    ]);
    const copy = [
      board.headline,
      board.acrossLine,
      board.lastNight?.nightLine ?? "",
      board.revenueWatch,
      board.houseWatch,
      OVERTIME_NOTE,
      ...board.games.map((row) => row.line),
    ].join("\n");
    copyBanned(copy);
    expect(copy).not.toMatch(/Same hit odds as Quick Pick/);
  });
});

describe("overtime windows", () => {
  it("reads last 7 days, calendar month, and quarter from recap asOf dates", () => {
    expect(shiftRecapIso("2026-08-20", -6)).toBe("2026-08-14");
    expect(recapMonthLabel("2026-08-20")).toBe("August 2026");
    expect(recapQuarterLabel("2026-08-20")).toBe("Q3 2026");
    expect(recapQuarterStart("2026-08-20")).toBe("2026-07-01");
    expect(overtimeWindowRange("days7", "2026-08-20")).toMatchObject({
      from: "2026-08-14",
      to: "2026-08-20",
      target: 7,
    });
  });

  it("marks all three windows as filling when the log is one morning", () => {
    const desk = scoreOvertimeWindows([day("2026-08-20", [MEGA], [HIT5])]);
    expect(desk.windows.map((window) => window.id)).toEqual([
      "days7",
      "month",
      "quarter",
    ]);
    expect(desk.windows.every((window) => window.filling)).toBe(true);
    expect(desk.windows.every((window) => window.mornings === 1)).toBe(true);
    expect(desk.windows.every((window) => window.headline === `${OVERTIME_VS} · -$18`)).toBe(
      true,
    );
    expect(desk.windows[0]?.acrossLine).toBe(
      `Last 7 days · 1 of 7 mornings · spent $18 · paid $0 · ${OVERTIME_FILLING}`,
    );
    expect(desk.windows[1]?.acrossLine).toBe(
      `August 2026 · 1 of 30 mornings · spent $18 · paid $0 · ${OVERTIME_FILLING}`,
    );
    expect(desk.windows[2]?.acrossLine).toBe(
      `Q3 2026 · 1 of 90 mornings · spent $18 · paid $0 · ${OVERTIME_FILLING}`,
    );
    expect(desk.all.acrossLine).toBe("All-time · 1 morning · spent $18 · paid $0");
    expect(desk.all.headline).toBe(`${OVERTIME_VS} · -$18`);
  });

  it("keeps a July morning out of the 7-day and August windows, and a June morning out of Q3", () => {
    const august = day("2026-08-20", [POWER], [HIT5]);
    const july = day("2026-07-31", [MEGA]);
    const june = day("2026-06-30", [MEGA]);
    const desk = scoreOvertimeWindows([june, july, august]);
    const days7 = desk.windows.find((window) => window.id === "days7");
    const month = desk.windows.find((window) => window.id === "month");
    const quarter = desk.windows.find((window) => window.id === "quarter");
    expect(days7?.mornings).toBe(1);
    expect(days7?.spent).toBe(9);
    expect(month?.mornings).toBe(1);
    expect(month?.label).toBe("August 2026");
    expect(quarter?.mornings).toBe(2);
    expect(quarter?.spent).toBe(9 + 15);
    expect(desk.all.mornings).toBe(3);
    expect(desk.lastNight?.asOf).toBe("2026-08-20");
  });

  it("closes the 7-day window at 7 recap mornings and still fills month and quarter", () => {
    const days = [13, 14, 15, 16, 17, 18, 19, 20].map((dayNum) =>
      day(`2026-08-${dayNum}`, [POWER], [HIT5]),
    );
    const desk = scoreOvertimeWindows(days);
    const days7 = desk.windows.find((window) => window.id === "days7");
    expect(days7?.mornings).toBe(7);
    expect(days7?.filling).toBe(false);
    expect(days7?.headline).toBe(`${OVERTIME_VS} · -$63`);
    expect(days7?.acrossLine).toBe(
      "Last 7 days · 7 mornings · spent $63 · paid $0",
    );
    expect(days7?.acrossLine).not.toContain(OVERTIME_FILLING);
    expect(desk.windows.find((window) => window.id === "month")?.filling).toBe(
      true,
    );
    expect(desk.windows.find((window) => window.id === "quarter")?.filling).toBe(
      true,
    );
  });

  it("keeps window copy free of em dashes, winning numbers, and beats Quick Pick", () => {
    const desk = scoreOvertimeWindows([
      day("2026-08-20", [POWER, MEGA], [HIT5, LOTTO]),
    ]);
    const copy = [
      desk.lastNight?.headline ?? "",
      desk.lastNight?.nightLine ?? "",
      desk.all.headline,
      desk.all.acrossLine,
      OVERTIME_NOTE,
      ...desk.windows.flatMap((window) => [
        window.headline,
        window.acrossLine,
        window.revenueWatch,
        window.houseWatch,
        ...window.games.map((row) => row.line),
      ]),
    ].join("\n");
    copyBanned(copy);
    expect(copy).not.toMatch(/Same hit odds as Quick Pick/);
    expect(copy).not.toMatch(/tonight'?s #1/i);
  });
});

describe("overtime net", () => {
  const missMorning = day("2026-08-20", [POWER, MEGA], [HIT5, LOTTO]);

  it("formats paid minus spent as a signed sports score", () => {
    expect(formatOvertimeNet(-26)).toBe("-$26");
    expect(formatOvertimeNet(-11)).toBe("-$11");
    expect(formatOvertimeNet(15)).toBe("+$15");
    expect(formatOvertimeNet(0)).toBe("$0");
    expect(overtimeNet(0, 26, false)).toBe(-26);
    expect(overtimeNet(15, 26, false)).toBe(-11);
    expect(overtimeNet(40, 26, false)).toBe(14);
    expect(overtimeNet(0, 26, true)).toBeNull();
    expect(overtimeScore(0, 26, true)).toEqual({
      net: null,
      score: JACKPOT_UNKNOWN,
    });
    expect(overtimeHeadline({ net: -26, score: "-$26" })).toBe(
      `${OVERTIME_VS} · -$26`,
    );
  });

  it("reads a $26 miss morning as Ladder vs the house · -$26", () => {
    const desk = scoreOvertimeWindows([missMorning]);
    const days7 = desk.windows[0];
    expect(days7?.spent).toBe(26);
    expect(days7?.paid).toBe(0);
    expect(days7?.net).toBe(-26);
    expect(days7?.score).toBe("-$26");
    expect(days7?.headline).toBe(`${OVERTIME_VS} · -$26`);
    expect(days7?.acrossLine).toBe(
      `Last 7 days · 1 of 7 mornings · spent $26 · paid $0 · ${OVERTIME_FILLING}`,
    );
    expect(days7?.games.find((row) => row.game === "hit5")?.line).toBe(
      "Hit 5 · 3 boards · spent $3 · paid $0 · -$3",
    );
    expect(desk.lastNight?.headline).toBe(`${OVERTIME_VS} · -$26`);
  });

  it("reads $15 paid on $26 spent as -$11", () => {
    const hit15: OvertimeBlock = {
      ...HIT5,
      rungs: [
        { rank: 1, whites: [8, 14, 19, 1, 2], extra: null },
        { rank: 2, whites: [1, 2, 3, 4, 5], extra: null },
        { rank: 3, whites: [6, 7, 9, 10, 11], extra: null },
      ],
    };
    const desk = scoreOvertimeWindows([
      day("2026-08-20", [POWER, MEGA], [hit15, LOTTO]),
    ]);
    const days7 = desk.windows[0];
    expect(days7?.spent).toBe(26);
    expect(days7?.paid).toBe(15);
    expect(days7?.net).toBe(-11);
    expect(days7?.headline).toBe(`${OVERTIME_VS} · -$11`);
    expect(days7?.games.find((row) => row.game === "hit5")?.line).toBe(
      "Hit 5 · 3 boards · spent $3 · paid $15 · +$12",
    );
  });

  it("reads ahead of the house as +$X", () => {
    const hit: OvertimeDay = {
      asOf: "2026-08-20",
      national: [
        {
          ...POWER,
          rungs: [
            { rank: 1, whites: [5, 12, 1, 2, 3], extra: 9, extraHit: true },
            { rank: 2, whites: [1, 2, 3, 4, 6], extra: 8, extraHit: false },
            { rank: 3, whites: [7, 8, 10, 11, 13], extra: 8, extraHit: false },
          ],
        },
      ],
      washington: [
        {
          ...HIT5,
          rungs: [
            { rank: 1, whites: [8, 14, 19, 26, 1], extra: null },
            { rank: 2, whites: [1, 2, 3, 4, 5], extra: null },
            { rank: 3, whites: [6, 7, 9, 10, 11], extra: null },
          ],
        },
      ],
    };
    const board = scoreOvertime([hit]);
    expect(board.spent).toBe(9);
    expect(board.paid).toBe(157);
    expect(board.net).toBe(148);
    expect(board.score).toBe("+$148");
    expect(board.headline).toBe(`${OVERTIME_VS} · +$148`);
    expect(board.score.startsWith("+")).toBe(true);
  });

  it("does not invent a net when a jackpot has no cash figure", () => {
    const jackpot: OvertimeBlock = {
      ...HIT5,
      cashpot: undefined,
      rungs: [{ rank: 1, whites: [8, 14, 19, 26, 37], extra: null }],
    };
    const desk = scoreOvertimeWindows([day("2026-08-20", [MEGA], [jackpot])]);
    const days7 = desk.windows[0];
    expect(days7?.jackpotUnknown).toBe(true);
    expect(days7?.net).toBeNull();
    expect(days7?.score).toBe(JACKPOT_UNKNOWN);
    expect(days7?.headline).toBe(`${OVERTIME_VS} · ${JACKPOT_UNKNOWN}`);
    expect(days7?.headline).not.toMatch(/[+-]\$\d/);
    expect(days7?.games.find((row) => row.game === "hit5")?.line).toContain(
      JACKPOT_UNKNOWN,
    );
    expect(days7?.games.find((row) => row.game === "hit5")?.net).toBeNull();
  });
});
