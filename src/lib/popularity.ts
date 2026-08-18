/**
 * Number-popularity model fit from California per-tier winner counts
 * (scripts/fit-popularity.mjs). Weight 1 = picked at the random-play rate;
 * 1.2 = picked 20% more often than random. A board's co-winner index is the
 * product of its numbers' weights, normalized so the average random board
 * reads 1.00×. None of this changes hit odds — only expected prize splitting.
 */
import fitted from "../data/popularity.json";
import { GAMES } from "./prizes";
import type { GameId } from "../types";

export type PopularityModel = {
  white: number[];
  special: number[];
  draws: number;
  from: string;
  to: string;
};

export type CrowdReading = {
  /** Expected co-winner multiplier vs the average random board (1 = average). */
  index: number;
  /** Share of random boards that are MORE crowded than this one (0..100). */
  beats: number;
};

type FittedGame = {
  draws: number;
  from: string;
  to: string;
  whiteMax: number;
  specialMax: number;
  white: number[];
  special: number[];
};

const models = new Map<GameId, PopularityModel | null>();

export function popularityModel(game: GameId): PopularityModel | null {
  if (models.has(game)) return models.get(game) ?? null;
  const raw = (fitted.games as Partial<Record<GameId, FittedGame>>)[game];
  const spec = GAMES[game];
  const ok =
    raw &&
    raw.white?.length === spec.whiteMax &&
    raw.special?.length === spec.extraMax;
  const model = ok
    ? {
        white: raw.white,
        special: raw.special,
        draws: raw.draws,
        from: raw.from,
        to: raw.to,
      }
    : null;
  models.set(game, model);
  return model;
}

function rawScore(model: PopularityModel, whites: number[], extra: number) {
  let score = model.special[extra - 1] ?? 1;
  for (const n of whites) score *= model.white[n - 1] ?? 1;
  return score;
}

/** Deterministic PRNG so percentiles are stable between renders and tests. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Baseline = { sorted: Float64Array; mean: number };
const baselines = new Map<GameId, Baseline>();

/** Score distribution of uniform quick-pick boards, sampled once per game. */
function baseline(game: GameId, model: PopularityModel): Baseline {
  const cached = baselines.get(game);
  if (cached) return cached;
  const spec = GAMES[game];
  const rand = mulberry32(0xc0ffee);
  const samples = 20_000;
  const scores = new Float64Array(samples);
  let mean = 0;
  const picked: number[] = [];
  for (let i = 0; i < samples; i++) {
    picked.length = 0;
    while (picked.length < 5) {
      const n = 1 + Math.floor(rand() * spec.whiteMax);
      if (!picked.includes(n)) picked.push(n);
    }
    const extra = 1 + Math.floor(rand() * spec.extraMax);
    const s = rawScore(model, picked, extra);
    scores[i] = s;
    mean += s;
  }
  mean /= samples;
  const result = { sorted: scores.sort(), mean };
  baselines.set(game, result);
  return result;
}

export function crowdReading(
  game: GameId,
  whites: number[],
  extra: number,
): CrowdReading | null {
  const model = popularityModel(game);
  if (!model) return null;
  const { sorted, mean } = baseline(game, model);
  const score = rawScore(model, whites, extra);
  // binary search: how many random boards score at or below this board
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= score) lo = mid + 1;
    else hi = mid;
  }
  return {
    index: score / mean,
    beats: Math.round(((sorted.length - lo) / sorted.length) * 100),
  };
}
