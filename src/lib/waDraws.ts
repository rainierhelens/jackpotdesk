import { useEffect, useState } from "react";
import type { WaGameId } from "../types";
import bakedFile from "../data/waDraws.json";
import { WA_DRAWS_URL } from "../config";
import { comboKey } from "./picks";

export type WaDraw = {
  date: string;
  numbers: number[];
};

export type WaBook = {
  asOf: string;
  fetchedAt?: string;
  source: string;
  draws: Record<WaGameId, WaDraw[]>;
  prizes: {
    hit5: { cashpot: number };
    lotto: { advertised: number; cash: number };
  };
};

// The live feed may carry extra games (e.g. pick3, keno); we only validate
// and read the ones the desk actually offers.
const GAMES: WaGameId[] = ["hit5", "lotto", "match4", "cashpop"];

const baked = bakedFile as WaBook;

export function parseWaBook(raw: unknown): WaBook | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as WaBook;
  if (!data.draws || !data.prizes) return null;
  for (const id of GAMES) {
    const rows = data.draws[id];
    if (!Array.isArray(rows) || rows.length < 10) return null;
  }
  const cashpot = data.prizes.hit5?.cashpot;
  const advertised = data.prizes.lotto?.advertised;
  const cash = data.prizes.lotto?.cash;
  if (
    typeof cashpot !== "number" ||
    cashpot <= 0 ||
    typeof advertised !== "number" ||
    advertised <= 0 ||
    typeof cash !== "number" ||
    cash <= 0
  ) {
    return null;
  }
  return data;
}

export function waAsOf(book: WaBook = baked): string {
  return book.asOf;
}

export function waDrawSource(book: WaBook = baked): string {
  return book.source;
}

export function waPrizes(book: WaBook = baked): WaBook["prizes"] {
  return book.prizes;
}

const unionCache = new WeakMap<WaBook, Map<WaGameId, WaDraw[]>>();

/**
 * Draws for a game, newest first. The live feed only carries a rolling 180
 * days (the Worker's backup cron re-scrapes that window), while the baked
 * book is built from the append-only archive and keeps deepening — so we
 * union the two and history can only ever grow.
 */
export function waDrawsFor(game: WaGameId, book: WaBook = baked): WaDraw[] {
  const fresh = book.draws[game] ?? [];
  if (book === baked) return fresh;
  let byGame = unionCache.get(book);
  if (!byGame) {
    byGame = new Map();
    unionCache.set(book, byGame);
  }
  const cached = byGame.get(game);
  if (cached) return cached;
  const seen = new Set(fresh.map((d) => `${d.date}|${d.numbers.join(",")}`));
  const merged = [...fresh];
  for (const draw of baked.draws[game] ?? []) {
    const key = `${draw.date}|${draw.numbers.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(draw);
  }
  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  byGame.set(game, merged);
  return merged;
}

export function waLatest(game: WaGameId, book: WaBook = baked): WaDraw | null {
  return waDrawsFor(game, book)[0] ?? null;
}

export function waPastKeys(game: WaGameId, book: WaBook = baked): Set<string> {
  const keys = new Set<string>();
  for (const draw of waDrawsFor(game, book)) {
    keys.add(comboKey(draw.numbers));
  }
  return keys;
}

const WA_POLL_MS = 5 * 60_000;

let live: WaBook | null = null;
let inflight: Promise<WaBook> | null = null;
let fetchedAt = 0;

export async function fetchLiveWaBook(): Promise<WaBook> {
  // A small buffer keeps several subscribers from re-fetching back to back.
  if (live && Date.now() - fetchedAt < WA_POLL_MS - 15_000) return live;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch(WA_DRAWS_URL, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return live ?? baked;
      const parsed = parseWaBook(await response.json());
      if (!parsed) return live ?? baked;
      live = parsed;
      fetchedAt = Date.now();
      return parsed;
    } catch {
      return live ?? baked;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useWaDraws(): { book: WaBook; feed: "live" | "baked" } {
  const [book, setBook] = useState<WaBook>(live ?? baked);
  const [feed, setFeed] = useState<"live" | "baked">(live ? "live" : "baked");

  useEffect(() => {
    let on = true;
    const tick = () => {
      void fetchLiveWaBook().then((next) => {
        if (!on) return;
        setBook(next);
        setFeed(live ? "live" : "baked");
      });
    };
    tick();
    const timer = window.setInterval(tick, WA_POLL_MS);
    return () => {
      on = false;
      window.clearInterval(timer);
    };
  }, []);

  return { book, feed };
}
