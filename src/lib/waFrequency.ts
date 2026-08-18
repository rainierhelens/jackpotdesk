import type { WaFilters } from "../types";
import type { WaDraw } from "./waDraws";

export type WaFreqStats = {
  window: number;
  since: string;
  hot: number[];
  cold: number[];
  overdue: { n: number; days: number } | null;
};

const HOT_COUNT = 3;
const COLD_COUNT = 3;
const OVERDUE_MIN_DAYS = 30;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Per-number gaps. Fade crowded public tickets, not a forecast. */
export function waFrequency(
  draws: WaDraw[],
  minN: number,
  maxN: number,
): WaFreqStats | null {
  if (draws.length === 0 || maxN < minN) return null;

  const asOf = draws[0].date;
  const oldest = draws[draws.length - 1].date;
  const size = maxN - minN + 1;
  const counts = new Array<number>(size).fill(0);
  const lastSeen: (string | null)[] = new Array(size).fill(null);

  for (const draw of draws) {
    for (const raw of draw.numbers) {
      if (raw < minN || raw > maxN) continue;
      const i = raw - minN;
      counts[i] += 1;
      if (lastSeen[i] === null) lastSeen[i] = draw.date;
    }
  }

  const gaps = Array.from({ length: size }, (_, i) => {
    const n = i + minN;
    const seen = lastSeen[i];
    const days = seen
      ? daysBetween(seen, asOf)
      : daysBetween(oldest, asOf) + 1;
    return { n, days, freq: counts[i] };
  });

  const hot = [...gaps]
    .sort((a, b) => a.days - b.days || a.n - b.n)
    .slice(0, HOT_COUNT)
    .map((row) => row.n);
  const hotSet = new Set(hot);
  const cold = gaps
    .filter((row) => !hotSet.has(row.n))
    .sort((a, b) => b.days - a.days || a.n - b.n)
    .slice(0, COLD_COUNT)
    .map((row) => row.n);

  const freqMedian = median(gaps.map((row) => row.freq));
  const overdueRow = gaps
    .filter((row) => row.freq > freqMedian && row.days > OVERDUE_MIN_DAYS)
    .sort((a, b) => b.freq - a.freq || b.days - a.days || a.n - b.n)[0];

  return {
    window: draws.length,
    since: oldest,
    hot,
    cold,
    overdue: overdueRow
      ? { n: overdueRow.n, days: overdueRow.days }
      : null,
  };
}

export function waAvoid(
  filters: Pick<WaFilters, "hot" | "cold" | "lastDraw">,
  stats: WaFreqStats | null,
  lastNumbers: number[] = [],
): Set<number> {
  const skip = new Set<number>();
  if (filters.lastDraw) {
    for (const n of lastNumbers) skip.add(n);
  }
  if (!stats) return skip;
  if (filters.hot) {
    for (const n of stats.hot) skip.add(n);
  }
  if (filters.cold) {
    for (const n of stats.cold) skip.add(n);
    if (stats.overdue) skip.add(stats.overdue.n);
  }
  return skip;
}
