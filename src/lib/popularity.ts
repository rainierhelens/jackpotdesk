/**
 * Number-popularity model fit from California per-tier winner counts
 * (scripts/fit-popularity.mjs). Weight 1 = picked at the random-play rate;
 * 1.2 = picked 20% more often than random. A board's co-winner index is the
 * product of its numbers' weights, normalized so the average random board
 * reads 1.00×. None of this changes hit odds — only expected prize splitting.
 */
import fitted from "../data/popularity.json";
import { comboKey, newId, rejectReasons, sampleCombo } from "./picks";
import { GAMES } from "./prizes";
import { WA_GAMES, type WaGameSpec } from "./waGames";
import { waRejectReason, type WaPlay } from "./waPicks";
import type { Filters, GameId, Ticket, WaFilters, WaGameId } from "../types";

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
  poolMax: number;
  pick: number;
  specialMax: number | null;
  white: number[];
  special: number[] | null;
};

const fittedGames = fitted.games as Partial<
  Record<GameId | WaGameId, FittedGame>
>;

const models = new Map<GameId, PopularityModel | null>();

export function popularityModel(game: GameId): PopularityModel | null {
  if (models.has(game)) return models.get(game) ?? null;
  const raw = fittedGames[game];
  const spec = GAMES[game];
  const ok =
    raw &&
    raw.white?.length === spec.whiteMax &&
    raw.special?.length === spec.extraMax;
  const model = ok
    ? {
        white: raw.white,
        special: raw.special as number[],
        draws: raw.draws,
        from: raw.from,
        to: raw.to,
      }
    : null;
  models.set(game, model);
  return model;
}

export type WaPopularityModel = {
  white: number[];
  pick: number;
  draws: number;
  from: string;
  to: string;
};

const waModels = new Map<WaGameId, WaPopularityModel | null>();

export function waPopularityModel(game: WaGameId): WaPopularityModel | null {
  if (waModels.has(game)) return waModels.get(game) ?? null;
  const raw = fittedGames[game];
  const spec = WA_GAMES[game];
  const ok = raw && !raw.special && raw.white?.length === spec.whiteMax;
  const model = ok
    ? {
        white: raw.white,
        pick: raw.pick,
        draws: raw.draws,
        from: raw.from,
        to: raw.to,
      }
    : null;
  waModels.set(game, model);
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
const baselines = new Map<string, Baseline>();

/** Score distribution of uniform quick-pick boards, sampled once per game. */
function baseline(
  key: string,
  poolMax: number,
  pick: number,
  score: (picked: number[]) => number,
): Baseline {
  const cached = baselines.get(key);
  if (cached) return cached;
  const rand = mulberry32(0xc0ffee);
  const samples = 20_000;
  const scores = new Float64Array(samples);
  let mean = 0;
  const picked: number[] = [];
  for (let i = 0; i < samples; i++) {
    picked.length = 0;
    while (picked.length < pick) {
      const n = 1 + Math.floor(rand() * poolMax);
      if (!picked.includes(n)) picked.push(n);
    }
    const s = score(picked);
    scores[i] = s;
    mean += s;
  }
  mean /= samples;
  const result = { sorted: scores.sort(), mean };
  baselines.set(key, result);
  return result;
}

function readingFrom(base: Baseline, score: number): CrowdReading {
  const { sorted, mean } = base;
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

export function crowdReading(
  game: GameId,
  whites: number[],
  extra: number,
): CrowdReading | null {
  const model = popularityModel(game);
  if (!model) return null;
  const spec = GAMES[game];
  const specialRand = mulberry32(0xbead5);
  const base = baseline(`national:${game}`, spec.whiteMax, 5, (picked) =>
    rawScore(model, picked, 1 + Math.floor(specialRand() * spec.extraMax)),
  );
  return readingFrom(base, rawScore(model, whites, extra));
}

function waScore(model: WaPopularityModel, numbers: number[]): number {
  let score = 1;
  for (const n of numbers) score *= model.white[n - 1] ?? 1;
  return score;
}

export function waCrowdReading(
  game: WaGameId,
  numbers: number[],
): CrowdReading | null {
  const model = waPopularityModel(game);
  if (!model || numbers.length !== model.pick) return null;
  const spec = WA_GAMES[game];
  const base = baseline(`wa:${game}`, spec.whiteMax, model.pick, (picked) =>
    waScore(model, picked),
  );
  return readingFrom(base, waScore(model, numbers));
}

/*
 * Desk pick: the "ideal slip" the measured data can honestly define.
 * Every board has identical hit odds, so the only thing worth optimizing
 * is expected co-winners if the board hits. We sample a large candidate
 * set that passes the active fades, score each with the fitted weights,
 * and keep boards from the least-crowded end. A small random window keeps
 * two desk picks from ever being the same slip — if everyone got the one
 * global optimum, that board would become the most crowded ticket in play.
 */

const CANDIDATE_TARGET = 5_000;
const CANDIDATE_ATTEMPTS = 24_000;

export type RankedCandidate = { numbers: number[]; score: number };

function sampleCandidates(
  poolMax: number,
  pick: number,
  score: (numbers: number[]) => number,
  reject: (numbers: number[]) => boolean,
  exclude: Set<string>,
): { candidates: RankedCandidate[]; scanned: number } {
  const seen = new Set<string>();
  const candidates: RankedCandidate[] = [];
  let scanned = 0;
  while (candidates.length < CANDIDATE_TARGET && scanned < CANDIDATE_ATTEMPTS) {
    scanned += 1;
    const numbers = sampleCombo(poolMax, pick);
    const key = comboKey(numbers);
    if (seen.has(key) || exclude.has(key)) continue;
    seen.add(key);
    if (reject(numbers)) continue;
    candidates.push({ numbers, score: score(numbers) });
  }
  candidates.sort((a, b) => a.score - b.score);
  return { candidates, scanned };
}

/**
 * Pull `count` boards from the front of a sorted ranking. Each pick comes
 * uniformly from the first eligible `window` candidates, so results stay
 * near the top of the ranking without being deterministic. Shared by Desk
 * pick (ascending crowd score) and Pattern lab (descending pattern score).
 */
export function drawFromRanking(
  candidates: RankedCandidate[],
  count: number,
  eligible: (numbers: number[]) => boolean,
  onTake: (numbers: number[]) => void,
): number[][] {
  const window = candidates.length >= 400 ? 10 : 3;
  const taken: number[][] = [];
  const remaining = [...candidates];
  while (taken.length < count && remaining.length > 0) {
    const pool: number[] = [];
    for (let i = 0; i < remaining.length && pool.length < window; i++) {
      if (eligible(remaining[i].numbers)) pool.push(i);
    }
    if (pool.length === 0) break;
    const at = pool[Math.floor(Math.random() * pool.length)];
    const [chosen] = remaining.splice(at, 1);
    onTake(chosen.numbers);
    taken.push(chosen.numbers);
  }
  return taken;
}

/** Random special ball from the least-picked third of the field. */
function lonelySpecial(special: number[]): number {
  const ranked = special
    .map((w, i) => ({ n: i + 1, w }))
    .sort((a, b) => a.w - b.w);
  const cut = Math.max(1, Math.floor(ranked.length / 3));
  return ranked[Math.floor(Math.random() * cut)].n;
}

export type DeskPickResult<T> = {
  tickets: T[];
  /** Candidate boards scanned to build the ranking. */
  scanned: number;
};

export function deskPickTickets(
  game: GameId,
  count: number,
  filters: Filters,
  past: Set<string>,
  exclude: Set<string> = new Set(),
  avoid: Set<number> = new Set(),
): DeskPickResult<Ticket> | null {
  const model = popularityModel(game);
  if (!model) return null;
  const spec = GAMES[game];
  const { candidates, scanned } = sampleCandidates(
    spec.whiteMax,
    5,
    (whites) => {
      let s = 1;
      for (const n of whites) s *= model.white[n - 1] ?? 1;
      return s;
    },
    (whites) => rejectReasons(whites, filters, past, avoid).length > 0,
    exclude,
  );

  const usedWhites = new Set<number>();
  const take = (whites: number[]) => {
    if (filters.uniqueSlip) for (const n of whites) usedWhites.add(n);
  };
  const eligible = (whites: number[]) =>
    !filters.uniqueSlip || !whites.some((n) => usedWhites.has(n));

  const boards = drawFromRanking(candidates, count, eligible, take);
  // If slip-uniqueness ran the ranking dry, top up without that constraint.
  if (boards.length < count) {
    const have = new Set(boards.map((b) => comboKey(b)));
    boards.push(
      ...drawFromRanking(
        candidates.filter((c) => !have.has(comboKey(c.numbers))),
        count - boards.length,
        () => true,
        () => {},
      ),
    );
  }

  return {
    tickets: boards.map((whites) => ({
      id: newId(),
      whites,
      extra: lonelySpecial(model.special),
    })),
    scanned,
  };
}

export function deskPickWaPlays(
  spec: WaGameSpec,
  whiteCount: number,
  count: number,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number> = new Set(),
): DeskPickResult<WaPlay> | null {
  const model = waPopularityModel(spec.id);
  if (!model) return null;
  const { candidates, scanned } = sampleCandidates(
    spec.whiteMax,
    whiteCount,
    (numbers) => waScore(model, numbers),
    (numbers) => waRejectReason(numbers, spec, filters, past, avoid) !== null,
    new Set(),
  );

  const pairSize = spec.pairSize ?? 1;
  const want =
    pairSize > 1 ? Math.max(pairSize, count + (count % pairSize)) : count;
  const usedWhites = new Set<number>();
  const pairLock = new Set<number>();
  let inPair = 0;
  // Slip uniqueness can exhaust small pools; retry without it if we fall short.
  let slipUnique = filters.uniqueSlip;
  const eligible = (numbers: number[]) => {
    if (numbers.some((n) => pairLock.has(n))) return false;
    return !slipUnique || !numbers.some((n) => usedWhites.has(n));
  };
  const take = (numbers: number[]) => {
    if (slipUnique) for (const n of numbers) usedWhites.add(n);
    if (pairSize > 1) {
      inPair = (inPair + 1) % pairSize;
      if (inPair === 0) pairLock.clear();
      else for (const n of numbers) pairLock.add(n);
    }
  };

  let boards = drawFromRanking(candidates, want, eligible, take);
  if (boards.length < want && slipUnique) {
    slipUnique = false;
    usedWhites.clear();
    pairLock.clear();
    inPair = 0;
    boards = drawFromRanking(candidates, want, eligible, take);
  }
  if (pairSize > 1) boards = boards.slice(0, boards.length - (boards.length % pairSize));

  return {
    tickets: boards.map((numbers) => ({ id: newId(), numbers })),
    scanned,
  };
}
