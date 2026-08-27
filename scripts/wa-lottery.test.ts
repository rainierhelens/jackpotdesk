import { describe, expect, it } from "vitest";
import { mergeDraws, parseWaGameLatest, parseWaLatestLabel } from "./wa-lottery.mjs";

describe("parseWaGameLatest", () => {
  const now = new Date("2026-08-27T12:30:00Z");

  it("reads WED/AUG 26 Hit 5 off the game page when past drawings lag", () => {
    expect(parseWaLatestLabel("WED/AUG 26", now)).toBe("2026-08-26");
    const html = `
      <p>Latest Draw: <strong>WED/AUG 26</strong></p>
      <div class="game-balls">
        <ul>
          <li>01</li><li>12</li><li>27</li><li>30</li><li>31</li>
        </ul>
      </div>`;
    expect(parseWaGameLatest(html, 5)).toEqual({
      date: "2026-08-26",
      numbers: [1, 12, 27, 30, 31],
    });
  });

  it("reads WED/AUG 26 Lotto off the game page", () => {
    const html = `
      <p>Latest Draw: <strong>WED/AUG 26</strong></p>
      <div class="game-balls">
        <ul>
          <li>10</li><li>12</li><li>16</li><li>22</li><li>39</li><li>48</li>
        </ul>
      </div>`;
    expect(parseWaGameLatest(html, 6)).toEqual({
      date: "2026-08-26",
      numbers: [10, 12, 16, 22, 39, 48],
    });
  });
});

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
