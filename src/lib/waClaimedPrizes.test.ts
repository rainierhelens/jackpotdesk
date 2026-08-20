import { describe, expect, it } from "vitest";
import book from "../data/waClaimedPrizesByStore.json";
import page from "../../public/washington/claimed-prizes-by-store/index.html?raw";
import {
  CLAIMED_ENTERTAIN,
  CLAIMED_FIT_LINE,
  CLAIMED_LOCATION_LINE,
  CLAIMED_SAME_ODDS,
  CLAIMED_SOURCE_URL,
  WA_CLAIMED,
  bookHasWinnerNames,
  claimedPageLead,
  claimedTooltip,
  copyHasBannedPhrase,
  filterClaimedStores,
  parseClaimedPrizeBook,
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

describe("claimed-prizes page contract", () => {
  it("leads with same-odds and points at the official search", () => {
    const lead = claimedPageLead();
    expect(lead.startsWith(CLAIMED_SAME_ODDS)).toBe(true);
    expect(lead).toContain(CLAIMED_LOCATION_LINE);
    expect(lead).toContain(CLAIMED_FIT_LINE);
    expect(lead).toContain(CLAIMED_ENTERTAIN);
    expect(copyHasBannedPhrase(lead)).toBeNull();
    expect(copyHasBannedPhrase(claimedTooltip(WA_CLAIMED.stores[0]))).toBeNull();
  });

  it("ships a public page that is history, not a forecast", () => {
    expect(page).toContain(CLAIMED_SAME_ODDS);
    expect(page).toContain(CLAIMED_SOURCE_URL);
    expect(page).toContain("/lottery-lab.html");
    expect(page).toContain("/?desk=washington");
    expect(page).toContain("Luckiest Retailers");
    expect(page).not.toContain("tonight");
    expect(page).not.toContain("Ladder #1");
    expect(page).not.toContain("Fable");
    expect(page).not.toContain("\u2014");
    expect(copyHasBannedPhrase(page)).toBeNull();
    expect(page).toContain("JackpotDesk");
    expect(page).toMatch(/Keep it fun/);
  });
});
