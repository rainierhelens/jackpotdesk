import type { Pick3Way, WaFilters } from "../types";
import { comboKey, newId, sampleCombo } from "./picks";
import { CASH_POP_CROWDED, WA_AREA_CODES, type WaGameSpec } from "./waGames";

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
  areaCodes: true,
  dates: true,
  doubles: true,
  decade: true,
  lowHalf: true,
  luckyPops: true,
};

const AREA = new Set(WA_AREA_CODES);
const LUCKY_POP = new Set(CASH_POP_CROWDED);
const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function randInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    let x = 0;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function sampleDigits(): number[] {
  return [randInt(10), randInt(10), randInt(10)];
}

function playKey(numbers: number[], kind: string, box = false): string {
  if (kind === "digits") {
    return box ? [...numbers].sort((a, b) => a - b).join("") : numbers.join("");
  }
  return comboKey(numbers);
}

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

function oneDecade(numbers: number[]): boolean {
  if (numbers.length < 2) return false;
  const decade = rowOf(numbers[0]);
  return numbers.every((n) => rowOf(n) === decade);
}

function pick3Run(digits: number[]): boolean {
  const [a, b, c] = digits;
  if (a === b && b === c) return true;
  if (b === a + 1 && c === b + 1) return true;
  if (b === a - 1 && c === b - 1) return true;
  if (a === 1 && b === 2 && c === 3) return true;
  if (a === 7 && b === 8 && c === 9) return true;
  return false;
}

function pick3Date(digits: number[]): boolean {
  const [a, b, c] = digits;
  const n = a * 100 + b * 10 + c;
  if (n <= 31) return true;
  if (a >= 1 && a <= 9) {
    const day = b * 10 + c;
    return day >= 1 && day <= DAYS_IN_MONTH[a];
  }
  return false;
}

/** First fade that rejects this play, or null if it survives every fade. */
export function waRejectReason(
  numbers: number[],
  spec: WaGameSpec,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number>,
  pick3Way: Pick3Way,
): string | null {
  const kind = spec.kind;
  const sorted = [...numbers].sort((a, b) => a - b);
  const key = playKey(numbers, kind, pick3Way === "box");

  if (filters.previous && past.has(key)) return "previous";
  if (avoid.size > 0 && numbers.some((n) => avoid.has(n))) return "temperature";

  if (kind === "digits") {
    if (filters.sequence && pick3Run(numbers)) return "sequence";
    if (filters.doubles && new Set(numbers).size < 3) return "doubles";
    if (filters.areaCodes && AREA.has(numbers.join(""))) return "areaCodes";
    if (filters.dates && pick3Date(numbers)) return "dates";
    return null;
  }

  if (kind === "cashpop") {
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
  if (filters.sequence) {
    const runNeed = kind === "keno" ? (numbers.length >= 4 ? 3 : 2) : 4;
    if (
      numbers.length >= runNeed &&
      (longestConsecutive(sorted) >= runNeed || isArithmetic(sorted))
    ) {
      return "sequence";
    }
  }
  if (
    filters.multiples &&
    numbers.length >= 3 &&
    (isExactMultiples(sorted) || isGeometric(sorted))
  ) {
    return "multiples";
  }
  if (filters.visual && isVisualLine(numbers)) return "visual";
  if (kind === "keno") {
    if (filters.decade && oneDecade(numbers)) return "decade";
    if (filters.lowHalf && numbers.length >= 2 && numbers.every((n) => n <= 40)) {
      return "lowHalf";
    }
  }
  return null;
}

export function rejectWaPlay(
  numbers: number[],
  spec: WaGameSpec,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number>,
  pick3Way: Pick3Way,
): boolean {
  return waRejectReason(numbers, spec, filters, past, avoid, pick3Way) !== null;
}

export function generateWaPlays(
  spec: WaGameSpec,
  whiteCount: number,
  count: number,
  filters: WaFilters,
  past: Set<string>,
  avoid: Set<number> = new Set(),
  pick3Way: Pick3Way = "straight",
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
  const kind = spec.kind;
  let slipUnique = filters.uniqueSlip && kind !== "digits";

  const takeOne = (pairLock: Set<number>): WaPlay | null => {
    while (attempts < maxAttempts) {
      attempts += 1;
      const numbers =
        kind === "digits" ? sampleDigits() : sampleCombo(spec.whiteMax, whiteCount);
      const key = playKey(numbers, kind, pick3Way === "box");
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
      if (rejectWaPlay(numbers, spec, filters, past, avoid, pick3Way)) {
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

export function waSlipCost(
  spec: WaGameSpec,
  tickets: WaPlay[],
  stake = 1,
): number {
  const n = Math.max(tickets.length, 1);
  if (spec.id === "lotto") return spec.ticketCost * Math.ceil(n / (spec.pairSize ?? 2));
  if (spec.id === "keno") return stake * n;
  if (spec.id === "cashpop") {
    return spec.ticketCost * tickets.reduce((sum, t) => sum + t.numbers.length, 0);
  }
  return spec.ticketCost * n;
}

export function formatWaPlay(numbers: number[], kind: string): string {
  if (kind === "digits") return numbers.join("");
  return numbers.map((n) => String(n).padStart(2, "0")).join(" · ");
}
