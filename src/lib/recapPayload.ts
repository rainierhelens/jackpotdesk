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
  if (/lotto/i.test(label)) return 0;
  if (/hit\s*5/i.test(label)) return 1;
  if (/powerball/i.test(label)) return 2;
  if (/mega/i.test(label)) return 3;
  return 4;
}

/**
 * Per-game tweet. Official board plus last night #1–#3 overlap.
 * Same-odds lives on the /recap header, not here. No store or tonight's #1.
 */
export function deskLine(block: DeskLineBlock): string {
  const official = `${block.label} ${block.officialDate} · ${compactDeskBoard(block.officialWhites, block.officialExtra)}.`;
  const top = topRung(block);
  const rest = block.rungs.filter((rung) => rung !== top).slice(0, 2);
  const call = block.tone ? recapCallLabel(block.tone) : null;

  const one = top
    ? `Last night #1 ${overlapPhrase(block.label, block.officialWhites, block.officialExtra, top, true)}.`
    : "";

  const compose = (extras: string[], link: boolean) =>
    joinDesk(official, one, ...extras, link ? DESK_LINE_LINK : null);

  const extras: string[] = [];
  for (const rung of rest) {
    const full = `#${rung.rank} ${overlapPhrase(block.label, block.officialWhites, block.officialExtra, rung, true)}.`;
    const bare = `#${rung.rank} ${overlapPhrase(block.label, block.officialWhites, block.officialExtra, rung, false)}.`;
    const pick = [full, bare].find((variant) => deskFits(compose([...extras, variant], false)));
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
): { label: string; sentence: string } | null {
  const top = topRung(block);
  if (!top) return null;
  const of = overlapPhrase(
    block.label,
    block.officialWhites,
    block.officialExtra,
    top,
    withShared,
  );
  if (/lotto/i.test(block.label)) {
    const hits = sharedDeskWhites(block.officialWhites, top.whites).length;
    return {
      label: block.label,
      sentence: `Lotto is 6 whites, so last night's #1 was ${of}, not ${hits} of 5.`,
    };
  }
  return {
    label: block.label,
    sentence: `${block.label} was ${of}.`,
  };
}

function joinStrip(parts: string[], link: boolean): string {
  return joinDesk(...parts, link ? DESK_LINE_LINK : null);
}

/**
 * One tweet for every last-night game. Lotto leads so N of 6 is not N of 5.
 * Returns null when fewer than two games, or when it cannot stay ≤280.
 */
export function deskStrip(blocks: DeskLineBlock[]): string | null {
  const playable = [...blocks]
    .filter((block) => topRung(block))
    .sort((a, b) => deskOrder(a.label) - deskOrder(b.label));
  if (playable.length < 2) return null;

  const tryBuild = (withShared: boolean, link: boolean): string | null => {
    const parts = playable
      .map((block) => stripGame(block, withShared)?.sentence)
      .filter((part): part is string => Boolean(part));
    if (parts.length < 2) return null;
    const text = joinStrip(parts, link);
    return deskFits(text) ? text : null;
  };

  return (
    tryBuild(true, true) ??
    tryBuild(true, false) ??
    tryBuild(false, true) ??
    tryBuild(false, false)
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
