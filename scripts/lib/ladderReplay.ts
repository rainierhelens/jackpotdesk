/**
 * Append-only ledger of official boards vs the Ladder that was live before
 * that drawing. One row per (game, officialDate). First write wins.
 *
 * This is a descriptive archive, not a forecast. Rank #1 is the strongest
 * match to history before that drawing, never the winning pick.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  crowdReading,
  waCrowdReading,
} from "../../src/lib/popularity.ts";
import { GAMES } from "../../src/lib/prizes.ts";
import { fetchOfficialDraws, type OfficialDraw } from "../../src/lib/winners.ts";
import { WA_GAMES } from "../../src/lib/waGames.ts";
import type { GameId } from "../../src/types.ts";
import {
  loadWaBook,
  replayOfficialAt,
  type RecapPayload,
  type ReplayRung,
} from "./deskLetter.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const LEDGER_PATH = join(ROOT, "src/data/ladderReplay.json");
export const PUBLIC_LEDGER_PATH = join(ROOT, "public/recap/ladder-replay.json");

export const REPLAY_GAMES = [
  "powerball",
  "megamillions",
  "hit5",
  "lotto",
] as const;

export type ReplayGameId = (typeof REPLAY_GAMES)[number];

/** Newest missing official dates to rank when a game is short of a seed. */
export const SEED_PER_GAME = 40;

export const LEDGER_NOTE =
  "One row per game and official date. Existing rows are never overwritten. Rank #1 is the strongest match to history before that drawing, never the winning pick. Same hit odds as Quick Pick.";

export const LEDGER_SOURCE =
  "Replay of The Ladder from official history excluding that drawing. First write wins. Not a forecast.";

export type LadderReplayRung = {
  rank: number;
  whites: number[];
  extra: number | null;
  points: number;
  crowd: string | null;
  why: string;
  whiteHits: number;
  extraHit: boolean | null;
  overlap: number[];
  officialOnly: number[];
  ladderOnly: number[];
};

export type LadderReplayRow = {
  game: ReplayGameId;
  officialDate: string;
  officialWhites: number[];
  officialExtra: number | null;
  historyBefore: number;
  recorded: string;
  closestRank: number | null;
  rungs: LadderReplayRung[];
};

export type LadderReplayBook = {
  updated: string;
  source: string;
  note: string;
  rows: LadderReplayRow[];
};

export type LedgerWrite = {
  book: LadderReplayBook;
  added: number;
  paths: string[];
};

export function rowKey(game: string, officialDate: string): string {
  return `${game}:${officialDate}`;
}

export function boardDelta(
  officialWhites: number[],
  ladderWhites: number[],
): { overlap: number[]; officialOnly: number[]; ladderOnly: number[] } {
  const official = new Set(officialWhites);
  const ladder = new Set(ladderWhites);
  const byN = (a: number, b: number) => a - b;
  return {
    overlap: officialWhites.filter((n) => ladder.has(n)).sort(byN),
    officialOnly: officialWhites.filter((n) => !ladder.has(n)).sort(byN),
    ladderOnly: ladderWhites.filter((n) => !official.has(n)).sort(byN),
  };
}

export function closestRank(
  rungs: { rank: number; whiteHits: number; extraHit: boolean | null }[],
): number | null {
  if (!rungs.length) return null;
  return rungs.reduce((best, rung) => {
    const bestExtra = best.extraHit === true ? 1 : 0;
    const extra = rung.extraHit === true ? 1 : 0;
    if (rung.whiteHits > best.whiteHits) return rung;
    if (rung.whiteHits === best.whiteHits && extra > bestExtra) return rung;
    if (
      rung.whiteHits === best.whiteHits &&
      extra === bestExtra &&
      rung.rank < best.rank
    ) {
      return rung;
    }
    return best;
  }).rank;
}

export function emptyBook(updated = new Date().toISOString()): LadderReplayBook {
  return {
    updated,
    source: LEDGER_SOURCE,
    note: LEDGER_NOTE,
    rows: [],
  };
}

export function parseBook(raw: unknown): LadderReplayBook {
  if (!raw || typeof raw !== "object") return emptyBook();
  const data = raw as Partial<LadderReplayBook>;
  const rows = Array.isArray(data.rows)
    ? data.rows.filter(isReplayRow)
    : [];
  return {
    updated: typeof data.updated === "string" ? data.updated : emptyBook().updated,
    source: LEDGER_SOURCE,
    note: LEDGER_NOTE,
    rows,
  };
}

function isReplayRow(value: unknown): value is LadderReplayRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LadderReplayRow>;
  return (
    typeof row.game === "string" &&
    REPLAY_GAMES.includes(row.game as ReplayGameId) &&
    typeof row.officialDate === "string" &&
    Array.isArray(row.officialWhites) &&
    Array.isArray(row.rungs)
  );
}

export function loadLedger(path = LEDGER_PATH): LadderReplayBook {
  if (!existsSync(path)) return emptyBook();
  try {
    return parseBook(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return emptyBook();
  }
}

function gameOrder(game: ReplayGameId): number {
  return REPLAY_GAMES.indexOf(game);
}

export function sortRows(rows: LadderReplayRow[]): LadderReplayRow[] {
  return [...rows].sort((a, b) => {
    if (a.officialDate !== b.officialDate) {
      return a.officialDate < b.officialDate ? 1 : -1;
    }
    return gameOrder(a.game) - gameOrder(b.game);
  });
}

export function mergeRows(
  book: LadderReplayBook,
  incoming: LadderReplayRow[],
  updated: string,
): { book: LadderReplayBook; added: number } {
  const seen = new Set(book.rows.map((row) => rowKey(row.game, row.officialDate)));
  const fresh: LadderReplayRow[] = [];
  for (const row of incoming) {
    const key = rowKey(row.game, row.officialDate);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(row);
  }
  if (!fresh.length) {
    return { book: { ...book, source: LEDGER_SOURCE, note: LEDGER_NOTE }, added: 0 };
  }
  return {
    book: {
      updated,
      source: LEDGER_SOURCE,
      note: LEDGER_NOTE,
      rows: sortRows([...book.rows, ...fresh]),
    },
    added: fresh.length,
  };
}

export function rungDelta(
  officialWhites: number[],
  rung: ReplayRung,
): LadderReplayRung {
  const delta = boardDelta(officialWhites, rung.whites);
  return {
    rank: rung.rank,
    whites: rung.whites,
    extra: rung.extra,
    points: rung.points,
    crowd: rung.crowd,
    why: rung.why,
    whiteHits: rung.whiteHits,
    extraHit: rung.extraHit,
    overlap: delta.overlap,
    officialOnly: delta.officialOnly,
    ladderOnly: delta.ladderOnly,
  };
}

export function rowFromReplay(
  game: ReplayGameId,
  officialDate: string,
  officialWhites: number[],
  officialExtra: number | null,
  historyBefore: number,
  rungs: ReplayRung[],
  recorded: string,
): LadderReplayRow {
  const scored = rungs.map((rung) => rungDelta(officialWhites, rung));
  return {
    game,
    officialDate,
    officialWhites,
    officialExtra,
    historyBefore,
    recorded,
    closestRank: closestRank(scored),
    rungs: scored,
  };
}

export function rowsFromRecapPayload(
  payload: RecapPayload,
  recorded: string,
): LadderReplayRow[] {
  const rows: LadderReplayRow[] = [];
  for (const block of payload.national) {
    rows.push(
      rowFromReplay(
        block.id,
        block.officialDate,
        block.officialWhites,
        block.officialExtra,
        block.historyBefore,
        block.rungs,
        recorded,
      ),
    );
  }
  for (const block of payload.washington) {
    if (block.id !== "hit5" && block.id !== "lotto") continue;
    rows.push(
      rowFromReplay(
        block.id,
        block.officialDate,
        block.officialWhites,
        block.officialExtra,
        block.historyBefore,
        block.rungs,
        recorded,
      ),
    );
  }
  return rows;
}

export function writeLedger(
  book: LadderReplayBook,
  paths: string[] = [LEDGER_PATH, PUBLIC_LEDGER_PATH],
): string[] {
  const json = `${JSON.stringify(book, null, 2)}\n`;
  for (const path of paths) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, json);
  }
  return paths;
}

function seedTarget(): number {
  const raw = process.env.LADDER_REPLAY_BACKFILL;
  if (raw == null || raw === "") return SEED_PER_GAME;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : SEED_PER_GAME;
}

function missingCount(book: LadderReplayBook, game: ReplayGameId): number {
  const have = book.rows.filter((row) => row.game === game).length;
  return Math.max(0, seedTarget() - have);
}

function rowsFromDraws(
  game: ReplayGameId,
  draws: OfficialDraw[],
  whiteMax: number,
  whiteCount: number,
  extraMax: number | null,
  extraLabel: string | null,
  crowd: Parameters<typeof replayOfficialAt>[6],
  book: LadderReplayBook,
  recorded: string,
  limit: number,
): LadderReplayRow[] {
  if (limit <= 0) return [];
  const seen = new Set(book.rows.map((row) => rowKey(row.game, row.officialDate)));
  const rows: LadderReplayRow[] = [];
  for (let i = 0; i < draws.length && rows.length < limit; i++) {
    const official = draws[i];
    if (seen.has(rowKey(game, official.date))) continue;
    const replay = replayOfficialAt(
      draws,
      i,
      whiteMax,
      whiteCount,
      extraMax,
      extraLabel,
      crowd,
    );
    if (!replay) continue;
    const extra =
      extraLabel && replay.official.extra > 0 ? replay.official.extra : null;
    const row = rowFromReplay(
      game,
      replay.official.date,
      replay.official.whites,
      extra,
      replay.historyBefore,
      replay.rungs,
      recorded,
    );
    rows.push(row);
    seen.add(rowKey(game, official.date));
  }
  return rows;
}

export async function backfillMissing(
  book: LadderReplayBook,
  recorded: string,
): Promise<LadderReplayRow[]> {
  const incoming: LadderReplayRow[] = [];
  for (const game of ["powerball", "megamillions"] as GameId[]) {
    const need = missingCount(book, game);
    if (need === 0) continue;
    const spec = GAMES[game];
    const official = await fetchOfficialDraws(game);
    incoming.push(
      ...rowsFromDraws(
        game,
        official.draws,
        spec.whiteMax,
        5,
        spec.extraMax,
        spec.extraLabel,
        (entry) =>
          entry.extra == null
            ? null
            : crowdReading(game, entry.numbers, entry.extra),
        book,
        recorded,
        need,
      ),
    );
  }
  const waNeed = (["hit5", "lotto"] as const).map((id) => ({
    id,
    need: missingCount(book, id),
  }));
  if (waNeed.some((item) => item.need > 0)) {
    const waBook = loadWaBook();
    for (const { id, need } of waNeed) {
      if (need === 0) continue;
      const spec = WA_GAMES[id];
      const draws = (waBook.draws?.[id] ?? []).map((d) => ({
        date: d.date,
        whites: d.numbers,
        extra: 0,
      }));
      incoming.push(
        ...rowsFromDraws(
          id,
          draws,
          spec.whiteMax,
          spec.whiteCount,
          null,
          null,
          (entry) => waCrowdReading(id, entry.numbers),
          book,
          recorded,
          need,
        ),
      );
    }
  }
  return incoming;
}

export async function persistLadderReplay(
  payload: RecapPayload,
  recorded = new Date().toISOString(),
): Promise<LedgerWrite> {
  let book = loadLedger();
  const fromRecap = rowsFromRecapPayload(payload, recorded);
  const recapMerge = mergeRows(book, fromRecap, recorded);
  book = recapMerge.book;
  const fromBackfill = await backfillMissing(book, recorded);
  const backfillMerge = mergeRows(book, fromBackfill, recorded);
  book = backfillMerge.book;
  const added = recapMerge.added + backfillMerge.added;
  if (added === 0 && existsSync(LEDGER_PATH)) {
    writeLedger(book);
    return { book, added: 0, paths: [LEDGER_PATH, PUBLIC_LEDGER_PATH] };
  }
  const paths = writeLedger(book);
  return { book, added, paths };
}
