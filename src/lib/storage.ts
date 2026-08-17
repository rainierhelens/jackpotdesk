import type { GameId, Pool } from "../types";

const KEY = "jackpotdesk.v1";

export const emptyPool = (game: GameId): Pool => ({
  name: "Friday pool",
  game,
  members: [],
  tickets: [],
});

export function loadPool(): Pool | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pool;
    if (!parsed || !Array.isArray(parsed.members) || !Array.isArray(parsed.tickets)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePool(pool: Pool): void {
  localStorage.setItem(KEY, JSON.stringify(pool));
}
