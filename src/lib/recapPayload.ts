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
  /**
   * Selling store or claimed prize named by an official Washington's Lottery
   * source (press or winners search) for this exact draw. Omit when none.
   */
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
  /**
   * Selling store or claimed prize named by an official Washington's Lottery
   * source (press or winners search) for this exact draw. Omit when none.
   */
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
  /**
   * Official Washington's Lottery named store or claimed prize for this draw.
   * Never invent. Do not pass unofficial blogs.
   */
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

/** Format a store only when an official WA Lottery source already named it. */
export function officialStoreNote(
  store:
    | string
    | { name?: string | null; city?: string | null }
    | null
    | undefined,
): string | null {
  if (!store) return null;
  if (typeof store === "string") {
    const line = store.trim();
    return line || null;
  }
  const name = store.name?.trim();
  if (!name) return null;
  const city = store.city?.trim();
  return city ? `${name}, ${city}` : name;
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

function sharedPhrase(
  official: number[],
  officialExtra: number | null,
  rung: DeskLineBlock["rungs"][number],
): string | null {
  const whites = sharedDeskWhites(official, rung.whites);
  const extraHit = extraHitOn(officialExtra, rung);
  if (!whites.length && !extraHit) return null;
  const nums = whites.map(padBall).join(" ");
  if (extraHit && officialExtra != null) {
    return nums
      ? `shared ${nums} + ${padBall(officialExtra)}`
      : `shared + ${padBall(officialExtra)}`;
  }
  return `shared ${nums}`;
}

function ofPhrase(
  official: number[],
  rung: DeskLineBlock["rungs"][number],
): string {
  const total = official.length || rung.whites.length;
  const hits = sharedDeskWhites(official, rung.whites).length;
  return `${hits} of ${total}`;
}

function scoreBits(
  official: number[],
  officialExtra: number | null,
  rung: DeskLineBlock["rungs"][number],
  opts: { board: boolean; shared: boolean },
): string {
  const bits: string[] = [];
  if (opts.board) bits.push(compactDeskBoard(rung.whites, rung.extra));
  if (opts.shared) {
    const shared = sharedPhrase(official, officialExtra, rung);
    if (shared) bits.push(shared);
  }
  bits.push(ofPhrase(official, rung));
  return bits.join(" · ");
}

function joinDesk(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
}

function deskFits(text: string): boolean {
  return text.length <= DESK_LINE_MAX && !text.includes("\u2014");
}

function withPeriod(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Tweet-length night-desk recap. Last official vs last night's Ladder.
 * Does not print tonight's #1. Winner / store only when officialStore is set.
 */
export function deskLine(block: DeskLineBlock): string {
  const official = `${block.label} ${block.officialDate} · ${compactDeskBoard(block.officialWhites, block.officialExtra)}.`;
  const top =
    block.rungs.find((rung) => rung.rank === 1) ?? block.rungs[0] ?? null;
  const rest = block.rungs.filter((rung) => rung !== top).slice(0, 2);
  const call = block.tone ? recapCallLabel(block.tone) : null;
  const store = officialStoreNote(block.officialStore);

  const oneVariants = top
    ? [
        `Last night #1 ${scoreBits(block.officialWhites, block.officialExtra, top, { board: true, shared: true })}.`,
        `Last night #1 ${scoreBits(block.officialWhites, block.officialExtra, top, { board: true, shared: false })}.`,
        `Last night #1 ${scoreBits(block.officialWhites, block.officialExtra, top, { board: false, shared: true })}.`,
        `Last night #1 ${scoreBits(block.officialWhites, block.officialExtra, top, { board: false, shared: false })}.`,
      ]
    : [];

  const one =
    oneVariants.find((variant) =>
      deskFits(joinDesk(DESK_LINE_LEAD, official, variant, DESK_LINE_LINK)),
    ) ??
    oneVariants[oneVariants.length - 1] ??
    "";

  const compose = (extras: string[]) =>
    joinDesk(DESK_LINE_LEAD, official, one, ...extras, DESK_LINE_LINK);

  const extras: string[] = [];
  if (call && deskFits(compose([...extras, `${call}.`]))) {
    extras.push(`${call}.`);
  }

  for (const rung of rest) {
    const variants = [
      `#${rung.rank} ${scoreBits(block.officialWhites, block.officialExtra, rung, { board: true, shared: true })}.`,
      `#${rung.rank} ${scoreBits(block.officialWhites, block.officialExtra, rung, { board: true, shared: false })}.`,
      `#${rung.rank} ${scoreBits(block.officialWhites, block.officialExtra, rung, { board: false, shared: true })}.`,
      `#${rung.rank} ${scoreBits(block.officialWhites, block.officialExtra, rung, { board: false, shared: false })}.`,
    ];
    const pick = variants.find((variant) =>
      deskFits(compose([...extras, variant])),
    );
    if (pick) extras.push(pick);
  }

  if (store) {
    const note = withPeriod(store);
    if (deskFits(compose([...extras, note]))) extras.push(note);
  }

  return compose(extras);
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
