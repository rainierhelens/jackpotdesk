import type { Filters } from "../types";
import type { OfficialDraw } from "./winners";

export type FrequencyStats = {
  window: number;
  since: string;
  hot: number[];
  cold: number[];
  overdue: { n: number; days: number } | null;
};

export type FieldCell = {
  n: number;
  days: number;
  freq: number;
  overdue: boolean;
};

export type NumberField = FrequencyStats & {
  cells: FieldCell[];
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

/** Per-number gaps and frequencies for the live field. Fade, not a forecast. */
export function numberField(
  draws: OfficialDraw[],
  whiteMax: number,
): NumberField | null {
  if (draws.length === 0 || whiteMax < 5) return null;

  const asOf = draws[0].date;
  const oldest = draws[draws.length - 1].date;
  const counts = new Array<number>(whiteMax + 1).fill(0);
  const lastSeen: (string | null)[] = new Array(whiteMax + 1).fill(null);

  for (const draw of draws) {
    for (const n of draw.whites) {
      if (n < 1 || n > whiteMax) continue;
      counts[n] += 1;
      if (lastSeen[n] === null) lastSeen[n] = draw.date;
    }
  }

  const ranked = Array.from({ length: whiteMax }, (_, i) => i + 1);
  const gaps = ranked.map((n) => {
    const seen = lastSeen[n];
    const days = seen
      ? daysBetween(seen, asOf)
      : daysBetween(oldest, asOf) + 1;
    return { n, days, freq: counts[n] };
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

  const freqMedian = median(ranked.map((n) => counts[n]));
  const overdueRow = gaps
    .filter((row) => row.freq > freqMedian && row.days > OVERDUE_MIN_DAYS)
    .sort((a, b) => b.freq - a.freq || b.days - a.days || a.n - b.n)[0];
  const overdueN = overdueRow?.n ?? null;

  return {
    window: draws.length,
    since: oldest,
    hot,
    cold,
    overdue: overdueRow
      ? { n: overdueRow.n, days: overdueRow.days }
      : null,
    cells: gaps.map((row) => ({
      n: row.n,
      days: row.days,
      freq: row.freq,
      overdue: overdueN === row.n,
    })),
  };
}

export function frequencyStats(
  draws: OfficialDraw[],
  whiteMax: number,
): FrequencyStats | null {
  const field = numberField(draws, whiteMax);
  if (!field) return null;
  return {
    window: field.window,
    since: field.since,
    hot: field.hot,
    cold: field.cold,
    overdue: field.overdue,
  };
}

export function avoidWhites(
  filters: Pick<Filters, "hot" | "cold">,
  stats: FrequencyStats | null,
): Set<number> {
  const skip = new Set<number>();
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
