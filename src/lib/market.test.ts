import { describe, expect, it } from "vitest";
import {
  bakedMarket,
  parseMarketBook,
  quoteOf,
  quotesFromBook,
} from "./market";

describe("baked market book", () => {
  it("ships both national jackpots so tiles are never empty", () => {
    const book = parseMarketBook(bakedMarket);
    expect(book).not.toBeNull();
    const quotes = quotesFromBook(book!);
    expect(quotes.powerball.advertised).toBeGreaterThan(0);
    expect(quotes.megamillions.advertised).toBeGreaterThan(0);
    expect(quoteOf("powerball")?.cash).toBeGreaterThan(0);
  });

  it("rejects a Washington-shaped payload so a Worker miss cannot leak", () => {
    expect(
      parseMarketBook({
        asOf: "2026-08-19",
        draws: {},
        prizes: { hit5: { cashpot: 1 }, lotto: { advertised: 1, cash: 1 } },
      }),
    ).toBeNull();
  });
});
