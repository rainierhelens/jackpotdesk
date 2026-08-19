import { useEffect, useState } from "react";
import {
  bakedMarket,
  fetchLiveMarketBook,
  quotesFromBook,
  type MarketQuote,
} from "./market";
import type { GameId } from "../types";

export const NATIONAL_GAMES: GameId[] = ["powerball", "megamillions"];

export const QUOTE_POLL_MS = 5 * 60_000;

/**
 * Module-level cache shared by every subscriber (ticker, picker).
 * Seeded from the last site build so national tiles never sit on ··.
 */
let cache = quotesFromBook(bakedMarket);
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      cache = quotesFromBook(await fetchLiveMarketBook());
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
