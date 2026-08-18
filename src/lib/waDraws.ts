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

const GAMES: WaGameId[] = [
  "hit5",
  "lotto",
  "match4",
  "pick3",
  "keno",
  "cashpop",
];

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

export function waDrawsFor(game: WaGameId, book: WaBook = baked): WaDraw[] {
  return book.draws[game] ?? [];
}

export function waLatest(game: WaGameId, book: WaBook = baked): WaDraw | null {
  return waDrawsFor(game, book)[0] ?? null;
}

export function waPastKeys(
  game: WaGameId,
  orderedDigits = false,
  book: WaBook = baked,
): Set<string> {
  const keys = new Set<string>();
  for (const draw of waDrawsFor(game, book)) {
    keys.add(orderedDigits ? draw.numbers.join("") : comboKey(draw.numbers));
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
