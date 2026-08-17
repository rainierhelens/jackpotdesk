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
export type RangeId = "2y" | "5y" | "all";
export type GameFilter = GameId | "both";

export type StateHeat = {
  state: string;
  tickets: number;
  dollars: number;
  lastDate: string | null;
};

export const JACKPOT_AS_OF = book.asOf;

export const JACKPOT_WINS = book.wins as JackpotWin[];

export function ticketShare(win: JackpotWin): number {
  return win.advertised / Math.max(1, win.shares);
}

export function cutoffIso(range: RangeId, asOf = JACKPOT_AS_OF): string | null {
  if (range === "all") return null;
  const years = range === "2y" ? 2 : 5;
  const d = new Date(`${asOf}T00:00:00`);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export function filterWins(
  wins: JackpotWin[],
  game: GameFilter,
  range: RangeId,
): JackpotWin[] {
  const cut = cutoffIso(range);
  return wins.filter((w) => {
    if (game !== "both" && w.game !== game) return false;
    if (cut && w.date < cut) return false;
    return true;
  });
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
