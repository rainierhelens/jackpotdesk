import type { GameId, PrizeTier, Ticket } from "../types";
import { PRIZE_TABLE } from "./prizes";
import type { OfficialDraw } from "./winners";

const MATCH: Record<GameId, { whites: number; extra: boolean }[]> = {
  powerball: [
    { whites: 5, extra: true },
    { whites: 5, extra: false },
    { whites: 4, extra: true },
    { whites: 4, extra: false },
    { whites: 3, extra: true },
    { whites: 3, extra: false },
    { whites: 2, extra: true },
    { whites: 1, extra: true },
    { whites: 0, extra: true },
  ],
  megamillions: [
    { whites: 5, extra: true },
    { whites: 5, extra: false },
    { whites: 4, extra: true },
    { whites: 4, extra: false },
    { whites: 3, extra: true },
    { whites: 3, extra: false },
    { whites: 2, extra: true },
    { whites: 1, extra: true },
    { whites: 0, extra: true },
  ],
};

export type ScoredTicket = {
  ticket: Ticket;
  whiteHits: number;
  extraHit: boolean;
  hitWhites: Set<number>;
  tier: PrizeTier | null;
  prize: number;
};

export function lookupTier(
  game: GameId,
  whiteHits: number,
  extraHit: boolean,
): PrizeTier | null {
  const idx = MATCH[game].findIndex(
    (row) => row.whites === whiteHits && row.extra === extraHit,
  );
  if (idx < 0) return null;
  return PRIZE_TABLE[game][idx] ?? null;
}

export function scoreTicket(
  ticket: Ticket,
  draw: OfficialDraw,
  game: GameId,
  jackpotCash: number,
): ScoredTicket {
  const drawWhites = new Set(draw.whites);
  const hitWhites = new Set(ticket.whites.filter((n) => drawWhites.has(n)));
  const extraHit = ticket.extra === draw.extra;
  const tier = lookupTier(game, hitWhites.size, extraHit);
  let prize = 0;
  if (tier) prize = tier.isJackpot ? Math.max(0, jackpotCash) : tier.prize;
  return {
    ticket,
    whiteHits: hitWhites.size,
    extraHit,
    hitWhites,
    tier,
    prize,
  };
}

export function scorePool(
  tickets: Ticket[],
  draw: OfficialDraw,
  game: GameId,
  jackpotCash: number,
): ScoredTicket[] {
  return tickets.map((ticket) => scoreTicket(ticket, draw, game, jackpotCash));
}
