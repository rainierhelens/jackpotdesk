import type { GameId } from "../types";
import { comboKey } from "./picks";
import { GAMES } from "./prizes";

const NY_BASE: Record<GameId, string> = {
  powerball: "https://data.ny.gov/resource/d6yy-54nr.json",
  megamillions: "https://data.ny.gov/resource/5xaw-6ayf.json",
};

/** Same California DrawGameApi ids as the national jackpot bake. */
export const CA_GAME_ID: Record<GameId, number> = {
  powerball: 12,
  megamillions: 15,
};

/** Washington game pages post last night's board before NY Open Data. */
export const WA_GAME_PAGE: Record<GameId, string> = {
  powerball: "https://walottery.com/JackpotGames/Powerball.aspx",
  megamillions: "https://walottery.com/JackpotGames/MegaMillions.aspx",
};

const WA_MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function ptIso(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return now.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

/** `WED/AUG 26` from walottery.com Latest Draw. Year is the current PT year. */
export function parseWaBoardDate(
  label: string | undefined,
  now = new Date(),
): string | null {
  if (!label) return null;
  const match = label
    .trim()
    .match(/^([A-Z]{3})\/([A-Z]{3})\s+(\d{1,2})(?:,\s*(\d{4}))?$/i);
  if (!match) return null;
  const month = WA_MONTHS[match[2].toUpperCase()];
  if (!month) return null;
  const day = Number(match[3]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  const today = ptIso(now);
  const year = match[4] ? Number(match[4]) : Number(today.slice(0, 4));
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!match[4] && iso > today) {
    return `${year - 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return iso;
}

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

type CaBall = {
  Number?: string | number;
  IsSpecial?: boolean;
};

type CaDraw = {
  DrawDate?: string;
  WinningNumbers?: Record<string, CaBall>;
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

function caLatestUrl(game: GameId): string {
  return `https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/${CA_GAME_ID[game]}/1/1`;
}

function parseNums(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Shared validator for NY rows and the California latest-draw fallback. */
export function officialDrawFrom(
  game: GameId,
  dateRaw: string | undefined,
  whitesRaw: number[],
  extraRaw: number,
): OfficialDraw | null {
  const spec = GAMES[game];
  const date = dateRaw ? dateRaw.slice(0, 10) : "";
  if (!date || date < FORMAT_START[game]) return null;
  const whites = whitesRaw
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 5)
    .sort((a, b) => a - b);
  if (whites.length !== 5) return null;
  if (new Set(whites).size !== 5) return null;
  if (whites.some((n) => n < 1 || n > spec.whiteMax)) return null;
  if (!Number.isFinite(extraRaw) || extraRaw < 1) return null;
  if (game === "powerball" && extraRaw > spec.extraMax) return null;
  if (game === "megamillions") {
    const extraCap = date >= MEGA_BALL_24_START ? spec.extraMax : 25;
    if (extraRaw > extraCap) return null;
  }
  return { date, whites, extra: extraRaw };
}

function parseRow(game: GameId, row: NyRow): OfficialDraw | null {
  const nums = parseNums(row.winning_numbers);
  if (nums.length < 5) return null;
  const extra = game === "megamillions" ? Number(row.mega_ball) : nums[5];
  return officialDrawFrom(game, row.draw_date, nums.slice(0, 5), extra);
}

export function parseCaLatestDraw(game: GameId, raw: unknown): OfficialDraw | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as { MostRecentDraw?: CaDraw };
  const draw = payload.MostRecentDraw;
  if (!draw) return null;
  const balls = Object.values(draw.WinningNumbers ?? {});
  const whites = balls
    .filter((ball) => !ball.IsSpecial)
    .map((ball) => Number(ball.Number));
  const special = balls.find((ball) => ball.IsSpecial);
  return officialDrawFrom(game, draw.DrawDate, whites, Number(special?.Number));
}

function parseWaBallList(game: GameId, html: string): number[] {
  const chunk =
    game === "powerball"
      ? html.match(/game-balls_powerball[\s\S]*?<ul>([\s\S]*?)<\/ul>/)?.[1]
      : html.match(/<div class="game-balls">\s*<ul>([\s\S]*?)<\/ul>/)?.[1];
  if (!chunk) return [];
  return [...chunk.matchAll(/<li[^>]*>(\d+)<\/li>/g)].map((row) => Number(row[1]));
}

/** Latest official board from a Washington game page. */
export function parseWaLatestDraw(
  game: GameId,
  html: string,
  now = new Date(),
): OfficialDraw | null {
  const label = html.match(/Latest Draw:\s*<strong>([^<]+)<\/strong>/i)?.[1];
  const date = parseWaBoardDate(label, now);
  const nums = parseWaBallList(game, html);
  if (!date || nums.length < 6) return null;
  return officialDrawFrom(game, date, nums.slice(0, 5), nums[5]);
}

/** Prepend a newer official board. Same date or older is ignored. */
export function withNewerOfficial(
  draws: OfficialDraw[],
  extra: OfficialDraw | null,
): OfficialDraw[] {
  if (!extra) return draws;
  const latest = draws[0];
  if (latest && extra.date <= latest.date) return draws;
  return [extra, ...draws.filter((draw) => draw.date !== extra.date)];
}

async function fetchCaLatest(game: GameId): Promise<OfficialDraw | null> {
  const response = await fetch(caLatestUrl(game), {
    headers: { "user-agent": "Mozilla/5.0 (jackpotdesk official bake)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  return parseCaLatestDraw(game, await response.json());
}

async function fetchWaLatest(game: GameId): Promise<OfficialDraw | null> {
  const response = await fetch(WA_GAME_PAGE[game], {
    headers: { "user-agent": "Mozilla/5.0 (jackpotdesk official bake)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  return parseWaLatestDraw(game, await response.text());
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
  let draws: OfficialDraw[] = [];
  for (const row of rows) {
    const draw = parseRow(game, row);
    if (!draw) continue;
    draws.push(draw);
  }
  // Browser cannot call calottery.com or walottery.com (CORS). Node recap /
  // digest can. California and Washington both post last night ahead of NY.
  if (typeof window === "undefined") {
    try {
      draws = withNewerOfficial(draws, await fetchCaLatest(game));
    } catch {
      // NY Open Data stands when California is down.
    }
    try {
      draws = withNewerOfficial(draws, await fetchWaLatest(game));
    } catch {
      // CA / NY stand when Washington is down.
    }
  }
  const latest = draws[0] ?? null;
  const keys = new Set(
    draws.slice(0, RECENT_WINNER_LIMIT).map((d) => comboKey(d.whites)),
  );
  return { keys, asOf: latest?.date ?? null, latest, draws };
}
