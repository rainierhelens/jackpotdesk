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
};

function parseWhites(row: NyRow): number[] | null {
  if (!row.winning_numbers) return null;
  const nums = row.winning_numbers
    .trim()
    .split(/\s+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 5) return null;
  const whites = nums.slice(0, 5);
  if (new Set(whites).size !== 5) return null;
  return whites.sort((a, b) => a - b);
}

export async function fetchRecentWinners(game: GameId): Promise<{
  keys: Set<string>;
  asOf: string | null;
}> {
  const response = await fetch(NY[game]);
  if (!response.ok) {
    throw new Error(`Could not load official draws (${response.status})`);
  }
  const rows = (await response.json()) as NyRow[];
  const keys = new Set<string>();
  let asOf: string | null = null;
  for (const row of rows) {
    const whites = parseWhites(row);
    if (!whites) continue;
    keys.add(comboKey(whites));
    if (!asOf && row.draw_date) asOf = row.draw_date.slice(0, 10);
  }
  return { keys, asOf };
}
