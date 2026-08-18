import type { WaFilters } from "../types";
import { comboKey, newId, sampleCombo } from "./picks";
import { CASH_POP_CROWDED, type WaGameSpec } from "./waGames";

export type WaPlay = {
  id: string;
  numbers: number[];
};

export const DEFAULT_WA_FILTERS: WaFilters = {
  uniqueSlip: true,
  birthday: true,
  highBall: true,
  sequence: true,
  multiples: true,
  visual: true,
  previous: true,
  lastDraw: true,
  hot: true,
  cold: true,
  luckyPops: true,
};

const LUCKY_POP = new Set(CASH_POP_CROWDED);

function longestConsecutive(sorted: number[]): number {
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

function isArithmetic(sorted: number[]): boolean {
  if (sorted.length < 3) return false;
  const d = sorted[1] - sorted[0];
  if (d <= 0) return false;
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== d) return false;
  }
  return true;
}

function isExactMultiples(sorted: number[]): boolean {
  const d = sorted[0];
  if (d < 1) return false;
  return sorted.every((n, i) => n === d * (i + 1));
}

function isGeometric(sorted: number[]): boolean {
  if (sorted.length < 3 || sorted[0] < 1) return false;
  const ratio = sorted[1] / sorted[0];
  if (!Number.isInteger(ratio) || ratio < 2) return false;
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] * ratio) return false;
  }
  return true;
}

function rowOf(n: number, cols = 10): number {
  return Math.floor((n - 1) / cols);
}

function colOf(n: number, cols = 10): number {
  return (n - 1) % cols;
}

function isVisualLine(numbers: number[], cols = 10): boolean {
  if (numbers.length < 3) return false;
  const rows = numbers.map((n) => rowOf(n, cols));
  const colsOf = numbers.map((n) => colOf(n, cols));
  if (rows.every((r) => r === rows[0])) return true;
  if (colsOf.every((c) => c === colsOf[0])) return true;
  const diagDown = rows.map((r, i) => r - colsOf[i]);
  const diagUp = rows.map((r, i) => r + colsOf[i]);
  return (
    diagDown.every((v) => v === diagDown[0]) ||
    diagUp.every((v) => v === diagUp[0])
  );
}

/** First fade that rejects this play, or null if it survives every fade. */
export function waRejectReason(
  numbers: number[],
  spec: WaGameSpec,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number>,
): string | null {
  const sorted = [...numbers].sort((a, b) => a - b);
  const key = comboKey(numbers);

  if (filters.previous && past.has(key)) return "previous";
  if (avoid.size > 0 && numbers.some((n) => avoid.has(n))) return "temperature";

  if (spec.kind === "cashpop") {
    if (filters.luckyPops && numbers.some((n) => LUCKY_POP.has(n))) {
      return "luckyPops";
    }
    return null;
  }

  if (
    filters.birthday &&
    spec.id !== "hit5" &&
    spec.whiteMax > 31 &&
    numbers.every((n) => n <= 31)
  ) {
    return "birthday";
  }
  if (filters.highBall && spec.id === "hit5" && !numbers.some((n) => n >= 32)) {
    return "highBall";
  }
  if (
    filters.sequence &&
    numbers.length >= 4 &&
    (longestConsecutive(sorted) >= 4 || isArithmetic(sorted))
  ) {
    return "sequence";
  }
  if (
    filters.multiples &&
    numbers.length >= 3 &&
    (isExactMultiples(sorted) || isGeometric(sorted))
  ) {
    return "multiples";
  }
  if (filters.visual && isVisualLine(numbers)) return "visual";
  return null;
}

export function rejectWaPlay(
  numbers: number[],
  spec: WaGameSpec,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number>,
): boolean {
  return waRejectReason(numbers, spec, filters, past, avoid) !== null;
}

export function generateWaPlays(
  spec: WaGameSpec,
  whiteCount: number,
  count: number,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number> = new Set(),
): { tickets: WaPlay[]; attempts: number; rejected: number } {
  const tickets: WaPlay[] = [];
  const used = new Set<string>();
  const usedWhites = new Set<number>();
  let attempts = 0;
  let rejected = 0;
  const maxAttempts = 24_000;
  const pairSize = spec.pairSize ?? 1;
  const want =
    pairSize > 1 ? Math.max(pairSize, count + (count % pairSize)) : count;
  let slipUnique = filters.uniqueSlip;

  const takeOne = (pairLock: Set<number>): WaPlay | null => {
    while (attempts < maxAttempts) {
      attempts += 1;
      const numbers = sampleCombo(spec.whiteMax, whiteCount);
      const key = comboKey(numbers);
      if (used.has(key)) {
        rejected += 1;
        continue;
      }
      if (numbers.some((n) => pairLock.has(n))) {
        rejected += 1;
        continue;
      }
      if (slipUnique && numbers.some((n) => usedWhites.has(n))) {
        rejected += 1;
        continue;
      }
      if (rejectWaPlay(numbers, spec, filters, past, avoid)) {
        rejected += 1;
        continue;
      }
      used.add(key);
      return { id: newId(), numbers };
    }
    return null;
  };

  while (tickets.length < want && attempts < maxAttempts) {
    const pairLock = new Set<number>();
    const first = takeOne(pairLock);
    if (!first) {
      if (slipUnique) {
        slipUnique = false;
        usedWhites.clear();
        if (attempts >= maxAttempts) attempts = maxAttempts - 8_000;
        continue;
      }
      break;
    }
    tickets.push(first);
    if (pairSize > 1) {
      for (const n of first.numbers) pairLock.add(n);
      const second = takeOne(pairLock);
      if (!second) {
        tickets.pop();
        if (slipUnique) {
          slipUnique = false;
          usedWhites.clear();
          if (attempts >= maxAttempts) attempts = maxAttempts - 8_000;
          continue;
        }
        break;
      }
      tickets.push(second);
      if (slipUnique) {
        for (const n of first.numbers) usedWhites.add(n);
        for (const n of second.numbers) usedWhites.add(n);
      }
    } else if (slipUnique) {
      for (const n of first.numbers) usedWhites.add(n);
    }
  }

  return { tickets, attempts, rejected };
}

export function waSlipCost(spec: WaGameSpec, tickets: WaPlay[]): number {
  const n = Math.max(tickets.length, 1);
  if (spec.id === "lotto") return spec.ticketCost * Math.ceil(n / (spec.pairSize ?? 2));
  if (spec.id === "cashpop") {
    return spec.ticketCost * tickets.reduce((sum, t) => sum + t.numbers.length, 0);
  }
  return spec.ticketCost * n;
}

export function formatWaPlay(numbers: number[]): string {
  return numbers.map((n) => String(n).padStart(2, "0")).join(" · ");
}
