/**
 * Lottery Heat: windowed official-draw frequency for Desk.
 *
 * Builds on numberField (gaps + counts). Adds share, expected uniform
 * count, signed deviation, last-drawn date, and the special-ball row.
 * Descriptive of the past. Does not change hit odds.
 */
import type { GameSpec, Ticket } from "../types";
import { daysBetween, numberField } from "./frequency";
import { buildPatternModel, pairKey } from "./patternLab";
import { newId } from "./picks";
import type { OfficialDraw } from "./winners";
import type { WaDraw } from "./waDraws";
import type { WaGameSpec } from "./waGames";

export type HeatPreset = "all" | "50" | "100" | "500" | "custom";

export type HeatWindow = {
  preset: HeatPreset;
  from?: string;
  to?: string;
};

export type HeatCell = {
  n: number;
  count: number;
  share: number;
  lastDrawn: string | null;
  gapDays: number;
  expected: number;
  deviation: number;
};

export type HeatBook = {
  draws: number;
  extraDraws: number;
  since: string;
  asOf: string;
  whiteMax: number;
  extraMax: number;
  extraLabel: string;
  pick: number;
  whites: HeatCell[];
  extras: HeatCell[];
};

export type HeatColorMode = "frequency" | "deviation";

export type HeatViewId = "grid" | "pairs" | "draws";

export type HeatSpec = {
  label: string;
  whiteMax: number;
  extraMax: number;
  extraLabel: string;
  pick: number;
  ticketCost: number;
};

export type HeatPairCell = {
  a: number;
  b: number;
  count: number;
  expected: number;
};

export type HeatDrawRow = {
  date: string;
  whites: number[];
  extra: number | null;
};

const DEFAULT_PICK = 5;
export const HEAT_SHIFT_PANE = 50;

export function nationalHeatSpec(spec: GameSpec): HeatSpec {
  return {
    label: spec.label,
    whiteMax: spec.whiteMax,
    extraMax: spec.extraMax,
    extraLabel: spec.extraLabel,
    pick: DEFAULT_PICK,
    ticketCost: spec.ticketCost,
  };
}

export function waHeatSpec(spec: WaGameSpec): HeatSpec {
  return {
    label: spec.label,
    whiteMax: spec.whiteMax,
    extraMax: 0,
    extraLabel: "",
    pick: spec.whiteCount,
    ticketCost: spec.ticketCost,
  };
}

export function waToOfficial(rows: WaDraw[]): OfficialDraw[] {
  return rows.map((row) => ({
    date: row.date,
    whites: row.numbers,
    extra: 0,
  }));
}

function specOf(spec: GameSpec | HeatSpec): HeatSpec {
  if ("id" in spec) return nationalHeatSpec(spec);
  return spec;
}

export function sliceHeatDraws(
  draws: OfficialDraw[],
  window: HeatWindow,
): OfficialDraw[] {
  if (draws.length === 0) return [];
  if (window.preset === "all") return draws;
  if (window.preset === "50") return draws.slice(0, 50);
  if (window.preset === "100") return draws.slice(0, 100);
  if (window.preset === "500") return draws.slice(0, 500);
  const from = window.from;
  const to = window.to;
  return draws.filter((draw) => {
    if (from && draw.date < from) return false;
    if (to && draw.date > to) return false;
    return true;
  });
}

/** Newest-first. shift 0 = oldest pane, shift max = newest pane. */
export function sliceShiftDraws(
  draws: OfficialDraw[],
  pane = HEAT_SHIFT_PANE,
  shift = 0,
): OfficialDraw[] {
  const size = Math.min(Math.max(1, pane), draws.length);
  const maxShift = Math.max(0, draws.length - size);
  const t = Math.max(0, Math.min(maxShift, shift));
  const offset = maxShift - t;
  return draws.slice(offset, offset + size);
}

export function shiftMax(draws: OfficialDraw[], pane = HEAT_SHIFT_PANE): number {
  return Math.max(0, draws.length - Math.min(Math.max(1, pane), draws.length));
}

function lastSeenDates(
  draws: OfficialDraw[],
  max: number,
  pick: (draw: OfficialDraw) => number[],
): (string | null)[] {
  const last = new Array<string | null>(max + 1).fill(null);
  for (const draw of draws) {
    for (const n of pick(draw)) {
      if (n < 1 || n > max) continue;
      if (last[n] === null) last[n] = draw.date;
    }
  }
  return last;
}

function cellsFromField(
  counts: number[],
  lastDrawn: (string | null)[],
  max: number,
  asOf: string,
  oldest: string,
  expected: number,
  draws: number,
): HeatCell[] {
  const out: HeatCell[] = [];
  for (let n = 1; n <= max; n++) {
    const count = counts[n] ?? 0;
    const seen = lastDrawn[n];
    const gapDays = seen
      ? daysBetween(seen, asOf)
      : daysBetween(oldest, asOf) + 1;
    out.push({
      n,
      count,
      share: draws > 0 ? count / draws : 0,
      lastDrawn: seen,
      gapDays,
      expected,
      deviation: count - expected,
    });
  }
  return out;
}

/** Windowed frequency book. Null when the slice is empty. */
export function heatBook(
  draws: OfficialDraw[],
  spec: GameSpec | HeatSpec,
  window: HeatWindow,
): HeatBook | null {
  return heatBookFromDraws(sliceHeatDraws(draws, window), spec);
}

export function heatBookFromDraws(
  sliced: OfficialDraw[],
  spec: GameSpec | HeatSpec,
): HeatBook | null {
  const heat = specOf(spec);
  const field = numberField(sliced, heat.whiteMax);
  if (!field || sliced.length === 0) return null;

  const asOf = sliced[0].date;
  const oldest = sliced[sliced.length - 1].date;
  const nDraws = sliced.length;
  const expectedWhite = (nDraws * heat.pick) / heat.whiteMax;

  const whiteLast = lastSeenDates(sliced, heat.whiteMax, (d) => d.whites);
  const whiteCounts = new Array<number>(heat.whiteMax + 1).fill(0);
  for (const cell of field.cells) whiteCounts[cell.n] = cell.freq;

  const extraCounts = new Array<number>(heat.extraMax + 1).fill(0);
  const extraLast = new Array<string | null>(heat.extraMax + 1).fill(null);
  let extraDraws = 0;
  if (heat.extraMax > 0) {
    for (const draw of sliced) {
      if (draw.extra < 1 || draw.extra > heat.extraMax) continue;
      extraDraws += 1;
      extraCounts[draw.extra] += 1;
      if (extraLast[draw.extra] === null) extraLast[draw.extra] = draw.date;
    }
  }
  const expectedExtra = extraDraws > 0 ? extraDraws / heat.extraMax : 0;

  return {
    draws: nDraws,
    extraDraws,
    since: oldest,
    asOf,
    whiteMax: heat.whiteMax,
    extraMax: heat.extraMax,
    extraLabel: heat.extraLabel,
    pick: heat.pick,
    whites: cellsFromField(
      whiteCounts,
      whiteLast,
      heat.whiteMax,
      asOf,
      oldest,
      expectedWhite,
      nDraws,
    ),
    extras:
      heat.extraMax > 0
        ? cellsFromField(
            extraCounts,
            extraLast,
            heat.extraMax,
            asOf,
            oldest,
            expectedExtra,
            extraDraws,
          )
        : [],
  };
}

export function heatPairs(
  draws: OfficialDraw[],
  spec: GameSpec | HeatSpec,
): { expected: number; cells: HeatPairCell[] } | null {
  const heat = specOf(spec);
  const model = buildPatternModel(
    draws.map((draw) => ({ numbers: draw.whites, extra: draw.extra })),
    heat.whiteMax,
    heat.extraMax > 0 ? heat.extraMax : null,
  );
  if (!model) return null;
  const cells: HeatPairCell[] = [];
  for (let a = 1; a <= heat.whiteMax; a++) {
    for (let b = a + 1; b <= heat.whiteMax; b++) {
      cells.push({
        a,
        b,
        count: model.pairs.get(pairKey(a, b)) ?? 0,
        expected: model.pairExpected,
      });
    }
  }
  return { expected: model.pairExpected, cells };
}

export function heatDrawRows(
  draws: OfficialDraw[],
  limit = 40,
): HeatDrawRow[] {
  return draws.slice(0, limit).map((draw) => ({
    date: draw.date,
    whites: draw.whites,
    extra: draw.extra > 0 ? draw.extra : null,
  }));
}

function heatValue(cell: HeatCell, mode: HeatColorMode): number {
  return mode === "frequency" ? cell.count : cell.deviation;
}

export function heatScale(
  cells: HeatCell[],
  mode: HeatColorMode,
): { min: number; max: number } {
  if (cells.length === 0) return { min: 0, max: 1 };
  let min = heatValue(cells[0], mode);
  let max = min;
  for (const cell of cells) {
    const v = heatValue(cell, mode);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (mode === "deviation") {
    const span = Math.max(Math.abs(min), Math.abs(max), 0.01);
    return { min: -span, max: span };
  }
  if (min === max) return { min, max: min + 1 };
  return { min, max };
}

function mixChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixRgb(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): string {
  const x = Math.max(0, Math.min(1, t));
  return `rgb(${mixChannel(from[0], to[0], x)} ${mixChannel(from[1], to[1], x)} ${mixChannel(from[2], to[2], x)})`;
}

const HEAT_BLACK: [number, number, number] = [9, 9, 11];
const HEAT_FOREST: [number, number, number] = [5, 46, 22];
const HEAT_GREEN: [number, number, number] = [0, 199, 88];
const HEAT_BRIGHT: [number, number, number] = [5, 223, 114];

export function heatNorm(
  cell: HeatCell,
  mode: HeatColorMode,
  min: number,
  max: number,
): number {
  if (mode === "frequency") {
    return max === min ? 0 : (cell.count - min) / (max - min);
  }
  const span = Math.max(Math.abs(min), Math.abs(max), 0.01);
  return (Math.max(-1, Math.min(1, cell.deviation / span)) + 1) / 2;
}

/** Sequential black → forest → green → bright. Hot cells pop like a poster scale. */
export function heatRamp(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0.4) return mixRgb(HEAT_BLACK, HEAT_FOREST, x / 0.4);
  if (x <= 0.75) return mixRgb(HEAT_FOREST, HEAT_GREEN, (x - 0.4) / 0.35);
  return mixRgb(HEAT_GREEN, HEAT_BRIGHT, (x - 0.75) / 0.25);
}

export function heatFill(
  cell: HeatCell,
  mode: HeatColorMode,
  min: number,
  max: number,
): string {
  return heatRamp(heatNorm(cell, mode, min, max));
}

function inkOn(fill: string): string {
  const m = fill.match(/rgb\((\d+) (\d+) (\d+)\)/);
  if (!m) return "var(--ink)";
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 150 ? "#09090b" : "#fafafa";
}

export function heatInk(fill: string): string {
  return inkOn(fill);
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

/** Weighted sample without replacement. Weight floor 1 so every number can land. */
export function sampleWeighted(weights: number[], k: number): number[] {
  const pool = weights.map((w, i) => ({ n: i + 1, w: Math.max(1, w) }));
  const take = Math.min(k, pool.length);
  const picked: number[] = [];
  for (let i = 0; i < take; i++) {
    let total = 0;
    for (const row of pool) total += row.w;
    let dart = randInt(total);
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      dart -= pool[j].w;
      if (dart < 0) {
        idx = j;
        break;
      }
    }
    picked.push(pool[idx].n);
    pool.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

export function mintUniform(spec: GameSpec | HeatSpec): Ticket {
  const heat = specOf(spec);
  const pool = Array.from({ length: heat.whiteMax }, (_, i) => i + 1);
  const whites: number[] = [];
  for (let i = 0; i < heat.pick; i++) {
    const j = randInt(pool.length);
    whites.push(pool[j]);
    pool.splice(j, 1);
  }
  whites.sort((a, b) => a - b);
  return {
    id: newId(),
    whites,
    extra: heat.extraMax > 0 ? randInt(heat.extraMax) + 1 : 0,
  };
}

export function mintFromHeat(spec: GameSpec | HeatSpec, book: HeatBook): Ticket {
  const heat = specOf(spec);
  const whites = sampleWeighted(
    book.whites.map((cell) => cell.count + 1),
    heat.pick,
  );
  const extraPick =
    book.extras.length > 0
      ? sampleWeighted(
          book.extras.map((cell) => cell.count + 1),
          1,
        )[0]
      : 0;
  return {
    id: newId(),
    whites,
    extra: extraPick ?? (heat.extraMax > 0 ? randInt(heat.extraMax) + 1 : 0),
  };
}

export function ticketFromTray(
  whites: number[],
  extra: number | null,
  pick = DEFAULT_PICK,
  requireExtra = true,
): Ticket | null {
  if (whites.length !== pick) return null;
  if (requireExtra && extra == null) return null;
  return {
    id: newId(),
    whites: [...whites].sort((a, b) => a - b),
    extra: extra ?? 0,
  };
}
