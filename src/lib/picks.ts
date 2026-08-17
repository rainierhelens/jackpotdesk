import type { Filters, GameSpec, Ticket } from "../types";

export const DEFAULT_FILTERS: Filters = {
  birthday: true,
  sequence: true,
  multiples: true,
  previous: true,
  visual: true,
  hot: true,
  cold: true,
  lastDraw: true,
  uniqueSlip: true,
};

export function comboKey(whites: number[]): string {
  return [...whites].sort((a, b) => a - b).join(",");
}

/** UUID that still works on http:// until GitHub issues the Pages cert. */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

function sampleWhites(whiteMax: number): number[] {
  const pool = Array.from({ length: whiteMax }, (_, i) => i + 1);
  for (let i = 0; i < 5; i++) {
    const j = i + randInt(whiteMax - i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, 5).sort((a, b) => a - b);
}

function isArithmetic(sorted: number[]): boolean {
  const d = sorted[1] - sorted[0];
  if (d <= 0) return false;
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] !== d) return false;
  }
  return true;
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

function isExactMultiples(sorted: number[]): boolean {
  const d = sorted[0];
  if (d < 1) return false;
  return sorted.every((n, i) => n === d * (i + 1));
}

function isGeometric(sorted: number[]): boolean {
  if (sorted[0] < 1) return false;
  const ratio = sorted[1] / sorted[0];
  if (!Number.isInteger(ratio) || ratio < 2) return false;
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] * ratio) return false;
  }
  return true;
}

function rowOf(n: number): number {
  return Math.floor((n - 1) / 10);
}

function colOf(n: number): number {
  return (n - 1) % 10;
}

function isVisualLine(whites: number[]): boolean {
  const rows = whites.map(rowOf);
  const cols = whites.map(colOf);
  if (rows.every((r) => r === rows[0])) return true;
  if (cols.every((c) => c === cols[0])) return true;
  const diagDown = rows.map((r, i) => r - cols[i]);
  const diagUp = rows.map((r, i) => r + cols[i]);
  return (
    diagDown.every((v) => v === diagDown[0]) ||
    diagUp.every((v) => v === diagUp[0])
  );
}

export function rejectReasons(
  whites: number[],
  filters: Filters,
  past: Set<string>,
  avoid: Set<number> = new Set(),
): string[] {
  const reasons: string[] = [];
  if (filters.birthday && whites.every((n) => n <= 31)) reasons.push("birthday");
  if (filters.sequence && (isArithmetic(whites) || longestConsecutive(whites) >= 4)) {
    reasons.push("sequence");
  }
  if (filters.multiples && (isExactMultiples(whites) || isGeometric(whites))) {
    reasons.push("multiples");
  }
  if (filters.previous && past.has(comboKey(whites))) reasons.push("previous");
  if (filters.visual && isVisualLine(whites)) reasons.push("visual");
  if (avoid.size > 0 && whites.some((n) => avoid.has(n))) reasons.push("temperature");
  return reasons;
}

export function generateTickets(
  spec: GameSpec,
  count: number,
  filters: Filters,
  past: Set<string>,
  exclude: Set<string> = new Set(),
  avoid: Set<number> = new Set(),
  takenWhites: Set<number> = new Set(),
): { tickets: Ticket[]; attempts: number; rejected: number } {
  const tickets: Ticket[] = [];
  const used = new Set(exclude);
  const usedWhites = filters.uniqueSlip ? new Set(takenWhites) : new Set<number>();
  let attempts = 0;
  let rejected = 0;
  const maxAttempts = 20_000;

  while (tickets.length < count && attempts < maxAttempts) {
    attempts += 1;
    const whites = sampleWhites(spec.whiteMax);
    const key = comboKey(whites);
    if (used.has(key)) {
      rejected += 1;
      continue;
    }
    if (filters.uniqueSlip && whites.some((n) => usedWhites.has(n))) {
      rejected += 1;
      continue;
    }
    if (rejectReasons(whites, filters, past, avoid).length > 0) {
      rejected += 1;
      continue;
    }
    used.add(key);
    if (filters.uniqueSlip) {
      for (const n of whites) usedWhites.add(n);
    }
    tickets.push({
      id: newId(),
      whites,
      extra: randInt(spec.extraMax) + 1,
    });
  }

  return { tickets, attempts, rejected };
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTicket(ticket: Ticket, extraLabel: string): string {
  return `${ticket.whites.map(pad2).join(" · ")}  +  ${extraLabel} ${pad2(ticket.extra)}`;
}
