import type { Filters, Pick3Way, WaFilters } from "../types";
import type { GameSpec } from "../types";
import { rejectReasons, sampleCombo } from "./picks";
import { combinations } from "./prizes";
import type { WaGameSpec } from "./waGames";
import { waRejectReason } from "./waPicks";

/**
 * Counts the combination space a game's fades remove. Small spaces are
 * enumerated exactly; big ones are estimated by Monte Carlo sampling.
 * None of this changes hit odds — it only sizes the pool of uncrowded picks.
 */

export type PoolStage = {
  key: string;
  label: string;
  removed: number;
  share: number;
};

export type PoolReport = {
  total: number;
  survivors: number;
  keptShare: number;
  exact: boolean;
  samples: number;
  stages: PoolStage[];
};

const EXACT_LIMIT = 25_000;
const SAMPLE_COUNT = 40_000;

function eachCombo(
  max: number,
  k: number,
  cb: (combo: number[]) => void,
): void {
  if (k < 1 || k > max) return;
  const combo = Array.from({ length: k }, (_, i) => i + 1);
  for (;;) {
    cb([...combo]);
    let i = k - 1;
    while (i >= 0 && combo[i] === max - (k - 1 - i)) i -= 1;
    if (i < 0) return;
    combo[i] += 1;
    for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1;
  }
}

function eachDigits(cb: (combo: number[]) => void): void {
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) cb([a, b, c]);
    }
  }
}

function tally(
  total: number,
  order: string[],
  labels: Record<string, string>,
  firstReason: (combo: number[]) => string | null,
  enumerate: ((cb: (combo: number[]) => void) => void) | null,
  sample: () => number[],
): PoolReport {
  const counts = new Map<string, number>();
  let seen = 0;
  const record = (combo: number[]) => {
    seen += 1;
    const reason = firstReason(combo);
    if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  };

  const exact = enumerate !== null;
  if (enumerate) {
    enumerate(record);
  } else {
    for (let i = 0; i < SAMPLE_COUNT; i++) record(sample());
  }
  if (seen === 0) {
    return { total, survivors: total, keptShare: 1, exact, samples: 0, stages: [] };
  }

  const scale = total / seen;
  let removedSum = 0;
  const stages: PoolStage[] = [];
  for (const key of order) {
    const hit = counts.get(key);
    if (!hit) continue;
    const removed = exact ? hit : Math.round(hit * scale);
    removedSum += removed;
    stages.push({
      key,
      label: labels[key] ?? key,
      removed,
      share: removed / total,
    });
  }
  const survivors = Math.max(0, total - removedSum);
  return {
    total,
    survivors,
    keptShare: survivors / total,
    exact,
    samples: seen,
    stages,
  };
}

const NATIONAL_ORDER = [
  "birthday",
  "sequence",
  "multiples",
  "previous",
  "visual",
  "temperature",
];

const NATIONAL_LABELS: Record<string, string> = {
  birthday: "All five whites in 1–31",
  sequence: "Straight runs / 4+ consecutive",
  multiples: "Multiples patterns",
  previous: "Recent official winners",
  visual: "Playslip row / column / diagonal",
  temperature: "Hot, cold, overdue, last-draw numbers",
};

export function nationalPool(
  spec: GameSpec,
  filters: Filters,
  past: Set<string>,
  avoid: Set<number>,
): PoolReport {
  const total = combinations(spec.whiteMax, 5);
  const firstReason = (whites: number[]) =>
    rejectReasons(whites, filters, past, avoid)[0] ?? null;
  return tally(total, NATIONAL_ORDER, NATIONAL_LABELS, firstReason, null, () =>
    sampleCombo(spec.whiteMax, 5),
  );
}

const WA_ORDER = [
  "previous",
  "temperature",
  "sequence",
  "doubles",
  "areaCodes",
  "dates",
  "luckyPops",
  "birthday",
  "highBall",
  "multiples",
  "visual",
  "decade",
  "lowHalf",
];

function waLabels(spec: WaGameSpec): Record<string, string> {
  return {
    previous: "Past winning draws",
    temperature:
      spec.kind === "digits"
        ? "Last night’s digits"
        : "Hot, cold, overdue, last-draw numbers",
    sequence:
      spec.kind === "digits"
        ? "Triples / straight runs"
        : spec.kind === "keno"
          ? "Consecutive clusters"
          : "Straight runs / 4+ consecutive",
    doubles: "Doubles (any two digits match)",
    areaCodes: "WA area codes",
    dates: "Dates and years",
    luckyPops: "Lucky POPs (1, 7, 11, 13, 15)",
    birthday: "All numbers in 1–31",
    highBall: "No high ball 32–42",
    multiples: "Multiples patterns",
    visual:
      spec.kind === "keno"
        ? "One column on the 80-card"
        : "Playslip row / column / diagonal",
    decade: "One decade / one row",
    lowHalf: "All spots in 1–40",
  };
}

export function waPool(
  spec: WaGameSpec,
  whiteCount: number,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number>,
  pick3Way: Pick3Way,
): PoolReport {
  const labels = waLabels(spec);
  const firstReason = (numbers: number[]) =>
    waRejectReason(numbers, spec, filters, past, avoid, pick3Way);

  if (spec.kind === "digits") {
    return tally(1_000, WA_ORDER, labels, firstReason, eachDigits, () => []);
  }

  const total = combinations(spec.whiteMax, whiteCount);
  const enumerate =
    total > 0 && total <= EXACT_LIMIT
      ? (cb: (combo: number[]) => void) => eachCombo(spec.whiteMax, whiteCount, cb)
      : null;
  return tally(total, WA_ORDER, labels, firstReason, enumerate, () =>
    sampleCombo(spec.whiteMax, whiteCount),
  );
}
