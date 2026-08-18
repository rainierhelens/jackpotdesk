import { describe, expect, it } from "vitest";
import { computeEv, formatCompact, parseMoney, type EvInputs } from "./ev";

const BASE: EvInputs = {
  advertisedJackpot: 1_200_000_000,
  cashJackpot: 550_000_000,
  ticketsSold: 180_000_000,
  federalTax: 0.37,
  stateTax: 0.05,
  humanTicketShare: 0.2,
};

describe("parseMoney", () => {
  it("understands suffixes", () => {
    expect(parseMoney("1.2B")).toBe(1_200_000_000);
    expect(parseMoney("400M")).toBe(400_000_000);
    expect(parseMoney("500k")).toBe(500_000);
  });

  it("strips currency formatting", () => {
    expect(parseMoney("$1,200,000")).toBe(1_200_000);
  });
});

describe("formatCompact", () => {
  it("round-trips typical jackpot sizes", () => {
    expect(formatCompact(1_200_000_000)).toMatch(/^1\.20?\s?B$/i);
  });
});

describe("computeEv", () => {
  it("unique tickets always beat crowded tickets", () => {
    const result = computeEv("powerball", BASE);
    expect(result.unique.netEv).toBeGreaterThan(result.crowded.netEv);
  });

  it("more tickets sold lowers the unique EV", () => {
    const quiet = computeEv("powerball", { ...BASE, ticketsSold: 20_000_000 });
    const frenzy = computeEv("powerball", { ...BASE, ticketsSold: 400_000_000 });
    expect(frenzy.unique.netEv).toBeLessThan(quiet.unique.netEv);
  });

  it("expected co-winners grow with tickets sold", () => {
    const quiet = computeEv("powerball", { ...BASE, ticketsSold: 20_000_000 });
    const frenzy = computeEv("powerball", { ...BASE, ticketsSold: 400_000_000 });
    expect(frenzy.unique.lambda).toBeGreaterThan(quiet.unique.lambda);
    expect(frenzy.unique.shareFactor).toBeLessThan(quiet.unique.shareFactor);
  });

  it("taxes reduce the after-tax cash", () => {
    const result = computeEv("powerball", BASE);
    expect(result.afterTaxCash).toBeLessThan(BASE.cashJackpot);
    expect(result.afterTaxCash).toBeGreaterThan(0);
  });
});
