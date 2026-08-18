import { useEffect, useState } from "react";
import { JACKPOT_WINS_URL } from "../config";
import bakedFile from "../data/jackpotWins.json";
import {
  parseJackpotBook,
  type JackpotBook,
} from "./jackpotMap";

const baked = bakedFile as JackpotBook;

let live: JackpotBook | null = null;
let inflight: Promise<JackpotBook> | null = null;

export async function fetchLiveJackpotBook(): Promise<JackpotBook> {
  if (live) return live;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch(JACKPOT_WINS_URL, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return baked;
      const parsed = parseJackpotBook(await response.json());
      if (!parsed) return baked;
      live = parsed;
      return parsed;
    } catch {
      return baked;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useJackpotWins(): { book: JackpotBook; feed: "live" | "baked" } {
  const [book, setBook] = useState<JackpotBook>(live ?? baked);
  const [feed, setFeed] = useState<"live" | "baked">(live ? "live" : "baked");

  useEffect(() => {
    let on = true;
    void fetchLiveJackpotBook().then((next) => {
      if (!on) return;
      setBook(next);
      setFeed(live ? "live" : "baked");
    });
    return () => {
      on = false;
    };
  }, []);

  return { book, feed };
}
