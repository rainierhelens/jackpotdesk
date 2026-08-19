import { MARKET_QUOTES_URL } from "../config";
import bakedFile from "../data/marketQuotes.json";
import type { GameId } from "../types";
import { formatCompact } from "./ev";

export type MarketQuote = {
  advertised: number;
  cash: number;
  nextDraw: string | null;
  source: string;
};

export type MarketGameRow = {
  advertised: number;
  cash: number;
  nextDraw: string | null;
};

export type MarketBook = {
  asOf: string;
  fetchedAt?: string;
  source: string;
  games: Record<"powerball" | "megamillions", MarketGameRow>;
};

const NATIONAL = ["powerball", "megamillions"] as const;

const CA = {
  powerball: 12,
  megamillions: 15,
} as const;

type CaNextDraw = {
  JackpotAmount?: number;
  EstimatedCashValue?: number;
  DrawDate?: string;
};

type CaPayload = {
  Name?: string;
  NextDraw?: CaNextDraw | null;
};

const BAKED_SOURCE = "Last site build · California Lottery jackpot";

export const bakedMarket = bakedFile as MarketBook;

function isoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function parseMarketBook(raw: unknown): MarketBook | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as MarketBook;
  if (!data.games || typeof data.asOf !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) return null;
  for (const id of NATIONAL) {
    const row = data.games[id];
    if (!row || typeof row.advertised !== "number" || row.advertised <= 0) {
      return null;
    }
    if (typeof row.cash !== "number" || row.cash <= 0) return null;
  }
  return data;
}

export function quoteOf(
  game: GameId,
  book: MarketBook = bakedMarket,
): MarketQuote | null {
  if (game !== "powerball" && game !== "megamillions") return null;
  const row = book.games[game];
  if (!row) return null;
  return {
    advertised: row.advertised,
    cash: row.cash,
    nextDraw: row.nextDraw ?? null,
    source: book.source,
  };
}

export function quotesFromBook(
  book: MarketBook,
): Record<(typeof NATIONAL)[number], MarketQuote> {
  return {
    powerball: quoteOf("powerball", book)!,
    megamillions: quoteOf("megamillions", book)!,
  };
}

/** Rough tickets-sold sketch from advertised size. Not an official figure. */
export function estimateTicketsSold(advertised: number, ticketCost: number): number {
  const base = 8_000_000;
  const extra = advertised / Math.max(2, ticketCost) / 10;
  const n = base + extra;
  if (n >= 1e8) return Math.round(n / 1e7) * 1e7;
  return Math.round(n / 1e6) * 1e6;
}

export function amountField(n: number): string {
  return formatCompact(n);
}

async function fetchCaQuote(game: GameId): Promise<MarketGameRow> {
  const id = CA[game as keyof typeof CA];
  if (!id) throw new Error("Jackpot feed is national only");
  const url = `https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/${id}/1/1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Jackpot feed HTTP ${response.status}`);
  }
  const data = (await response.json()) as CaPayload;
  const next = data.NextDraw;
  const advertised = Number(next?.JackpotAmount);
  const cash = Number(next?.EstimatedCashValue);
  if (!Number.isFinite(advertised) || advertised <= 0) {
    throw new Error("Jackpot feed had no advertised amount");
  }
  if (!Number.isFinite(cash) || cash <= 0) {
    throw new Error("Jackpot feed had no cash value");
  }
  return {
    advertised,
    cash,
    nextDraw: isoDate(next?.DrawDate),
  };
}

function asBaked(): MarketBook {
  return { ...bakedMarket, source: BAKED_SOURCE };
}

/**
 * Worker first (browser-safe), then California directly (Node / digest).
 * Last site build if both fail. The browser cannot call calottery.com (CORS).
 */
export async function fetchLiveMarketBook(): Promise<MarketBook> {
  try {
    const response = await fetch(MARKET_QUOTES_URL, {
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) {
      const parsed = parseMarketBook(await response.json());
      if (parsed) return parsed;
    }
  } catch {
    // Worker cold or missing /market. Try California next.
  }
  try {
    const [powerball, megamillions] = await Promise.all([
      fetchCaQuote("powerball"),
      fetchCaQuote("megamillions"),
    ]);
    const nextDates = [powerball.nextDraw, megamillions.nextDraw]
      .filter((d): d is string => Boolean(d))
      .sort();
    return {
      asOf: nextDates[0] ?? bakedMarket.asOf,
      fetchedAt: new Date().toISOString(),
      source: "California Lottery (national jackpot)",
      games: { powerball, megamillions },
    };
  } catch {
    return asBaked();
  }
}

export async function fetchMarket(game: GameId): Promise<MarketQuote> {
  const quote = quoteOf(game, await fetchLiveMarketBook());
  if (!quote) throw new Error("Jackpot feed had no advertised amount");
  return quote;
}
