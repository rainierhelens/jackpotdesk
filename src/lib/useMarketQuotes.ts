import { useEffect, useState } from "react";
import { fetchMarket, type MarketQuote } from "./market";
import type { GameId } from "../types";

export const NATIONAL_GAMES: GameId[] = ["powerball", "megamillions"];

export const QUOTE_POLL_MS = 5 * 60_000;

/**
 * Module-level cache shared by every subscriber (ticker, picker) so the
 * California Lottery feed is hit once per poll window, not once per component.
 */
const cache: Partial<Record<GameId, MarketQuote>> = {};
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      await Promise.all(
        NATIONAL_GAMES.map(async (id) => {
          try {
            cache[id] = await fetchMarket(id);
          } catch {
            // Keep the previous quote; views surface feed errors themselves.
          }
        }),
      );
      fetchedAt = Date.now();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** National jackpot quotes, refreshed every five minutes while mounted. */
export function useMarketQuotes(): Partial<Record<GameId, MarketQuote>> {
  const [quotes, setQuotes] = useState<Partial<Record<GameId, MarketQuote>>>(
    () => ({ ...cache }),
  );

  useEffect(() => {
    let on = true;
    async function tick() {
      // A small buffer keeps several subscribers from re-fetching back to back.
      if (Date.now() - fetchedAt > QUOTE_POLL_MS - 15_000) await refresh();
      if (on) setQuotes({ ...cache });
    }
    void tick();
    const timer = window.setInterval(() => void tick(), QUOTE_POLL_MS);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, []);

  return quotes;
}
