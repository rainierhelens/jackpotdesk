import type { GameId } from "../types";
import book from "../data/jackpotWins.json";

export type JackpotWin = {
  game: GameId;
  date: string;
  advertised: number;
  shares: number;
  state: string;
  city: string | null;
};

export type HeatMetric = "tickets" | "dollars";
export type GameFilter = GameId | "both";

export type StateHeat = {
  state: string;
  tickets: number;
  dollars: number;
  lastDate: string | null;
};

export type JackpotBook = {
  asOf: string;
  fetchedAt?: string;
  source?: string;
  note?: string;
  wins: JackpotWin[];
};

export const JACKPOT_AS_OF = book.asOf;

export const JACKPOT_WINS = book.wins as JackpotWin[];

export function parseJackpotBook(raw: unknown): JackpotBook | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as JackpotBook;
  if (!Array.isArray(data.wins) || data.wins.length < 40) return null;
  if (typeof data.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) {
    return null;
  }
  for (const row of data.wins) {
    if (!row || typeof row !== "object") return null;
    if (row.game !== "powerball" && row.game !== "megamillions") return null;
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      return null;
    }
    if (typeof row.advertised !== "number" || row.advertised < 1_000_000) {
      return null;
    }
    if (typeof row.shares !== "number" || row.shares < 1) return null;
    if (typeof row.state !== "string" || row.state.length !== 2) return null;
  }
  return data;
}

export function ticketShare(win: JackpotWin): number {
  return win.advertised / Math.max(1, win.shares);
}

export function dataYearSpan(
  wins: JackpotWin[] = JACKPOT_WINS,
  asOf = JACKPOT_AS_OF,
): number {
  let oldest = asOf;
  for (const w of wins) {
    if (w.date < oldest) oldest = w.date;
  }
  return Math.max(
    1,
    Number(asOf.slice(0, 4)) - Number(oldest.slice(0, 4)) + 1,
  );
}

export function oldestYearShown(
  yearsShown: number,
  asOf = JACKPOT_AS_OF,
  wins: JackpotWin[] = JACKPOT_WINS,
): number {
  const latest = Number(asOf.slice(0, 4));
  const n = Math.min(Math.max(1, yearsShown), dataYearSpan(wins, asOf));
  return latest - n + 1;
}

export function filterWins(
  wins: JackpotWin[],
  game: GameFilter,
  yearsShown: number,
  advertised?: { min: number; max: number },
  asOf = JACKPOT_AS_OF,
): JackpotWin[] {
  const oldest = oldestYearShown(yearsShown, asOf, wins);
  return wins.filter((w) => {
    if (game !== "both" && w.game !== game) return false;
    if (winYear(w.date) < oldest) return false;
    if (advertised) {
      if (w.advertised < advertised.min || w.advertised > advertised.max) {
        return false;
      }
    }
    return true;
  });
}

export function advertisedSpan(wins: JackpotWin[]): { min: number; max: number } {
  if (wins.length === 0) return { min: 0, max: 0 };
  let min = wins[0].advertised;
  let max = wins[0].advertised;
  for (const w of wins) {
    if (w.advertised < min) min = w.advertised;
    if (w.advertised > max) max = w.advertised;
  }
  return { min, max };
}

const JACKPOT_STEP = 5_000_000;

export function snapJackpot(n: number, dir: "down" | "up"): number {
  if (dir === "down") return Math.floor(n / JACKPOT_STEP) * JACKPOT_STEP;
  return Math.ceil(n / JACKPOT_STEP) * JACKPOT_STEP;
}

export function heatByState(wins: JackpotWin[]): Map<string, StateHeat> {
  const map = new Map<string, StateHeat>();
  for (const win of wins) {
    const cur = map.get(win.state) ?? {
      state: win.state,
      tickets: 0,
      dollars: 0,
      lastDate: null,
    };
    cur.tickets += 1;
    cur.dollars += ticketShare(win);
    if (!cur.lastDate || win.date > cur.lastDate) cur.lastDate = win.date;
    map.set(win.state, cur);
  }
  return map;
}

export function heatValue(row: StateHeat | undefined, metric: HeatMetric): number {
  if (!row) return 0;
  return metric === "tickets" ? row.tickets : row.dollars;
}

export function heatFill(t: number): string {
  if (t <= 0) return "#27272a";
  const x = Math.min(1, Math.max(0, t));
  const a = x < 0.55 ? [39, 39, 42] : [0, 199, 88];
  const b = x < 0.55 ? [0, 199, 88] : [241, 253, 14];
  const u = x < 0.55 ? x / 0.55 : (x - 0.55) / 0.45;
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return `rgb(${r},${g},${bl})`;
}

export function scaleT(value: number, max: number, metric: HeatMetric): number {
  if (max <= 0 || value <= 0) return 0;
  if (metric === "tickets") return value / max;
  return Math.log(1 + value) / Math.log(1 + max);
}

export function formatDrawDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function gameShort(game: GameId): string {
  return game === "powerball" ? "PB" : "MM";
}

export function winYear(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function yearTint(year: number): string {
  const hue = (Math.abs(year) * 47) % 360;
  return `hsl(${hue} 72% 58%)`;
}

export function yearsInWins(wins: JackpotWin[]): number[] {
  const set = new Set<number>();
  for (const w of wins) set.add(winYear(w.date));
  return [...set].sort((a, b) => a - b);
}

export function yearsByState(wins: JackpotWin[]): Map<string, number[]> {
  const map = new Map<string, Set<number>>();
  for (const w of wins) {
    const set = map.get(w.state) ?? new Set<number>();
    set.add(winYear(w.date));
    map.set(w.state, set);
  }
  const out = new Map<string, number[]>();
  for (const [state, set] of map) {
    out.set(state, [...set].sort((a, b) => a - b));
  }
  return out;
}
