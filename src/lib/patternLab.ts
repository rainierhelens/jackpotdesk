/**
 * Pattern Lab: frequency-weighted ticket exploration.
 *
 * Builds a statistical portrait of a game's historical draws — per-number
 * frequencies, pair/triple co-occurrence, recent heat, and the shapes of
 * winning boards (odd/even split, high/low split, sum band) — then scores
 * and generates tickets that lean into those patterns.
 *
 * This is descriptive of the past, full stop. Every combination remains
 * exactly as likely as any other; the score is entertainment, not an edge.
 */
import { comboKey, newId } from "./picks";
import { drawFromRanking, type RankedCandidate } from "./popularity";

export type PatternDraw = { numbers: number[]; extra?: number | null };

export type PatternModel = {
  draws: number;
  poolMax: number;
  /** Numbers per draw in the source history. */
  pick: number;
  specialMax: number | null;
  /** Full-history count per number (index 0 = number 1). */
  freq: number[];
  /** Per-number lift vs the uniform rate (1 = drawn at the expected rate). */
  weight: number[];
  /** Recent-window lift vs the uniform rate. */
  hotLift: number[];
  pairs: Map<string, number>;
  /** Pair count a uniform history would put on any one pair. */
  pairExpected: number;
  /** Only kept for long histories; any repeated triple is a callout. */
  triples: Map<string, number> | null;
  specialFreq: number[] | null;
  /** How many draws had k odd numbers (index = k). */
  oddHist: number[];
  /** How many draws had k numbers above the pool midpoint. */
  highHist: number[];
  /** Middle 50% band of historical draw sums. */
  sumLo: number;
  sumHi: number;
  /** Top numbers / pairs, for explanations. */
  top10: number[];
  topPairs: { a: number; b: number; count: number; rank: number }[];
};

const RECENT_WINDOW = 30;
const TRIPLE_MIN_DRAWS = 400;
const MIN_DRAWS = 20;

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function combinations2(n: number): number {
  return (n * (n - 1)) / 2;
}

/** Build the historical portrait. Draws are expected newest-first. */
export function buildPatternModel(
  raw: PatternDraw[],
  poolMax: number,
  specialMax: number | null = null,
): PatternModel | null {
  if (raw.length === 0) return null;
  const pick = raw[0].numbers.length;
  const draws = raw.filter(
    (d) =>
      d.numbers.length === pick &&
      d.numbers.every((n) => n >= 1 && n <= poolMax),
  );
  if (draws.length < MIN_DRAWS || pick < 1) return null;

  const freq = new Array<number>(poolMax).fill(0);
  const recent = new Array<number>(poolMax).fill(0);
  const pairs = new Map<string, number>();
  const wantTriples = pick >= 3 && draws.length >= TRIPLE_MIN_DRAWS;
  const triples = wantTriples ? new Map<string, number>() : null;
  const specialFreq = specialMax ? new Array<number>(specialMax).fill(0) : null;
  let specialDraws = 0;
  const oddHist = new Array<number>(pick + 1).fill(0);
  const highHist = new Array<number>(pick + 1).fill(0);
  const sums: number[] = [];
  const recentCut = Math.min(RECENT_WINDOW, draws.length);
  const mid = poolMax / 2;

  draws.forEach((draw, at) => {
    let odd = 0;
    let high = 0;
    let sum = 0;
    for (const n of draw.numbers) {
      freq[n - 1] += 1;
      if (at < recentCut) recent[n - 1] += 1;
      if (n % 2 === 1) odd += 1;
      if (n > mid) high += 1;
      sum += n;
    }
    oddHist[odd] += 1;
    highHist[high] += 1;
    sums.push(sum);
    for (let i = 0; i < draw.numbers.length; i++) {
      for (let j = i + 1; j < draw.numbers.length; j++) {
        const pk = pairKey(draw.numbers[i], draw.numbers[j]);
        pairs.set(pk, (pairs.get(pk) ?? 0) + 1);
        if (triples) {
          for (let k = j + 1; k < draw.numbers.length; k++) {
            const tk = `${pk}-${draw.numbers[k]}`;
            triples.set(tk, (triples.get(tk) ?? 0) + 1);
          }
        }
      }
    }
    if (
      specialFreq &&
      specialMax &&
      draw.extra != null &&
      draw.extra >= 1 &&
      draw.extra <= specialMax
    ) {
      specialFreq[draw.extra - 1] += 1;
      specialDraws += 1;
    }
  });

  const expected = (draws.length * pick) / poolMax;
  const recentExpected = (recentCut * pick) / poolMax;
  const weight = freq.map((c) => (expected > 0 ? c / expected : 1));
  const hotLift = recent.map((c) =>
    recentExpected > 0 ? c / recentExpected : 1,
  );

  sums.sort((a, b) => a - b);
  const sumLo = sums[Math.floor(sums.length * 0.25)];
  const sumHi = sums[Math.min(sums.length - 1, Math.floor(sums.length * 0.75))];

  const top10 = freq
    .map((c, i) => ({ n: i + 1, c }))
    .sort((a, b) => b.c - a.c || a.n - b.n)
    .slice(0, 10)
    .map((x) => x.n);
  const topPairs = [...pairs.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 10)
    .map(([key, count], i) => {
      const [a, b] = key.split("-").map(Number);
      return { a, b, count, rank: i + 1 };
    });

  return {
    draws: draws.length,
    poolMax,
    pick,
    specialMax,
    freq,
    weight,
    hotLift,
    pairs,
    pairExpected:
      (draws.length * combinations2(pick)) / combinations2(poolMax),
    triples,
    specialFreq: specialDraws >= MIN_DRAWS ? specialFreq : null,
    oddHist,
    highHist,
    sumLo,
    sumHi,
    top10,
    topPairs,
  };
}

export type PatternScore = {
  /** 50 = the average random ticket for this game and ticket size. */
  points: number;
  raw: number;
  parts: {
    freq: number;
    hot: number;
    pair: number;
    triple: number;
    shape: number;
    special: number;
  };
};

const W = { freq: 0.34, hot: 0.14, pair: 0.2, triple: 0.05, shape: 0.22, special: 0.05 };

function rawScore(
  model: PatternModel,
  numbers: number[],
  extra: number | null,
): { raw: number; parts: PatternScore["parts"] } {
  const k = numbers.length;
  let freqPart = 0;
  let hotPart = 0;
  for (const n of numbers) {
    freqPart += model.weight[n - 1] ?? 1;
    hotPart += model.hotLift[n - 1] ?? 1;
  }
  freqPart /= k;
  hotPart /= k;

  let pairPart = 1;
  let triplePart = 1;
  if (k >= 2 && model.pairExpected > 0) {
    let sum = 0;
    let pairsSeen = 0;
    let tripleHits = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        sum += (model.pairs.get(pairKey(numbers[i], numbers[j])) ?? 0);
        pairsSeen += 1;
        if (model.triples && k >= 3) {
          for (let m = j + 1; m < k; m++) {
            const tk = `${pairKey(numbers[i], numbers[j])}-${numbers[m]}`;
            if ((model.triples.get(tk) ?? 0) >= 2) tripleHits += 1;
          }
        }
      }
    }
    pairPart = sum / (pairsSeen * model.pairExpected);
    triplePart = 1 + tripleHits * 0.5;
  }

  // Shape bonuses only make sense when the ticket matches the draw size.
  let shapePart = 1;
  if (k === model.pick && k >= 2) {
    const odd = numbers.filter((n) => n % 2 === 1).length;
    const high = numbers.filter((n) => n > model.poolMax / 2).length;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const oddMax = Math.max(...model.oddHist, 1);
    const highMax = Math.max(...model.highHist, 1);
    const oddScore = (model.oddHist[odd] ?? 0) / oddMax;
    const highScore = (model.highHist[high] ?? 0) / highMax;
    const sumScore = sum >= model.sumLo && sum <= model.sumHi ? 1 : 0.35;
    shapePart = (oddScore + highScore + sumScore) / 3;
  }

  let specialPart = 1;
  if (extra != null && model.specialFreq && model.specialMax) {
    const total = model.specialFreq.reduce((a, b) => a + b, 0);
    const exp = total / model.specialMax;
    if (exp > 0) specialPart = (model.specialFreq[extra - 1] ?? 0) / exp;
  }

  const parts = {
    freq: freqPart,
    hot: hotPart,
    pair: pairPart,
    triple: triplePart,
    shape: shapePart,
    special: specialPart,
  };
  const raw =
    W.freq * freqPart +
    W.hot * hotPart +
    W.pair * pairPart +
    W.triple * triplePart +
    W.shape * shapePart +
    W.special * specialPart;
  return { raw, parts };
}

/** Deterministic PRNG so score calibration is stable across renders. */
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

function seededCombo(
  rand: () => number,
  poolMax: number,
  k: number,
): number[] {
  const picked: number[] = [];
  while (picked.length < Math.min(k, poolMax)) {
    const n = 1 + Math.floor(rand() * poolMax);
    if (!picked.includes(n)) picked.push(n);
  }
  return picked;
}

/** Mean raw score of uniform random tickets — the 50-point calibration. */
const baselines = new Map<PatternModel, Map<number, number>>();

function baselineMean(model: PatternModel, size: number): number {
  let sizes = baselines.get(model);
  if (!sizes) {
    sizes = new Map();
    baselines.set(model, sizes);
  }
  const cached = sizes.get(size);
  if (cached !== undefined) return cached;
  const rand = mulberry32(0x5eed5);
  const samples = 3_000;
  let mean = 0;
  for (let i = 0; i < samples; i++) {
    const numbers = seededCombo(rand, model.poolMax, size);
    const extra =
      model.specialFreq && model.specialMax
        ? 1 + Math.floor(rand() * model.specialMax)
        : null;
    mean += rawScore(model, numbers, extra).raw;
  }
  mean /= samples;
  sizes.set(size, mean);
  return mean;
}

export function scoreTicket(
  model: PatternModel,
  numbers: number[],
  extra: number | null = null,
): PatternScore {
  const { raw, parts } = rawScore(model, numbers, extra);
  const base = baselineMean(model, numbers.length);
  return {
    points: Math.round((50 * raw) / Math.max(base, 1e-9)),
    raw,
    parts,
  };
}

/** Short, factual why-line for one ticket. */
export function explainTicket(
  model: PatternModel,
  numbers: number[],
  extra: number | null = null,
): string {
  const bits: string[] = [];
  const topSet = new Set(model.top10);
  const inTop = numbers.filter((n) => topSet.has(n)).length;
  if (inTop > 0) {
    bits.push(`${inTop} of the top-10 all-time numbers`);
  }

  let bestPair: { rank: number; a: number; b: number } | null = null;
  for (const p of model.topPairs) {
    if (numbers.includes(p.a) && numbers.includes(p.b)) {
      if (!bestPair || p.rank < bestPair.rank) bestPair = p;
    }
  }
  if (bestPair) {
    bits.push(`carries the #${bestPair.rank} pair ${bestPair.a}-${bestPair.b}`);
  }

  const hot = numbers.filter((n) => (model.hotLift[n - 1] ?? 1) >= 1.5).length;
  if (hot > 0) {
    bits.push(`${hot} running hot over the last ${RECENT_WINDOW} draws`);
  }

  if (numbers.length === model.pick && numbers.length >= 2) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    if (sum >= model.sumLo && sum <= model.sumHi) {
      bits.push(`sum ${sum} inside the historical middle band`);
    }
    const odd = numbers.filter((n) => n % 2 === 1).length;
    const modalOdd = model.oddHist.indexOf(Math.max(...model.oddHist));
    if (odd === modalOdd) {
      bits.push(`${odd} odd / ${numbers.length - odd} even, the modal split`);
    }
  }

  if (extra != null && model.specialFreq) {
    const total = model.specialFreq.reduce((a, b) => a + b, 0);
    const exp = total / (model.specialMax ?? 1);
    if (exp > 0 && (model.specialFreq[extra - 1] ?? 0) / exp >= 1.15) {
      bits.push(`a frequently drawn special ball`);
    }
  }

  if (bits.length === 0) return "balanced draw from the weighted field";
  return bits.join(" · ");
}

export type PatternTicket = {
  id: string;
  numbers: number[];
  extra: number | null;
};

export type PatternPickResult = {
  tickets: PatternTicket[];
  /** Candidate boards scored to build the ranking. */
  scanned: number;
};

const PATTERN_TARGET = 4_000;
const PATTERN_ATTEMPTS = 16_000;

/** Sample one board with numbers drawn proportionally to blended weight. */
function weightedCombo(
  blend: number[],
  k: number,
  rand: () => number = Math.random,
): number[] {
  const poolMax = blend.length;
  const picked: number[] = [];
  const taken = new Set<number>();
  while (picked.length < Math.min(k, poolMax)) {
    let total = 0;
    for (let n = 1; n <= poolMax; n++) {
      if (!taken.has(n)) total += blend[n - 1];
    }
    let roll = rand() * total;
    let choice = 0;
    for (let n = 1; n <= poolMax; n++) {
      if (taken.has(n)) continue;
      roll -= blend[n - 1];
      if (roll <= 0) {
        choice = n;
        break;
      }
    }
    if (choice === 0) {
      for (let n = poolMax; n >= 1; n--) {
        if (!taken.has(n)) {
          choice = n;
          break;
        }
      }
    }
    taken.add(choice);
    picked.push(choice);
  }
  return picked.sort((a, b) => a - b);
}

function weightedSpecial(specialFreq: number[]): number {
  const total = specialFreq.reduce((a, b) => a + b, 0);
  if (total <= 0) return 1 + Math.floor(Math.random() * specialFreq.length);
  let roll = Math.random() * total;
  for (let i = 0; i < specialFreq.length; i++) {
    roll -= specialFreq[i];
    if (roll <= 0) return i + 1;
  }
  return specialFreq.length;
}

/**
 * All-time lift blended with a dash of recent heat; the floor keeps every
 * number reachable so tickets are not pure frequency dumps.
 */
function blendWeights(model: PatternModel): number[] {
  return model.weight.map((w, i) =>
    Math.max(0.08, w * Math.sqrt(Math.max(model.hotLift[i], 0.25))),
  );
}

/**
 * Generate tickets that maximize the pattern score with controlled
 * randomness: candidates are sampled with frequency-weighted numbers,
 * ranked by raw score, then drawn from the top window so no two slips
 * are identical frequency dumps.
 */
export function patternPickTickets(
  model: PatternModel,
  size: number,
  count: number,
  pairSize = 1,
): PatternPickResult {
  const blend = blendWeights(model);

  const seen = new Set<string>();
  const candidates: RankedCandidate[] = [];
  let scanned = 0;
  while (candidates.length < PATTERN_TARGET && scanned < PATTERN_ATTEMPTS) {
    scanned += 1;
    const numbers = weightedCombo(blend, size);
    const key = comboKey(numbers);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ numbers, score: rawScore(model, numbers, null).raw });
  }
  // drawFromRanking takes from the front; highest pattern score first.
  candidates.sort((a, b) => b.score - a.score);

  const want =
    pairSize > 1 ? Math.max(pairSize, count + (count % pairSize)) : count;
  const pairLock = new Set<number>();
  let inPair = 0;
  const eligible = (numbers: number[]) =>
    !numbers.some((n) => pairLock.has(n));
  const take = (numbers: number[]) => {
    if (pairSize > 1) {
      inPair = (inPair + 1) % pairSize;
      if (inPair === 0) pairLock.clear();
      else for (const n of numbers) pairLock.add(n);
    }
  };

  let boards = drawFromRanking(candidates, want, eligible, take);
  if (pairSize > 1) {
    boards = boards.slice(0, boards.length - (boards.length % pairSize));
  }

  return {
    tickets: boards.map((numbers) => ({
      id: newId(),
      numbers,
      extra: model.specialFreq ? weightedSpecial(model.specialFreq) : null,
    })),
    scanned,
  };
}

/*
 * The ladder: the whole scanned field in strict pattern-score order.
 * Rank #1 is the highest-scoring board the scan found — NOT the board most
 * likely to be drawn next. No such board exists; every combination keeps
 * identical odds. The ladder is the pattern story told in full, best first.
 */

export type LadderEntry = {
  rank: number;
  numbers: number[];
  extra: number | null;
  points: number;
  why: string;
  parts: PatternScore["parts"];
};

export type LadderResult = {
  entries: LadderEntry[];
  /** Candidate boards scanned to build the ranking. */
  scanned: number;
};

/** Ranks 1..LADDER_DEPTH are the scored field. The live feed is ungated. */
export const LADDER_DEPTH = 100;
/** Planned free desk: ranks 1..LADDER_FREE_DEPTH. Not enforced until auth. */
export const LADDER_FREE_DEPTH = 10;
const LADDER_ATTEMPTS = 60_000;

/**
 * Seed derived from the draw history itself, so the ladder is identical
 * on every visit and only re-ranks when new official draws land.
 */
function modelSeed(model: PatternModel): number {
  let h = (model.draws * 31 + model.poolMax) | 0;
  for (const c of model.freq) h = (h * 33 + c) | 0;
  return h >>> 0;
}

/** Most frequently drawn special ball — the score-maximizing choice. */
function topSpecial(model: PatternModel): number | null {
  if (!model.specialFreq) return null;
  let best = 0;
  for (let i = 1; i < model.specialFreq.length; i++) {
    if (model.specialFreq[i] > model.specialFreq[best]) best = i;
  }
  return best + 1;
}

/**
 * Rank the scanned field by pattern score, best first. Deterministic for a
 * given draw history: the same game shows the same ladder until new data
 * arrives. Depth-capped — the feed is meant to be scarce.
 */
export function patternLadder(
  model: PatternModel,
  size: number,
  depth: number = LADDER_DEPTH,
): LadderResult {
  const rand = mulberry32(modelSeed(model) ^ (size * 0x9e3779b9));
  const blend = blendWeights(model);
  const seen = new Set<string>();
  const candidates: RankedCandidate[] = [];
  let scanned = 0;
  while (scanned < LADDER_ATTEMPTS) {
    scanned += 1;
    const numbers = weightedCombo(blend, size, rand);
    const key = comboKey(numbers);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ numbers, score: rawScore(model, numbers, null).raw });
  }
  candidates.sort((a, b) => b.score - a.score);

  const extra = topSpecial(model);
  return {
    entries: candidates.slice(0, depth).map((c, i) => {
      const score = scoreTicket(model, c.numbers, extra);
      return {
        rank: i + 1,
        numbers: c.numbers,
        extra,
        points: score.points,
        why: explainTicket(model, c.numbers, extra),
        parts: score.parts,
      };
    }),
    scanned,
  };
}
