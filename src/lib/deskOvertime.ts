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

export type OvertimeRung = DeskPayRung & { rank: number };

export type OvertimeBlock = DeskPaySource & {
  rungs: OvertimeRung[];
};

export type OvertimeDay = {
  asOf: string;
  national: OvertimeBlock[];
  washington: OvertimeBlock[];
};

export type OvertimeFlags = {
  anyRevenue: boolean;
  beatHouse: boolean;
  jackpotUnknown: boolean;
};

export type OvertimeGameRow = OvertimeFlags & {
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

export type OvertimeNight = OvertimeFlags & {
  asOf: string;
  games: OvertimeGameRow[];
  spent: number;
  paid: number;
  credit: number;
  nightLine: string;
};

export type OvertimeBoard = OvertimeFlags & {
  mornings: number;
  lastNight: OvertimeNight | null;
  games: OvertimeGameRow[];
  spent: number;
  paid: number;
  credit: number;
  acrossLine: string;
  revenueWatch: string;
  houseWatch: string;
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

function houseStatus(
  paid: number,
  credit: number,
  spent: number,
  jackpotUnknown: boolean,
  style: "game" | "across",
): string {
  const ahead = spent > 0 && paid + credit >= spent;
  if (ahead) return "ahead of the house";
  if (jackpotUnknown && paid <= 0) return JACKPOT_UNKNOWN;
  if (paid > 0) return "cash on the board";
  return style === "game" ? "house" : "no cash yet";
}

function paidBit(paid: number, base: boolean): string {
  const cash = formatDeskCash(paid);
  return base && paid > 0 ? `paid base ${cash}` : `paid ${cash}`;
}

function gameTails(row: {
  freePlays: number;
  jackpotUnknown: boolean;
}): string[] {
  const tails: string[] = [];
  if (row.freePlays > 0) tails.push(FREE_PLAY_LABEL);
  if (row.jackpotUnknown) tails.push(JACKPOT_UNKNOWN);
  return tails;
}

export function overtimeGameLine(row: Omit<OvertimeGameRow, "line">): string {
  const status = houseStatus(
    row.paid,
    row.credit,
    row.spent,
    row.jackpotUnknown,
    "game",
  );
  const boards = row.boards === 1 ? "1 board" : `${row.boards} boards`;
  const tails = gameTails(row).filter((tail) => tail !== status);
  return [
    row.label,
    boards,
    `spent ${formatDeskCash(row.spent)}`,
    paidBit(row.paid, row.base),
    ...tails,
    `${status}.`,
  ].join(" · ");
}

export function overtimeAcrossLine(board: {
  mornings: number;
  spent: number;
  paid: number;
  credit: number;
  jackpotUnknown: boolean;
}): string {
  const nights = board.mornings === 1 ? "1 morning" : `${board.mornings} mornings`;
  const status = houseStatus(
    board.paid,
    board.credit,
    board.spent,
    board.jackpotUnknown,
    "across",
  );
  return [
    "Overtime",
    nights,
    `spent ${formatDeskCash(board.spent)}`,
    `paid ${formatDeskCash(board.paid)}`,
    status,
  ].join(" · ");
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
  credit: number;
  jackpotUnknown: boolean;
}): string {
  const status = houseStatus(
    night.paid,
    night.credit,
    night.spent,
    night.jackpotUnknown,
    "across",
  );
  return [
    "Last night",
    `spent ${formatDeskCash(night.spent)}`,
    `paid ${formatDeskCash(night.paid)}`,
    status,
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
  };
  return { ...row, line: overtimeGameLine(row) };
}

function finishNight(asOf: string, games: OvertimeGameRow[]): OvertimeNight {
  const spent = games.reduce((sum, row) => sum + row.spent, 0);
  const paid = games.reduce((sum, row) => sum + row.paid, 0);
  const credit = games.reduce((sum, row) => sum + row.credit, 0);
  const jackpotUnknown = games.some((row) => row.jackpotUnknown);
  const flags = flagsFor(paid, credit, spent, jackpotUnknown);
  return {
    asOf,
    games,
    spent,
    paid,
    credit,
    ...flags,
    nightLine: overtimeNightLine({ spent, paid, credit, jackpotUnknown }),
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
    };
    return [{ ...merged, line: overtimeGameLine(merged) }];
  });
}

export function scoreOvertimeNight(day: OvertimeDay): OvertimeNight {
  const games = [...day.washington, ...day.national]
    .map(scoreBlock)
    .filter((row): row is OvertimeGameRow => row != null)
    .sort(
      (a, b) => OVERTIME_GAMES.indexOf(a.game) - OVERTIME_GAMES.indexOf(b.game),
    );
  return finishNight(day.asOf, games);
}

export function scoreOvertime(log: OvertimeDay[]): OvertimeBoard {
  const nights = log
    .filter((day) => day.asOf)
    .sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0))
    .map(scoreOvertimeNight);
  const games = mergeGameRows(nights.flatMap((night) => night.games));
  const spent = games.reduce((sum, row) => sum + row.spent, 0);
  const paid = games.reduce((sum, row) => sum + row.paid, 0);
  const credit = games.reduce((sum, row) => sum + row.credit, 0);
  const jackpotUnknown = games.some((row) => row.jackpotUnknown);
  const flags = flagsFor(paid, credit, spent, jackpotUnknown);
  const mornings = nights.length;
  const lastNight = nights[0] ?? null;
  return {
    mornings,
    lastNight,
    games,
    spent,
    paid,
    credit,
    ...flags,
    acrossLine: overtimeAcrossLine({
      mornings,
      spent,
      paid,
      credit,
      jackpotUnknown,
    }),
    revenueWatch: overtimeRevenueWatch(flags),
    houseWatch: overtimeHouseWatch(flags),
  };
}
