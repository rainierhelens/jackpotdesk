import { describe, expect, it } from "vitest";
import {
  officialDrawFrom,
  parseCaLatestDraw,
  parseWaBoardDate,
  parseWaLatestDraw,
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

describe("parseWaLatestDraw", () => {
  const now = new Date("2026-08-27T12:30:00Z");

  it("reads WED/AUG 26 as the current Pacific year", () => {
    expect(parseWaBoardDate("WED/AUG 26", now)).toBe("2026-08-26");
  });

  it("reads Washington Powerball when NY and CA still lag", () => {
    const html = `
      <p class="powerball-latest-draw">Latest Draw: <strong>WED/AUG 26</strong></p>
      <div class="game-balls game-balls_powerball">
        <ul>
          <li>12</li><li>32</li><li>45</li><li>50</li><li>58</li>
          <li class="game-ball-powerball">02</li>
        </ul>
      </div>
      <div class="game-balls game-balls_double-play">
        <ul>
          <li>06</li><li>11</li><li>15</li><li>32</li><li>58</li>
          <li class="game-ball-powerball">18</li>
        </ul>
      </div>`;
    expect(parseWaLatestDraw("powerball", html, now)).toEqual({
      date: "2026-08-26",
      whites: [12, 32, 45, 50, 58],
      extra: 2,
    });
  });

  it("reads Washington Mega Millions from the first game-balls list", () => {
    const html = `
      <p>Latest Draw: <strong>TUE/AUG 25</strong></p>
      <div class="game-balls">
        <ul>
          <li>07</li><li>10</li><li>47</li><li>48</li><li>50</li>
          <li class="game-ball-megamillions">14</li>
        </ul>
      </div>`;
    expect(parseWaLatestDraw("megamillions", html, now)).toEqual({
      date: "2026-08-25",
      whites: [7, 10, 47, 48, 50],
      extra: 14,
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
