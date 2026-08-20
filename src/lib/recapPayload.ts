import {
  heatFill,
  heatInk,
  heatScale,
  type HeatCell,
} from "./lotteryHeat";

export type RecapTone = "no" | "entertain" | "rare";

export type RecapHeatCell = {
  n: number;
  count: number;
};

export type RecapHeat = {
  draws: number;
  whiteMax: number;
  extraMax: number;
  extraLabel: string | null;
  whites: RecapHeatCell[];
  extras: RecapHeatCell[];
};

export type RecapRung = {
  rank: number;
  board: string;
  whites: number[];
  extra: number | null;
  points: number;
  crowd: string | null;
  why: string;
  matchLine: string;
  extraHit: boolean | null;
};

export type RecapNational = {
  label: string;
  extraLabel: string;
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: RecapTone;
  officialDate: string;
  officialBoard: string;
  officialWhites: number[];
  officialExtra: number | null;
  historyBefore: number;
  heat: RecapHeat | null;
  rungs: RecapRung[];
  ladderHref: string;
};

export type RecapWashington = {
  label: string;
  extraLabel?: string | null;
  when: string;
  prizeLine: string;
  officialDate: string;
  officialBoard: string;
  officialWhites: number[];
  officialExtra: number | null;
  historyBefore: number;
  heat: RecapHeat | null;
  rungs: RecapRung[];
  ladderHref: string;
};

export type RecapPayload = {
  asOf: string;
  national: RecapNational[];
  washington: RecapWashington[];
  notes: string[];
};

export function recapToneClass(tone: RecapTone): string {
  if (tone === "rare") return "is-rare";
  if (tone === "entertain") return "is-entertain";
  return "is-skip";
}

export function recapCallLabel(tone: RecapTone): string {
  if (tone === "rare") return "RARE PLUS";
  if (tone === "entertain") return "ENTERTAIN ONLY";
  return "SKIP";
}

export function recapExtraClass(extraLabel: string | null | undefined): string {
  if (!extraLabel) return "";
  const key = extraLabel.toLowerCase();
  if (key.includes("power")) return "is-powerball";
  if (key.includes("mega")) return "is-megaball";
  return "is-extra";
}

export function padBall(n: number): string {
  return String(n).padStart(2, "0");
}

function asHeatCells(cells: RecapHeatCell[]): HeatCell[] {
  return cells.map((cell) => ({
    n: cell.n,
    count: cell.count,
    share: 0,
    lastDrawn: null,
    gapDays: 0,
    expected: 0,
    deviation: 0,
  }));
}

export function recapHeatPaint(cells: RecapHeatCell[]): {
  n: number;
  count: number;
  fill: string;
  ink: string;
}[] {
  const full = asHeatCells(cells);
  const { min, max } = heatScale(full, "frequency");
  return full.map((cell) => {
    const fill = heatFill(cell, "frequency", min, max);
    return { n: cell.n, count: cell.count, fill, ink: heatInk(fill) };
  });
}
