/**
 * Named remainders for a partial Desk slip.
 *
 * Heat, crowd, and pattern stay three lists. Nothing here averages them
 * into a next-number rank. Same hit odds as Quick Pick either way.
 */
import type { HeatBook } from "./lotteryHeat";
import { pairKey, type PatternModel } from "./patternLab";

export const HINT_CAP = 4;

export type HintKind = "white" | "extra";

export type HintChip = {
  n: number;
  kind: HintKind;
  /** Short fact for the chip title. Not a blended rank. */
  why: string;
};

function takeTop<T>(items: T[], k: number): T[] {
  return items.slice(0, Math.max(0, k));
}

function pickRateWhy(weight: number, noun: string): string {
  const pct = Math.round(Math.abs(weight - 1) * 100);
  if (pct < 2) return `${noun} picked about at the random rate`;
  return weight > 1
    ? `${noun} picked ~${pct}% more than random`
    : `${noun} picked ~${pct}% less than random`;
}

/** Unused whites furthest over chance, and unused whites with the longest gap. */
export function heatRemainders(
  book: HeatBook,
  taken: number[],
  k = HINT_CAP,
): { overChance: HintChip[]; longestGap: HintChip[] } {
  if (taken.length === 0) return { overChance: [], longestGap: [] };
  const held = new Set(taken);
  const unused = book.whites.filter((cell) => !held.has(cell.n));

  const overChance = takeTop(
    unused
      .filter((cell) => cell.deviation > 0)
      .sort((a, b) => b.deviation - a.deviation || a.n - b.n)
      .map((cell) => ({
        n: cell.n,
        kind: "white" as const,
        why: `${cell.deviation > 0 ? "+" : ""}${cell.deviation.toFixed(1)} vs chance in this window`,
      })),
    k,
  );

  const longestGap = takeTop(
    unused
      .slice()
      .sort((a, b) => b.gapDays - a.gapDays || a.n - b.n)
      .map((cell) => ({
        n: cell.n,
        kind: "white" as const,
        why:
          cell.gapDays <= 0
            ? "last draw in this window"
            : `${cell.gapDays} day gap in this window`,
      })),
    k,
  );

  return { overChance, longestGap };
}

/**
 * Unused numbers ranked only by historical pair counts with the current
 * whites. Numbers that never co-occur are left off.
 */
export function patternRemainders(
  model: PatternModel,
  whites: number[],
  k = HINT_CAP,
): HintChip[] {
  if (whites.length === 0) return [];
  const held = new Set(whites);
  const scored: { n: number; pairs: number }[] = [];
  for (let n = 1; n <= model.poolMax; n++) {
    if (held.has(n)) continue;
    let pairs = 0;
    for (const w of whites) {
      pairs += model.pairs.get(pairKey(n, w)) ?? 0;
    }
    if (pairs > 0) scored.push({ n, pairs });
  }
  scored.sort((a, b) => b.pairs - a.pairs || a.n - b.n);
  return takeTop(scored, k).map((row) => ({
    n: row.n,
    kind: "white" as const,
    why: `pair history with the slip: ${row.pairs} draws`,
  }));
}

/**
 * Least-picked unused whites, and least-picked extras. Weight only.
 * Empty tray (no whites, no extra) returns empty lists.
 */
export function crowdRemainders(
  whiteWeights: number[],
  takenWhites: number[],
  k = HINT_CAP,
  extraWeights: number[] | null = null,
  takenExtra: number | null = null,
): { whites: HintChip[]; extras: HintChip[] } {
  const started = takenWhites.length > 0 || (takenExtra != null && takenExtra > 0);
  if (!started) return { whites: [], extras: [] };

  const held = new Set(takenWhites);
  const whites = takeTop(
    whiteWeights
      .map((w, i) => ({ n: i + 1, w }))
      .filter((row) => !held.has(row.n))
      .sort((a, b) => a.w - b.w || a.n - b.n),
    k,
  ).map((row) => ({
    n: row.n,
    kind: "white" as const,
    why: pickRateWhy(row.w, "white"),
  }));

  const extras =
    extraWeights && extraWeights.length > 0
      ? takeTop(
          extraWeights
            .map((w, i) => ({ n: i + 1, w }))
            .filter((row) => takenExtra == null || row.n !== takenExtra)
            .sort((a, b) => a.w - b.w || a.n - b.n),
          k,
        ).map((row) => ({
          n: row.n,
          kind: "extra" as const,
          why: pickRateWhy(row.w, "special"),
        }))
      : [];

  return { whites, extras };
}

/**
 * Product of the selected number weights (and extra if given).
 * 1.00 = the random-play rate. Not a percentile.
 */
/**
 * Add, drop, or replace a white on the tray.
 * A new pick on a full board replaces the last-added number.
 */
export function toggleTrayWhite(
  cur: number[],
  n: number,
  pick: number,
): number[] {
  if (cur.includes(n)) return cur.filter((x) => x !== n);
  if (cur.length < pick) return [...cur, n];
  if (cur.length === 0) return [n];
  return [...cur.slice(0, -1), n];
}

export function partialCrowd(
  whiteWeights: number[],
  whites: number[],
  extraWeight: number | null = null,
): number {
  let product = 1;
  for (const n of whites) product *= whiteWeights[n - 1] ?? 1;
  if (extraWeight != null) product *= extraWeight;
  return product;
}
