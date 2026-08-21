/**
 * Shared draw-night letter: private digest and public last-night recap.
 *
 * Digest shows tonight's Ladder #1–#3 plus the EV call.
 * Recap shows last official vs the Ladder that was live before that drawing.
 * Tonight's #1 is not published on the recap.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMarket, estimateTicketsSold } from "../../src/lib/market.ts";
import {
  computeEv,
  formatCompact,
  moneyExact,
  playAdvice,
} from "../../src/lib/ev.ts";
import { crowdReading, waCrowdReading } from "../../src/lib/popularity.ts";
import {
  buildPatternModel,
  patternLadder,
  type LadderEntry,
} from "../../src/lib/patternLab.ts";
import { GAMES } from "../../src/lib/prizes.ts";
import { fetchOfficialDraws, type OfficialDraw } from "../../src/lib/winners.ts";
import { WA_GAMES } from "../../src/lib/waGames.ts";
import type { GameId, WaGameId } from "../../src/types.ts";
import { heatBookFromDraws, waHeatSpec } from "../../src/lib/lotteryHeat.ts";
import {
  deskLine,
  deskStrip,
  type RecapHeat,
} from "../../src/lib/recapPayload.ts";

export {
  DESK_LINE_LEAD,
  DESK_LINE_LINK,
  DESK_LINE_MAX,
  compactDeskBoard,
  deskLine,
  deskStrip,
} from "../../src/lib/recapPayload.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const SITE = "https://www.jackpotdesk.com";
export const TAX = { federalTax: 0.37, stateTax: 0, humanTicketShare: 0.2 };
export const LADDER_TOP = 3;

/** Live site first sentence. Source of truth if a letter disagrees. */
export const SAME_ODDS_LEAD =
  "Same hit odds as Quick Pick. The Ladder ranks scanned boards against official draw history.";

export type WaBook = {
  asOf?: string;
  draws?: Record<string, { date: string; numbers: number[] }[]>;
  prizes?: {
    hit5?: { cashpot?: number };
    lotto?: { advertised?: number; cash?: number };
  };
};

export type Rung = {
  rank: number;
  board: string;
  points: number;
  crowd: string | null;
  why: string;
};

export type ReplayRung = Rung & {
  whites: number[];
  extra: number | null;
  whiteHits: number;
  extraHit: boolean | null;
  matchLine: string;
};

export type NationalBlock = {
  id: GameId;
  label: string;
  extraLabel: string;
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: "no" | "entertain" | "rare";
  lastDraw: string | null;
  history: number;
  rungs: Rung[];
};

export type WaBlock = {
  id: WaGameId;
  label: string;
  when: string;
  prizeLine: string;
  lastDraw: string | null;
  history: number;
  rungs: Rung[];
};

export type DigestPayload = {
  asOf: string;
  national: NationalBlock[];
  washington: WaBlock[];
  notes: string[];
};

export type RecapNational = {
  id: GameId;
  label: string;
  extraLabel: string;
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: "no" | "entertain" | "rare";
  officialDate: string;
  officialBoard: string;
  officialWhites: number[];
  officialExtra: number | null;
  historyBefore: number;
  heat: RecapHeat | null;
  rungs: ReplayRung[];
  ladderHref: string;
  officialStore?: string | null;
};

export type RecapWashington = {
  id: WaGameId;
  label: string;
  when: string;
  prizeLine: string;
  officialDate: string;
  officialBoard: string;
  officialWhites: number[];
  officialExtra: number | null;
  historyBefore: number;
  heat: RecapHeat | null;
  rungs: ReplayRung[];
  ladderHref: string;
  officialStore?: string | null;
};

function asDeskBlock(
  block: RecapNational | RecapWashington,
): Parameters<typeof deskLine>[0] {
  return {
    label: block.label,
    officialDate: block.officialDate,
    officialWhites: block.officialWhites,
    officialExtra: block.officialExtra,
    rungs: block.rungs,
    tone: "tone" in block ? block.tone : null,
  };
}

/** Tweet-length copy from the same recap block the public page already has. */
export function recapDeskLine(
  block: RecapNational | RecapWashington,
): string {
  return deskLine(asDeskBlock(block));
}

/** One tweet for every last-night game, or null if it cannot stay ≤280. */
export function recapDeskStrip(payload: RecapPayload): string | null {
  return deskStrip([
    ...payload.national.map(asDeskBlock),
    ...payload.washington.map(asDeskBlock),
  ]);
}

export type RecapPayload = {
  asOf: string;
  national: RecapNational[];
  washington: RecapWashington[];
  notes: string[];
};

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function boardLine(
  numbers: number[],
  extra: number | null,
  extraLabel: string | null,
): string {
  const whites = numbers.map((n) => String(n).padStart(2, "0")).join("  ");
  if (extra == null || !extraLabel) return whites;
  return `${whites}  +  ${String(extra).padStart(2, "0")} ${extraLabel}`;
}

export function crowdLabel(
  reading: { index: number; beats: number } | null,
): string | null {
  if (!reading) return null;
  return `${reading.index.toFixed(2)}x crowd · beats ${reading.beats}% of random boards`;
}

export function rungsFrom(
  entries: LadderEntry[],
  extraLabel: string | null,
  crowd: (entry: LadderEntry) => { index: number; beats: number } | null,
): Rung[] {
  return entries.slice(0, LADDER_TOP).map((entry) => ({
    rank: entry.rank,
    board: boardLine(entry.numbers, entry.extra, extraLabel),
    points: entry.points,
    crowd: crowdLabel(crowd(entry)),
    why: entry.why,
  }));
}

export function scoreReplay(
  officialWhites: number[],
  officialExtra: number | null,
  board: number[],
  extra: number | null,
): { whiteHits: number; extraHit: boolean | null } {
  const drawn = new Set(officialWhites);
  const whiteHits = board.filter((n) => drawn.has(n)).length;
  if (officialExtra == null || extra == null) {
    return { whiteHits, extraHit: null };
  }
  return { whiteHits, extraHit: extra === officialExtra };
}

export function matchLine(
  whiteHits: number,
  whiteCount: number,
  extraHit: boolean | null,
  extraLabel: string | null,
): string {
  const whites = `${whiteHits} of ${whiteCount} whites`;
  if (!extraLabel || extraHit == null) return whites;
  return extraHit ? `${whites} · ${extraLabel} hit` : `${whites} · no ${extraLabel}`;
}

export function replayRungsFrom(
  entries: LadderEntry[],
  officialWhites: number[],
  officialExtra: number | null,
  extraLabel: string | null,
  crowd: (entry: LadderEntry) => { index: number; beats: number } | null,
): ReplayRung[] {
  return rungsFrom(entries, extraLabel, crowd).map((rung, i) => {
    const entry = entries[i];
    const scored = scoreReplay(
      officialWhites,
      officialExtra,
      entry.numbers,
      entry.extra ?? null,
    );
    return {
      ...rung,
      whites: entry.numbers,
      extra: entry.extra && entry.extra > 0 ? entry.extra : null,
      whiteHits: scored.whiteHits,
      extraHit: scored.extraHit,
      matchLine: matchLine(
        scored.whiteHits,
        entry.numbers.length,
        scored.extraHit,
        extraLabel,
      ),
    };
  });
}

export function digestCallLine(tone: "no" | "entertain" | "rare"): string {
  if (tone === "rare") return "RARE PLUS";
  if (tone === "entertain") return "ENTERTAIN ONLY";
  return "SKIP AS AN INVESTMENT";
}

function slimHeat(
  prior: OfficialDraw[],
  spec: Parameters<typeof heatBookFromDraws>[1],
  extraLabel: string | null,
): RecapHeat | null {
  const book = heatBookFromDraws(prior, spec);
  if (!book) return null;
  return {
    draws: book.draws,
    whiteMax: book.whiteMax,
    extraMax: book.extraMax,
    extraLabel,
    whites: book.whites.map((cell) => ({ n: cell.n, count: cell.count })),
    extras: book.extras.map((cell) => ({ n: cell.n, count: cell.count })),
  };
}

export function recapCallLine(tone: "no" | "entertain" | "rare"): string {
  if (tone === "rare") return "RARE PLUS";
  if (tone === "entertain") return "ENTERTAIN ONLY";
  return "SKIP";
}

export function loadWaBook(): WaBook {
  return JSON.parse(
    readFileSync(join(ROOT, "src/data/waDraws.json"), "utf8"),
  ) as WaBook;
}

export function waWhen(id: WaGameId): string {
  if (id === "hit5") return "Daily 8 p.m. PT";
  if (id === "lotto") return "Mon / Wed / Sat 8 p.m. PT";
  return "See Washington's Lottery";
}

async function nationalEv(game: GameId): Promise<{
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: "no" | "entertain" | "rare";
}> {
  const spec = GAMES[game];
  const market = await fetchMarket(game);
  const ticketsSold = estimateTicketsSold(market.advertised, spec.ticketCost);
  const ev = computeEv(game, {
    advertisedJackpot: market.advertised,
    cashJackpot: market.cash,
    ticketsSold,
    ...TAX,
  });
  const advice = playAdvice(ev.unique.netEv);
  return {
    nextDraw: market.nextDraw,
    advertised: formatCompact(market.advertised),
    cash: formatCompact(market.cash),
    netEv: moneyExact.format(ev.unique.netEv),
    advice: advice.text,
    tone: advice.tone,
  };
}

export async function nationalBlock(game: GameId): Promise<NationalBlock> {
  const spec = GAMES[game];
  const [ev, official] = await Promise.all([
    nationalEv(game),
    fetchOfficialDraws(game),
  ]);
  const model = buildPatternModel(
    official.draws.map((d) => ({ numbers: d.whites, extra: d.extra })),
    spec.whiteMax,
    spec.extraMax,
  );
  if (!model) {
    throw new Error(`Not enough ${spec.label} history to rank`);
  }
  const ladder = patternLadder(model, 5, LADDER_TOP);
  return {
    id: game,
    label: spec.label,
    extraLabel: spec.extraLabel,
    ...ev,
    lastDraw: official.asOf,
    history: official.draws.length,
    rungs: rungsFrom(ladder.entries, spec.extraLabel, (entry) =>
      entry.extra == null
        ? null
        : crowdReading(game, entry.numbers, entry.extra),
    ),
  };
}

export function waBlock(book: WaBook, id: "hit5" | "lotto"): WaBlock {
  const spec = WA_GAMES[id];
  const draws = book.draws?.[id] ?? [];
  const model = buildPatternModel(
    draws.map((d) => ({ numbers: d.numbers })),
    spec.whiteMax,
  );
  if (!model) {
    throw new Error(`Not enough ${spec.label} history to rank`);
  }
  const ladder = patternLadder(model, spec.whiteCount, LADDER_TOP);
  return {
    id,
    label: spec.label,
    when: waWhen(id),
    prizeLine: waPrizeLine(book, id),
    lastDraw: draws[0]?.date ?? book.asOf ?? null,
    history: draws.length,
    rungs: rungsFrom(ladder.entries, null, (entry) =>
      waCrowdReading(id, entry.numbers),
    ),
  };
}

function waPrizeLine(book: WaBook, id: "hit5" | "lotto"): string {
  const spec = WA_GAMES[id];
  if (id === "hit5") {
    const cashpot = book.prizes?.hit5?.cashpot ?? 0;
    const share = cashpot / spec.jackpotOdds;
    return `Cashpot ${moneyExact.format(cashpot)}. About ${moneyExact.format(share)} of the $1 is the cashpot before lower prizes.`;
  }
  const advertised = book.prizes?.lotto?.advertised ?? 0;
  const cash = book.prizes?.lotto?.cash ?? 0;
  const share = (2 * cash) / spec.jackpotOdds;
  return `Advertised ${moneyExact.format(advertised)} · cash ${moneyExact.format(cash)}. About ${moneyExact.format(share)} of the $1 is the cash jackpot (two boards per dollar).`;
}

function lastOfficialLadder(
  draws: OfficialDraw[],
  whiteMax: number,
  whiteCount: number,
  extraMax: number | null,
  extraLabel: string | null,
  crowd: (entry: LadderEntry) => { index: number; beats: number } | null,
): {
  official: OfficialDraw;
  historyBefore: number;
  rungs: ReplayRung[];
} {
  const official = draws[0];
  if (!official) throw new Error("No official draw to replay");
  const prior = draws.slice(1);
  const model = buildPatternModel(
    prior.map((d) => ({ numbers: d.whites, extra: d.extra })),
    whiteMax,
    extraMax,
  );
  if (!model) {
    throw new Error("Not enough history before the last official draw");
  }
  const ladder = patternLadder(model, whiteCount, LADDER_TOP);
  return {
    official,
    historyBefore: prior.length,
    rungs: replayRungsFrom(
      ladder.entries,
      official.whites,
      official.extra,
      extraLabel,
      crowd,
    ),
  };
}

export async function recapNational(game: GameId): Promise<RecapNational> {
  const spec = GAMES[game];
  const [ev, official] = await Promise.all([
    nationalEv(game),
    fetchOfficialDraws(game),
  ]);
  const replay = lastOfficialLadder(
    official.draws,
    spec.whiteMax,
    5,
    spec.extraMax,
    spec.extraLabel,
    (entry) =>
      entry.extra == null
        ? null
        : crowdReading(game, entry.numbers, entry.extra),
  );
  return {
    id: game,
    label: spec.label,
    extraLabel: spec.extraLabel,
    ...ev,
    officialDate: replay.official.date,
    officialBoard: boardLine(
      replay.official.whites,
      replay.official.extra,
      spec.extraLabel,
    ),
    officialWhites: replay.official.whites,
    officialExtra: replay.official.extra && replay.official.extra > 0
      ? replay.official.extra
      : null,
    historyBefore: replay.historyBefore,
    heat: slimHeat(official.draws.slice(1), spec, spec.extraLabel),
    rungs: replay.rungs,
    ladderHref: `${SITE}/?desk=national&game=${game}`,
  };
}

export function recapWashington(
  book: WaBook,
  id: "hit5" | "lotto",
): RecapWashington {
  const spec = WA_GAMES[id];
  const draws = (book.draws?.[id] ?? []).map((d) => ({
    date: d.date,
    whites: d.numbers,
    extra: 0,
  }));
  const replay = lastOfficialLadder(
    draws,
    spec.whiteMax,
    spec.whiteCount,
    null,
    null,
    (entry) => waCrowdReading(id, entry.numbers),
  );
  return {
    id,
    label: spec.label,
    when: waWhen(id),
    prizeLine: waPrizeLine(book, id),
    officialDate: replay.official.date,
    officialBoard: boardLine(replay.official.whites, null, null),
    officialWhites: replay.official.whites,
    officialExtra: null,
    historyBefore: replay.historyBefore,
    heat: slimHeat(draws.slice(1), waHeatSpec(spec), null),
    rungs: replay.rungs,
    ladderHref: `${SITE}/?desk=washington&wa=${id}`,
  };
}

export async function buildDigestPayload(): Promise<DigestPayload> {
  const notes: string[] = [];
  const national: NationalBlock[] = [];
  for (const game of ["powerball", "megamillions"] as const) {
    try {
      national.push(await nationalBlock(game));
    } catch (err) {
      notes.push(
        `${GAMES[game].label} feed failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  const washington: WaBlock[] = [];
  try {
    const book = loadWaBook();
    for (const id of ["hit5", "lotto"] as const) {
      try {
        washington.push(waBlock(book, id));
      } catch (err) {
        notes.push(
          `${WA_GAMES[id].label} ranking failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    notes.push(
      `Washington book failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return { asOf: todayIso(), national, washington, notes };
}

export async function buildRecapPayload(): Promise<RecapPayload> {
  const notes: string[] = [];
  const national: RecapNational[] = [];
  for (const game of ["powerball", "megamillions"] as const) {
    try {
      national.push(await recapNational(game));
    } catch (err) {
      notes.push(
        `${GAMES[game].label} replay failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  const washington: RecapWashington[] = [];
  try {
    const book = loadWaBook();
    for (const id of ["hit5", "lotto"] as const) {
      try {
        washington.push(recapWashington(book, id));
      } catch (err) {
        notes.push(
          `${WA_GAMES[id].label} replay failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    notes.push(
      `Washington book failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (national.length + washington.length === 0) {
    throw new Error(
      `Recap had no official games to publish. ${notes.join(" ")}`.trim(),
    );
  }
  return { asOf: todayIso(), national, washington, notes };
}

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assertNoEmDash(label: string, raw: string): void {
  if (raw.includes("\u2014")) {
    throw new Error(`${label} contains an em dash`);
  }
}
