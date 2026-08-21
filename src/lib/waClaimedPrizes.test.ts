import { describe, expect, it } from "vitest";
import book from "../data/waClaimedPrizesByStore.json";
import page from "../../public/washington/claimed-prizes-by-store/index.html?raw";
import {
  BUSY_STORY,
  CLAIMED_CHIP_ORDER,
  CLAIMED_QUESTION,
  CLAIMED_SAME_ODDS,
  CLAIMED_SOURCE_URL,
  CLAIMED_WALK_LINE,
  FAT_STORY,
  QUIET_STORY,
  WA_CLAIMED,
  bookHasWinnerNames,
  claimedCities,
  claimedLongTail,
  claimedPageLead,
  claimedTooltip,
  copyHasBannedPhrase,
  filterClaimedStores,
  listedGapDays,
  parseClaimedPrizeBook,
  pickBusyCounter,
  pickClaimedWalk,
  pickFatTicket,
  pickQuietList,
} from "./waClaimedPrizes";

describe("waClaimedPrizes book", () => {
  it("keeps the official Aug 20 2026 snapshot shape without names or pins", () => {
    const parsed = parseClaimedPrizeBook(book);
    expect(parsed.sourceUrl).toBe(CLAIMED_SOURCE_URL);
    expect(parsed.locatedClaims).toBe(5896);
    expect(parsed.storeCount).toBe(2158);
    expect(parsed.unlocatedClaims).toBe(31);
    expect(parsed.dateMin).toBe("2025-08-21");
    expect(parsed.dateMax).toBe("2026-08-19");
    expect(bookHasWinnerNames(parsed)).toBe(false);
    expect(JSON.stringify(parsed)).not.toMatch(/NAME:|firstName|lastName/);
    for (const store of parsed.stores) {
      expect(store).not.toHaveProperty("lat");
      expect(store).not.toHaveProperty("lng");
      expect(store).not.toHaveProperty("kiosk");
      expect(store).not.toHaveProperty("sales");
      expect(store.gameLastDates).toBeTruthy();
    }
  });

  it("sorts stores by listed claim count", () => {
    const rows = filterClaimedStores(WA_CLAIMED, "all");
    expect(rows[0]?.claims).toBeGreaterThanOrEqual(rows[1]?.claims ?? 0);
    expect(rows[0]?.name).toBe("FRED MEYER #459");
    const scratch = filterClaimedStores(WA_CLAIMED, "Scratch");
    expect(scratch.every((row) => (row.games.Scratch ?? 0) >= 1 || row.claims >= 1)).toBe(
      true,
    );
  });
});

describe("claimed-prize stories", () => {
  it("picks three different statewide shops and does not treat dollars as luck", () => {
    const walk = pickClaimedWalk(WA_CLAIMED, "all");
    expect(walk.busy?.name).toBe("FRED MEYER #459");
    expect(walk.busy?.city).toBe("RENTON");
    expect(walk.busy?.claims).toBe(31);
    expect(walk.fat?.name).toBe("ARCO 7038");
    expect(walk.fat?.city).toBe("BELLINGHAM");
    expect(walk.fat?.claims).toBe(1);
    expect(walk.fat?.sum).toBe(8_200_000);
    expect(walk.quiet?.name).toBe("7-ELEVEN #22624D");
    expect(walk.quiet?.city).toBe("VANCOUVER");
    expect(walk.quietGapDays).toBe(363);
    expect(new Set([walk.busy?.name, walk.fat?.name, walk.quiet?.name]).size).toBe(3);
    expect(walk.fat?.claims).toBeLessThan(walk.busy?.claims ?? 0);
    expect(walk.fat?.sum).toBeGreaterThan(walk.busy?.sum ?? 0);
  });

  it("skips a store with no lastDate for the quiet list", () => {
    const rows = filterClaimedStores(WA_CLAIMED, "all").slice(0, 4);
    const missing = { ...rows[0], lastDate: "", name: "NO DATE MART" };
    const withDate = { ...rows[1], lastDate: "2025-09-01", name: "HAS DATE MART" };
    const picked = pickQuietList([missing, withDate], "2026-08-19");
    expect(picked?.name).toBe("HAS DATE MART");
    expect(listedGapDays("2026-08-19", "2025-08-21")).toBe(363);
    expect(listedGapDays("2026-08-19", "")).toBeNull();
  });

  it("uses the game's last listed date when a chip is on", () => {
    const lotto = filterClaimedStores(WA_CLAIMED, "Lotto");
    expect(lotto[0]?.name).toBe("FRED MEYER #041");
    const walk = pickClaimedWalk(WA_CLAIMED, "Lotto");
    expect(walk.busy?.name).toBe("FRED MEYER #041");
    expect(walk.fat?.name).toBe("ARCO 7038");
    expect(walk.quiet?.lastDate).toBeTruthy();
    expect(walk.quiet?.name).not.toBe(walk.busy?.name);
    expect(walk.quiet?.name).not.toBe(walk.fat?.name);
  });

  it("sorts cities by listed claims and states the long tail", () => {
    const rows = filterClaimedStores(WA_CLAIMED, "all");
    const cities = claimedCities(rows);
    expect(cities[0]?.city).toBe("SEATTLE");
    expect(cities[0]?.claims).toBe(416);
    const tail = claimedLongTail(rows);
    expect(tail.storeCount).toBe(2158);
    expect(tail.onceCount).toBe(918);
    expect(tail.top10Claims).toBe(226);
    expect(tail.top10Share).toBeGreaterThan(0.03);
    expect(tail.top10Share).toBeLessThan(0.05);
    expect(pickBusyCounter(rows)?.name).toBe("FRED MEYER #459");
    expect(pickFatTicket(rows, [rows[0]])?.name).toBe("ARCO 7038");
  });
});

describe("claimed-prizes page contract", () => {
  it("leads with same-odds, then the question", () => {
    const lead = claimedPageLead();
    expect(lead).toBe(`${CLAIMED_SAME_ODDS} ${CLAIMED_QUESTION}`);
    expect(copyHasBannedPhrase(lead)).toBeNull();
    expect(copyHasBannedPhrase(claimedTooltip(WA_CLAIMED.stores[0]))).toBeNull();
    expect(copyHasBannedPhrase(CLAIMED_WALK_LINE)).toBeNull();
    expect(copyHasBannedPhrase(BUSY_STORY.notLine)).toBeNull();
    expect(copyHasBannedPhrase(FAT_STORY.notLine)).toBeNull();
    expect(copyHasBannedPhrase(QUIET_STORY.notLine)).toBeNull();
  });

  it("keeps the walk fun and parks Lab in the footer", () => {
    expect(page).toMatch(
      /<p class="hit-lead">\s*Every licensed retailer has the same chance of selling a jackpot ticket\./,
    );
    expect(page).toContain(CLAIMED_SAME_ODDS);
    expect(page).toContain(CLAIMED_QUESTION);
    expect(page).toContain(CLAIMED_WALK_LINE);
    expect(page).toContain(BUSY_STORY.name);
    expect(page).toContain(BUSY_STORY.notLine);
    expect(page).toContain(FAT_STORY.name);
    expect(page).toContain(FAT_STORY.notLine);
    expect(page).toContain(QUIET_STORY.name);
    expect(page).toContain(QUIET_STORY.notLine);
    expect(page).toContain(CLAIMED_SOURCE_URL);
    expect(page).toContain("/lottery-lab.html");
    expect(page).toContain("Luckiest Retailers");
    expect(page).not.toMatch(/not a forecast/i);
    expect(page).not.toContain("History, not a tip");
    expect(page).not.toContain("tonight");
    expect(page).not.toContain("Ladder #1");
    expect(page).not.toContain("Fable");
    expect(page).not.toContain("route-to-win");
    expect(page).not.toContain("high confidence");
    expect(page).not.toContain("\u2014");
    expect(copyHasBannedPhrase(page)).toBeNull();
    expect(page).toContain("JackpotDesk");
    expect(page).toMatch(/Keep it fun/);
    const chipOrder = [...page.matchAll(/data-game="([^"]+)"/g)].map((match) => match[1]);
    expect(chipOrder.slice(0, CLAIMED_CHIP_ORDER.length)).toEqual([...CLAIMED_CHIP_ORDER]);
    const labIdx = page.lastIndexOf("/lottery-lab.html");
    expect(labIdx).toBeGreaterThan(page.indexOf("luck-map"));
  });
});
