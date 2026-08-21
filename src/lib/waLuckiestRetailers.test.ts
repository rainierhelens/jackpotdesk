import { describe, expect, it } from "vitest";
import book from "../data/waLuckiestRetailers.json";
import {
  HIT_ENTERTAIN,
  HIT_FIT_LINE,
  HIT_LOCATION_LINE,
  HIT_SAME_ODDS,
  WA_LUCKIEST,
  WA_LUCKIEST_REGIONS,
  copyHasBannedPhrase,
  filterLuckiestStores,
  isOfficialSource,
  pageLead,
  parseWaLuckiestBook,
  regionHeat,
  sortLuckiestStores,
  storeTooltip,
  yearsInBook,
} from "./waLuckiestRetailers";

describe("waLuckiestRetailers book", () => {
  it("parses official top-10 rows with source URLs and no guessed pins", () => {
    const parsed = parseWaLuckiestBook(book);
    expect(parsed.stores).toHaveLength(210);
    expect(yearsInBook(parsed)).toEqual([2025, 2024, 2023]);
    expect(WA_LUCKIEST_REGIONS).toHaveLength(7);
    expect(parsed.regions).toHaveLength(21);
    expect(parsed.coverage).toMatch(/top-10/);
    expect(parsed.coverage).toMatch(/not sales volume/i);
    for (const store of parsed.stores) {
      expect(isOfficialSource(store.sourceUrl)).toBe(true);
      expect(store).not.toHaveProperty("lat");
      expect(store).not.toHaveProperty("lng");
    }
  });

  it("keeps 2025 published South and North Puget Sound top-10 totals", () => {
    const heat = regionHeat(WA_LUCKIEST, 2025);
    expect(heat.find((r) => r.region === "South Puget Sound")?.top10Wins).toBe(
      170,
    );
    expect(heat.find((r) => r.region === "North Puget Sound")?.top10Wins).toBe(
      96,
    );
  });

  it("sorts stores by $1,000+ sold-winner count", () => {
    const rows = filterLuckiestStores(WA_LUCKIEST, 2025, "all");
    expect(rows[0]?.wins).toBe(20);
    expect(["Hilltop Red Apple Market", "All Star Grocery"]).toContain(
      rows[0]?.name,
    );
    const resorted = sortLuckiestStores([...rows].reverse());
    expect(resorted.map((r) => r.wins)).toEqual(rows.map((r) => r.wins));
  });
});

describe("luckiest retailers copy", () => {
  it("labels the layer as a fit to the published year", () => {
    const lead = pageLead();
    expect(lead.startsWith(HIT_SAME_ODDS)).toBe(true);
    expect(lead).toContain(HIT_LOCATION_LINE);
    expect(lead).toContain(HIT_FIT_LINE);
    expect(lead).toContain(HIT_ENTERTAIN);
    expect(copyHasBannedPhrase(lead)).toBeNull();
    expect(copyHasBannedPhrase(storeTooltip(WA_LUCKIEST.stores[0]))).toBeNull();
  });
});
