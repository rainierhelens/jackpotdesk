import type { GameId } from "../types";
import { formatCompact } from "./ev";

export type MarketQuote = {
  advertised: number;
  cash: number;
  nextDraw: string | null;
  source: string;
};

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

function isoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
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

export async function fetchMarket(game: GameId): Promise<MarketQuote> {
  const id = CA[game];
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
    source: "California Lottery (national jackpot)",
  };
}
