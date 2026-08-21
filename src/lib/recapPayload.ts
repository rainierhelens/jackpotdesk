import {
  heatFill,
  heatInk,
  heatScale,
  type HeatCell,
} from "./lotteryHeat";
import { deskPayPhrase } from "./deskPrize";

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
  officialStore?: string | null;
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
  officialStore?: string | null;
  cashpot?: number | null;
  advertised?: string | number | null;
  cash?: string | number | null;
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

export const DESK_LINE_MAX = 280;
export const DESK_LINE_LEAD = "Same hit odds as Quick Pick.";
export const DESK_LINE_LINK = "jackpotdesk.com/recap";

export type DeskLineBlock = {
  id?: string | null;
  label: string;
  officialDate: string;
  officialWhites: number[];
  officialExtra: number | null;
  rungs: Array<{
    rank: number;
    whites: number[];
    extra: number | null;
    extraHit?: boolean | null;
  }>;
  tone?: RecapTone | null;
  cashpot?: number | null;
  advertised?: string | number | null;
  cash?: string | number | null;
  /** Ignored. Desk line never prints a store, city, or winner name. */
  officialStore?: string | null;
};

export function compactDeskBoard(
  whites: number[],
  extra: number | null,
): string {
  const nums = whites.map(padBall).join(" ");
  return extra == null ? nums : `${nums} + ${padBall(extra)}`;
}

export function sharedDeskWhites(
  official: number[],
  board: number[],
): number[] {
  const held = new Set(board);
  return official.filter((n) => held.has(n));
}

function extraHitOn(
  officialExtra: number | null,
  rung: DeskLineBlock["rungs"][number],
): boolean {
  if (rung.extraHit === true) return true;
  if (rung.extraHit === false) return false;
  return (
    officialExtra != null && rung.extra != null && rung.extra === officialExtra
  );
}

function sharedNums(
  official: number[],
  officialExtra: number | null,
  rung: DeskLineBlock["rungs"][number],
): string {
  const whites = sharedDeskWhites(official, rung.whites);
  const extraHit = extraHitOn(officialExtra, rung);
  const nums = whites.map(padBall).join(" ");
  if (extraHit && officialExtra != null) {
    return nums ? `${nums} + ${padBall(officialExtra)}` : `+ ${padBall(officialExtra)}`;
  }
  return nums;
}

/** Lotto is 6 numbers. Hit 5 / Powerball / Mega Millions are 5. */
export function deskOfTotal(label: string, official: number[]): number {
  if (/lotto/i.test(label)) return 6;
  if (/hit\s*5|powerball|mega\s*millions/i.test(label)) return 5;
  return official.length || 5;
}

function ofPhrase(
  label: string,
  official: number[],
  rung: DeskLineBlock["rungs"][number],
): string {
  const hits = sharedDeskWhites(official, rung.whites).length;
  return `${hits} of ${deskOfTotal(label, official)}`;
}

function overlapPhrase(
  label: string,
  official: number[],
  officialExtra: number | null,
  rung: DeskLineBlock["rungs"][number],
  withShared: boolean,
): string {
  const of = ofPhrase(label, official, rung);
  if (!withShared) return of;
  const shared = sharedNums(official, officialExtra, rung);
  return shared ? `${of} (${shared})` : of;
}

function payBit(
  block: DeskLineBlock,
  rung: DeskLineBlock["rungs"][number],
  style: "full" | "short",
): string {
  return deskPayPhrase(block, rung, style);
}

function scoredBit(
  block: DeskLineBlock,
  rung: DeskLineBlock["rungs"][number],
  opts: { shared: boolean; pay: "full" | "short" | "none" },
): string {
  const overlap = overlapPhrase(
    block.label,
    block.officialWhites,
    block.officialExtra,
    rung,
    opts.shared,
  );
  if (opts.pay === "none") return overlap;
  return `${overlap} · ${payBit(block, rung, opts.pay)}`;
}

function joinDesk(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
}

function deskFits(text: string): boolean {
  return text.length <= DESK_LINE_MAX && !text.includes("\u2014");
}

function topRung(block: DeskLineBlock) {
  return block.rungs.find((rung) => rung.rank === 1) ?? block.rungs[0] ?? null;
}

function deskOrder(label: string): number {
  if (/hit\s*5/i.test(label)) return 0;
  if (/powerball/i.test(label)) return 1;
  if (/lotto/i.test(label)) return 2;
  if (/mega/i.test(label)) return 3;
  return 4;
}

function stripName(label: string): string {
  if (/powerball/i.test(label)) return "PB";
  if (/mega/i.test(label)) return "MM";
  return label;
}

/**
 * Per-game tweet. Official board, last night #1–#3 overlap, prize-if-played.
 * Same-odds lives on the /recap header, not here. No store or tonight's #1.
 */
export function deskLine(block: DeskLineBlock): string {
  const official = `${block.label} ${block.officialDate} · ${compactDeskBoard(block.officialWhites, block.officialExtra)}.`;
  const top = topRung(block);
  const rest = block.rungs.filter((rung) => rung !== top).slice(0, 2);
  const call = block.tone ? recapCallLabel(block.tone) : null;

  const one = top
    ? `Last night #1 ${scoredBit(block, top, { shared: true, pay: "full" })}.`
    : "";

  const compose = (extras: string[], link: boolean) =>
    joinDesk(official, one, ...extras, link ? DESK_LINE_LINK : null);

  const extras: string[] = [];
  for (const rung of rest) {
    const variants = [
      `#${rung.rank} ${scoredBit(block, rung, { shared: true, pay: "full" })}.`,
      `#${rung.rank} ${scoredBit(block, rung, { shared: false, pay: "short" })}.`,
      `#${rung.rank} ${payBit(block, rung, "short")}.`,
    ];
    const pick = variants.find((variant) =>
      deskFits(compose([...extras, variant], false)),
    );
    if (pick) extras.push(pick);
  }
  if (call && deskFits(compose([...extras, `${call}.`], false))) {
    extras.push(`${call}.`);
  }

  const withLink = compose(extras, true);
  return deskFits(withLink) ? withLink : compose(extras, false);
}

function stripGame(
  block: DeskLineBlock,
  withShared: boolean,
  withPay: boolean,
): string | null {
  const top = topRung(block);
  if (!top) return null;
  const overlap = overlapPhrase(
    block.label,
    block.officialWhites,
    block.officialExtra,
    top,
    withShared,
  );
  const name = stripName(block.label);
  if (!withPay) return `${name} ${overlap}.`;
  return `${name} ${overlap} · ${payBit(block, top, "full")}.`;
}

function allTopZero(blocks: DeskLineBlock[]): boolean {
  return blocks.every((block) => {
    const top = topRung(block);
    return top ? deskPayPhrase(block, top, "short") === "$0" : true;
  });
}

/**
 * One tweet for every last-night game. Returns null when fewer than two
 * games, or when it cannot stay ≤280.
 */
export function deskStrip(blocks: DeskLineBlock[]): string | null {
  const playable = [...blocks]
    .filter((block) => topRung(block))
    .sort((a, b) => deskOrder(a.label) - deskOrder(b.label));
  if (playable.length < 2) return null;

  const zeros = allTopZero(playable);
  const tryBuild = (
    withShared: boolean,
    withPay: boolean,
    link: boolean,
  ): string | null => {
    const games = playable
      .map((block) => stripGame(block, withShared, withPay && !zeros))
      .filter((part): part is string => Boolean(part));
    if (games.length < 2) return null;
    const lead = zeros
      ? "Last night #1 paid $0 across the board."
      : "Last night #1.";
    const text = joinDesk(lead, ...games, link ? DESK_LINE_LINK : null);
    return deskFits(text) ? text : null;
  };

  return (
    tryBuild(true, true, true) ??
    tryBuild(true, true, false) ??
    tryBuild(true, false, true) ??
    tryBuild(false, true, false) ??
    tryBuild(false, false, false)
  );
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
