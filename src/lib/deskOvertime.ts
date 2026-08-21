import { parseMoney } from "./ev";
import {
  deskGameId,
  deskPay,
  formatDeskCash,
  type DeskGameId,
  type DeskPaySource,
  type DeskPayRung,
} from "./deskPrize";

export const OVERTIME_RANKS = [1, 2, 3] as const;
export const OVERTIME_GAMES: DeskGameId[] = [
  "hit5",
  "powerball",
  "lotto",
  "megamillions",
];

export const OVERTIME_NOTE =
  "Entertainment, not a forecast. Official prize tables only. $0 stays $0.";
export const FREE_PLAY_LABEL = "free play counted at $1";
export const JACKPOT_UNKNOWN = "jackpot, cash unknown";
export const OVERTIME_FILLING = "window still filling";
export const OVERTIME_VS = "Ladder vs the house";
export const OVERTIME_WINDOW_TARGETS = {
  days7: 7,
  month: 30,
  quarter: 90,
} as const;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const PT = "America/Los_Angeles";

export type OvertimeRung = DeskPayRung & { rank: number };

export type OvertimeBlock = DeskPaySource & {
  officialDate?: string | null;
  rungs: OvertimeRung[];
};

export type OvertimeDay = {
  asOf: string;
  national: OvertimeBlock[];
  washington: OvertimeBlock[];
};

export type OvertimeWindowId = "days7" | "month" | "quarter";

export type OvertimeWindowRange = {
  id: OvertimeWindowId;
  label: string;
  from: string;
  to: string;
  target: number;
};

export type OvertimeFlags = {
  anyRevenue: boolean;
  beatHouse: boolean;
  jackpotUnknown: boolean;
};

export type OvertimeScore = {
  /** paid − spent when cash is known. Null when a jackpot has no cash figure. */
  net: number | null;
  /** Signed sports score, or `jackpot, cash unknown`. */
  score: string;
};

export type OvertimeGameRow = OvertimeFlags &
  OvertimeScore & {
    game: DeskGameId;
    label: string;
    boards: number;
    spent: number;
    paid: number;
    credit: number;
    freePlays: number;
    base: boolean;
    line: string;
  };

export type OvertimeNight = OvertimeFlags &
  OvertimeScore & {
    asOf: string;
    games: OvertimeGameRow[];
    spent: number;
    paid: number;
    credit: number;
    headline: string;
    nightLine: string;
  };

export type OvertimeBoard = OvertimeFlags &
  OvertimeScore & {
    mornings: number;
    lastNight: OvertimeNight | null;
    games: OvertimeGameRow[];
    spent: number;
    paid: number;
    credit: number;
    headline: string;
    acrossLine: string;
    revenueWatch: string;
    houseWatch: string;
  };

export type OvertimeWindow = OvertimeBoard & OvertimeWindowRange & {
  filling: boolean;
};

export type OvertimeDesk = {
  lastNight: OvertimeNight | null;
  windows: OvertimeWindow[];
  all: OvertimeBoard;
};

export function overtimeGameLabel(game: DeskGameId): string {
  if (game === "hit5") return "Hit 5";
  if (game === "powerball") return "Powerball";
  if (game === "lotto") return "Lotto";
  return "Mega Millions";
}

/** Official WA / multi-state slip cost for Ladder #1–#3. Do not invent. */
export function deskSlipCost(game: DeskGameId, boards: number): number {
  const n = Math.max(0, Math.floor(boards));
  if (n === 0) return 0;
  if (game === "hit5") return n;
  if (game === "lotto") return Math.ceil(n / 2);
  if (game === "powerball") return n * 2;
  return n * 5;
}

/**
 * Cash already on the recap block. Never advertised annuity. Never invent.
 */
export function recapJackpotCash(source: DeskPaySource): number | null {
  const game = deskGameId(source);
  if (game === "hit5") {
    return typeof source.cashpot === "number" && source.cashpot > 0
      ? source.cashpot
      : null;
  }
  if (typeof source.cash === "number" && source.cash > 0) return source.cash;
  if (typeof source.cash === "string" && source.cash.trim()) {
    const amount = parseMoney(source.cash);
    return amount > 0 ? amount : null;
  }
  return null;
}

export function overtimeRungs(rungs: OvertimeRung[]): OvertimeRung[] {
  return rungs
    .filter((rung) => OVERTIME_RANKS.includes(rung.rank as 1 | 2 | 3))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, OVERTIME_RANKS.length);
}

/** Lead number: paid − spent. Do not invent a net when a jackpot has no cash. */
export function overtimeNet(
  paid: number,
  spent: number,
  jackpotUnknown: boolean,
): number | null {
  if (jackpotUnknown) return null;
  return paid - spent;
}

export function formatOvertimeNet(net: number): string {
  if (net > 0) return `+${formatDeskCash(net)}`;
  if (net < 0) return `-${formatDeskCash(Math.abs(net))}`;
  return formatDeskCash(0);
}

export function overtimeScore(
  paid: number,
  spent: number,
  jackpotUnknown: boolean,
): OvertimeScore {
  const net = overtimeNet(paid, spent, jackpotUnknown);
  return {
    net,
    score: net == null ? JACKPOT_UNKNOWN : formatOvertimeNet(net),
  };
}

export function overtimeHeadline(score: OvertimeScore): string {
  return `${OVERTIME_VS} · ${score.score}`;
}

export function overtimeNetClass(score: OvertimeScore): string {
  if (score.net == null) return "is-unknown";
  if (score.net > 0) return "is-ahead";
  if (score.net < 0) return "is-house";
  return "is-cash";
}

function paidBit(paid: number, base: boolean): string {
  const cash = formatDeskCash(paid);
  return base && paid > 0 ? `paid base ${cash}` : `paid ${cash}`;
}

function gameTails(row: {
  freePlays: number;
}): string[] {
  const tails: string[] = [];
  if (row.freePlays > 0) tails.push(FREE_PLAY_LABEL);
  return tails;
}

export function overtimeGameLine(row: Omit<OvertimeGameRow, "line">): string {
  const boards = row.boards === 1 ? "1 board" : `${row.boards} boards`;
  return [
    row.label,
    boards,
    `spent ${formatDeskCash(row.spent)}`,
    paidBit(row.paid, row.base),
    ...gameTails(row),
    row.score,
  ].join(" · ");
}

export function isRecapIso(iso: string | null | undefined): iso is string {
  return Boolean(iso && ISO_DAY.test(iso));
}

/** Recap mornings are YYYY-MM-DD already on the PT calendar. No UTC "today". */
export function overtimeDayIso(day: OvertimeDay): string {
  if (isRecapIso(day.asOf)) return day.asOf;
  const official = [...day.national, ...day.washington]
    .map((block) => ("officialDate" in block ? String(block.officialDate ?? "") : ""))
    .filter(isRecapIso)
    .sort();
  return official[official.length - 1] ?? "";
}

export function shiftRecapIso(iso: string, days: number): string {
  const match = iso.match(ISO_DAY);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function recapPtLabel(
  iso: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const match = iso.match(ISO_DAY);
  if (!match) return iso;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 20),
  );
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: PT,
  }).format(date);
}

export function recapMonthLabel(iso: string): string {
  return recapPtLabel(iso, { month: "long", year: "numeric" });
}

export function recapQuarterLabel(iso: string): string {
  const match = iso.match(ISO_DAY);
  if (!match) return iso;
  const month = Number(match[2]);
  const year = match[1];
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

export function recapMonthStart(iso: string): string {
  const match = iso.match(ISO_DAY);
  if (!match) return iso;
  return `${match[1]}-${match[2]}-01`;
}

export function recapQuarterStart(iso: string): string {
  const match = iso.match(ISO_DAY);
  if (!match) return iso;
  const month = Number(match[2]);
  const start = String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0");
  return `${match[1]}-${start}-01`;
}

export function overtimeWindowRange(
  id: OvertimeWindowId,
  anchor: string,
): OvertimeWindowRange {
  if (id === "days7") {
    return {
      id,
      label: "Last 7 days",
      from: shiftRecapIso(anchor, 1 - OVERTIME_WINDOW_TARGETS.days7),
      to: anchor,
      target: OVERTIME_WINDOW_TARGETS.days7,
    };
  }
  if (id === "month") {
    return {
      id,
      label: recapMonthLabel(anchor),
      from: recapMonthStart(anchor),
      to: anchor,
      target: OVERTIME_WINDOW_TARGETS.month,
    };
  }
  return {
    id,
    label: recapQuarterLabel(anchor),
    from: recapQuarterStart(anchor),
    to: anchor,
    target: OVERTIME_WINDOW_TARGETS.quarter,
  };
}

export function inOvertimeWindow(iso: string, range: OvertimeWindowRange): boolean {
  return isRecapIso(iso) && iso >= range.from && iso <= range.to;
}

export function overtimeAcrossLine(board: {
  mornings: number;
  spent: number;
  paid: number;
  label?: string;
  target?: number;
  filling?: boolean;
}): string {
  const count =
    board.target && board.filling
      ? `${board.mornings} of ${board.target} mornings`
      : board.mornings === 1
        ? "1 morning"
        : `${board.mornings} mornings`;
  const parts = [
    board.label ?? "Overtime",
    count,
    `spent ${formatDeskCash(board.spent)}`,
    `paid ${formatDeskCash(board.paid)}`,
  ];
  if (board.filling) parts.push(OVERTIME_FILLING);
  return parts.join(" · ");
}

export function overtimeNightRead(nightLine: string, heading: string): string {
  if (!heading) return nightLine;
  return nightLine.replace(/^Last night/, `Last night · ${heading}`);
}

export function overtimeWatchClass(text: string): string {
  if (text === "ahead of the house") return "is-ahead";
  if (text === "cash on the board") return "is-cash";
  if (text === JACKPOT_UNKNOWN) return "is-unknown";
  return "is-house";
}

export function overtimeNightLine(night: {
  spent: number;
  paid: number;
  score: string;
}): string {
  return [
    "Last night",
    `spent ${formatDeskCash(night.spent)}`,
    `paid ${formatDeskCash(night.paid)}`,
    night.score,
  ].join(" · ");
}

export function overtimeRevenueWatch(flags: OvertimeFlags): string {
  if (flags.anyRevenue) return "cash on the board";
  if (flags.jackpotUnknown) return JACKPOT_UNKNOWN;
  return "no cash yet";
}

export function overtimeHouseWatch(flags: OvertimeFlags): string {
  if (flags.beatHouse) return "ahead of the house";
  if (flags.jackpotUnknown) return JACKPOT_UNKNOWN;
  return "house";
}

function flagsFor(paid: number, credit: number, spent: number, jackpotUnknown: boolean): OvertimeFlags {
  return {
    anyRevenue: paid > 0,
    beatHouse: spent > 0 && paid + credit >= spent,
    jackpotUnknown,
  };
}

function scoreBlock(block: OvertimeBlock): OvertimeGameRow | null {
  const game = deskGameId(block);
  if (!game || !OVERTIME_GAMES.includes(game)) return null;
  const rungs = overtimeRungs(block.rungs);
  if (!rungs.length) return null;

  let paid = 0;
  let basePaid = 0;
  let credit = 0;
  let freePlays = 0;
  let jackpotUnknown = false;

  for (const rung of rungs) {
    const pay = deskPay(block, rung);
    if (pay.kind === "zero") continue;
    if (pay.kind === "free-play") {
      freePlays += 1;
      credit += 1;
      continue;
    }
    if (pay.kind === "jackpot") {
      const pot = recapJackpotCash(block);
      if (pot == null) jackpotUnknown = true;
      else paid += pot;
      continue;
    }
    const amount = pay.amount ?? 0;
    if (amount <= 0) continue;
    paid += amount;
    if (pay.base) basePaid += amount;
  }

  const spent = deskSlipCost(game, rungs.length);
  const flags = flagsFor(paid, credit, spent, jackpotUnknown);
  const score = overtimeScore(paid, spent, jackpotUnknown);
  const row = {
    game,
    label: overtimeGameLabel(game),
    boards: rungs.length,
    spent,
    paid,
    credit,
    freePlays,
    base: paid > 0 && basePaid === paid,
    ...flags,
    ...score,
  };
  return { ...row, line: overtimeGameLine(row) };
}

function scoredNights(log: OvertimeDay[]): OvertimeNight[] {
  return log
    .map((day) => ({ day, asOf: overtimeDayIso(day) }))
    .filter((entry) => isRecapIso(entry.asOf))
    .sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0))
    .map((entry) => {
      const games = [...entry.day.washington, ...entry.day.national]
        .map(scoreBlock)
        .filter((row): row is OvertimeGameRow => row != null)
        .sort(
          (a, b) =>
            OVERTIME_GAMES.indexOf(a.game) - OVERTIME_GAMES.indexOf(b.game),
        );
      return finishNight(entry.asOf, games);
    });
}

function boardFromNights(
  nights: OvertimeNight[],
  opts: { label?: string; target?: number } = {},
): OvertimeBoard {
  const games = mergeGameRows(nights.flatMap((night) => night.games));
  const spent = games.reduce((sum, row) => sum + row.spent, 0);
  const paid = games.reduce((sum, row) => sum + row.paid, 0);
  const credit = games.reduce((sum, row) => sum + row.credit, 0);
  const jackpotUnknown = games.some((row) => row.jackpotUnknown);
  const flags = flagsFor(paid, credit, spent, jackpotUnknown);
  const score = overtimeScore(paid, spent, jackpotUnknown);
  const mornings = nights.length;
  const lastNight = nights[0] ?? null;
  const filling = Boolean(opts.target && mornings < opts.target);
  return {
    mornings,
    lastNight,
    games,
    spent,
    paid,
    credit,
    ...flags,
    ...score,
    headline: overtimeHeadline(score),
    acrossLine: overtimeAcrossLine({
      mornings,
      spent,
      paid,
      label: opts.label,
      target: opts.target,
      filling,
    }),
    revenueWatch: overtimeRevenueWatch(flags),
    houseWatch: overtimeHouseWatch(flags),
  };
}

function finishNight(asOf: string, games: OvertimeGameRow[]): OvertimeNight {
  const spent = games.reduce((sum, row) => sum + row.spent, 0);
  const paid = games.reduce((sum, row) => sum + row.paid, 0);
  const credit = games.reduce((sum, row) => sum + row.credit, 0);
  const jackpotUnknown = games.some((row) => row.jackpotUnknown);
  const flags = flagsFor(paid, credit, spent, jackpotUnknown);
  const score = overtimeScore(paid, spent, jackpotUnknown);
  return {
    asOf,
    games,
    spent,
    paid,
    credit,
    ...flags,
    ...score,
    headline: overtimeHeadline(score),
    nightLine: overtimeNightLine({ spent, paid, score: score.score }),
  };
}

function mergeGameRows(rows: OvertimeGameRow[]): OvertimeGameRow[] {
  const byGame = new Map<DeskGameId, OvertimeGameRow[]>();
  for (const row of rows) {
    const list = byGame.get(row.game) ?? [];
    list.push(row);
    byGame.set(row.game, list);
  }
  return OVERTIME_GAMES.flatMap((game) => {
    const list = byGame.get(game);
    if (!list?.length) return [];
    const spent = list.reduce((sum, row) => sum + row.spent, 0);
    const paid = list.reduce((sum, row) => sum + row.paid, 0);
    const credit = list.reduce((sum, row) => sum + row.credit, 0);
    const freePlays = list.reduce((sum, row) => sum + row.freePlays, 0);
    const boards = list.reduce((sum, row) => sum + row.boards, 0);
    const jackpotUnknown = list.some((row) => row.jackpotUnknown);
    const basePaid = list.reduce(
      (sum, row) => sum + (row.base ? row.paid : 0),
      0,
    );
    const flags = flagsFor(paid, credit, spent, jackpotUnknown);
    const score = overtimeScore(paid, spent, jackpotUnknown);
    const merged = {
      game,
      label: overtimeGameLabel(game),
      boards,
      spent,
      paid,
      credit,
      freePlays,
      base: paid > 0 && basePaid === paid,
      ...flags,
      ...score,
    };
    return [{ ...merged, line: overtimeGameLine(merged) }];
  });
}

export function scoreOvertimeNight(day: OvertimeDay): OvertimeNight {
  return scoredNights([day])[0] ?? finishNight(overtimeDayIso(day), []);
}

export function scoreOvertime(log: OvertimeDay[]): OvertimeBoard {
  return boardFromNights(scoredNights(log));
}

export function scoreOvertimeWindow(
  log: OvertimeDay[],
  range: OvertimeWindowRange,
): OvertimeWindow {
  const nights = scoredNights(log).filter((night) =>
    inOvertimeWindow(night.asOf, range),
  );
  return {
    ...boardFromNights(nights, { label: range.label, target: range.target }),
    ...range,
    filling: nights.length < range.target,
  };
}

export function scoreOvertimeWindows(log: OvertimeDay[]): OvertimeDesk {
  const nights = scoredNights(log);
  const all = boardFromNights(nights, { label: "All-time" });
  const anchor = nights[0]?.asOf ?? "";
  if (!isRecapIso(anchor)) {
    return { lastNight: null, windows: [], all };
  }
  return {
    lastNight: nights[0] ?? null,
    windows: (["days7", "month", "quarter"] as const).map((id) =>
      scoreOvertimeWindow(log, overtimeWindowRange(id, anchor)),
    ),
    all,
  };
}
