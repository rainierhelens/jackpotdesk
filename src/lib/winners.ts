import type { GameId } from "../types";
import { comboKey } from "./picks";

const NY = {
  powerball:
    "https://data.ny.gov/resource/d6yy-54nr.json?$limit=40&$order=draw_date%20DESC",
  megamillions:
    "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=40&$order=draw_date%20DESC",
};

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

function parseNums(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function parseRow(game: GameId, row: NyRow): OfficialDraw | null {
  const nums = parseNums(row.winning_numbers);
  if (nums.length < 5) return null;
  const whites = nums.slice(0, 5);
  if (new Set(whites).size !== 5) return null;
  let extra: number;
  if (game === "megamillions") {
    extra = Number(row.mega_ball);
  } else {
    extra = nums[5];
  }
  if (!Number.isFinite(extra) || extra < 1) return null;
  const date = row.draw_date ? row.draw_date.slice(0, 10) : "";
  if (!date) return null;
  return { date, whites: whites.sort((a, b) => a - b), extra };
}

export async function fetchOfficialDraws(game: GameId): Promise<{
  keys: Set<string>;
  asOf: string | null;
  latest: OfficialDraw | null;
}> {
  const response = await fetch(NY[game]);
  if (!response.ok) {
    throw new Error(`Could not load official draws (${response.status})`);
  }
  const rows = (await response.json()) as NyRow[];
  const keys = new Set<string>();
  let latest: OfficialDraw | null = null;
  for (const row of rows) {
    const draw = parseRow(game, row);
    if (!draw) continue;
    keys.add(comboKey(draw.whites));
    if (!latest) latest = draw;
  }
  return { keys, asOf: latest?.date ?? null, latest };
}
