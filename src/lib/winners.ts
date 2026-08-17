import type { GameId } from "../types";
import { comboKey } from "./picks";
import { GAMES } from "./prizes";

const NY_BASE: Record<GameId, string> = {
  powerball: "https://data.ny.gov/resource/d6yy-54nr.json",
  megamillions: "https://data.ny.gov/resource/5xaw-6ayf.json",
};

/** First drawing of the current white-ball matrix. Older formats are dropped. */
export const FORMAT_START: Record<GameId, string> = {
  powerball: "2015-10-07",
  megamillions: "2017-10-31",
};

/** Mega Ball dropped from 1–25 to 1–24. White matrix did not change. */
export const MEGA_BALL_24_START = "2025-04-08";

export const RECENT_WINNER_LIMIT = 40;
const FETCH_LIMIT = 5000;

type NyRow = {
  draw_date?: string;
  winning_numbers?: string;
  mega_ball?: string;
  multiplier?: string;
};

export type OfficialDraw = {
  date: string;
  whites: number[];
  extra: number;
};

function nyUrl(game: GameId): string {
  const start = FORMAT_START[game];
  const where = encodeURIComponent(`draw_date >= '${start}'`);
  return `${NY_BASE[game]}?$limit=${FETCH_LIMIT}&$order=draw_date%20DESC&$where=${where}`;
}

function parseNums(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseRow(game: GameId, row: NyRow): OfficialDraw | null {
  const spec = GAMES[game];
  const nums = parseNums(row.winning_numbers);
  if (nums.length < 5) return null;
  const whites = nums.slice(0, 5);
  if (new Set(whites).size !== 5) return null;
  if (whites.some((n) => n < 1 || n > spec.whiteMax)) return null;
  let extra: number;
  if (game === "megamillions") {
    extra = Number(row.mega_ball);
  } else {
    extra = nums[5];
  }
  if (!Number.isFinite(extra) || extra < 1) return null;
  const date = row.draw_date ? row.draw_date.slice(0, 10) : "";
  if (!date || date < FORMAT_START[game]) return null;
  if (game === "powerball" && extra > spec.extraMax) return null;
  if (game === "megamillions") {
    const extraCap = date >= MEGA_BALL_24_START ? spec.extraMax : 25;
    if (extra > extraCap) return null;
  }
  return { date, whites: whites.sort((a, b) => a - b), extra };
}

export async function fetchOfficialDraws(game: GameId): Promise<{
  keys: Set<string>;
  asOf: string | null;
  latest: OfficialDraw | null;
  draws: OfficialDraw[];
}> {
  const response = await fetch(nyUrl(game));
  if (!response.ok) {
    throw new Error(`Could not load official draws (${response.status})`);
  }
  const rows = (await response.json()) as NyRow[];
  const draws: OfficialDraw[] = [];
  for (const row of rows) {
    const draw = parseRow(game, row);
    if (!draw) continue;
    draws.push(draw);
  }
  const latest = draws[0] ?? null;
  const keys = new Set(
    draws.slice(0, RECENT_WINNER_LIMIT).map((d) => comboKey(d.whites)),
  );
  return { keys, asOf: latest?.date ?? null, latest, draws };
}
