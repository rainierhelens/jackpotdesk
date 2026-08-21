import book from "../data/waClaimedPrizesByStore.json";

export const CLAIMED_SAME_ODDS =
  "Every licensed retailer has the same chance of selling a jackpot ticket.";

export const CLAIMED_QUESTION =
  "Where did listed $600+ claims land in the last 365 days?";

export const CLAIMED_LOCATION_LINE = "Location does not change hit odds.";

export const CLAIMED_FIT_LINE =
  "This page counts claimed prizes Washington's Lottery listed in the last year, by the store on that row.";

export const CLAIMED_FIT_PAST = "Rank and count are a fit to the past.";

export const CLAIMED_ENTERTAIN = "Entertainment, not prediction.";

export const CLAIMED_WALK_LINE =
  "If you already planned to play, here's a busy counter, a fat-ticket shop, and a quiet list.";

export const CLAIMED_SOURCE_URL = "https://www.walottery.com/winners/Search.aspx";

export const CLAIMED_CHIP_ORDER = [
  "all",
  "Lotto",
  "Hit 5",
  "Powerball",
  "Mega Millions",
  "Match 4",
  "Scratch",
] as const;

export const CLAIMED_GAMES = [
  "Powerball",
  "Mega Millions",
  "Lotto",
  "Hit 5",
  "Match 4",
  "Scratch",
] as const;

export type ClaimedGame = (typeof CLAIMED_GAMES)[number];

export const BUSY_STORY = {
  kind: "busy" as const,
  name: "Busy counter",
  definition: "Most listed claims in this window.",
  notLine: "A crowded grocery line, not a hotter machine.",
};

export const FAT_STORY = {
  kind: "fat" as const,
  name: "Fat ticket",
  definition: "Most listed dollars, especially from few claims.",
  notLine: "One scratch, not a streak.",
};

export const QUIET_STORY = {
  kind: "quiet" as const,
  name: "Quiet list",
  definition: "Longest gap since the last date on the official list.",
  notLine: "A hole in the Lottery's page, not a store waiting its turn.",
};

export type ClaimedStore = {
  name: string;
  address: string;
  city: string;
  claims: number;
  sum: number;
  games: Partial<Record<ClaimedGame, number>>;
  gameSums: Partial<Record<ClaimedGame, number>>;
  gameLastDates?: Partial<Record<ClaimedGame, string>>;
  firstDate: string;
  lastDate: string;
};

export type ClaimedPrizeBook = {
  asOf: string;
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  coverage: string;
  listedCards: number;
  locatedClaims: number;
  unlocatedClaims: number;
  unlocatedByGame?: Partial<Record<ClaimedGame, number>>;
  merchandiseClaims: number;
  storeCount: number;
  dateMin: string | null;
  dateMax: string | null;
  games: Record<string, number>;
  stores: ClaimedStore[];
};

export type ClaimedCity = {
  city: string;
  claims: number;
  sum: number;
  storeCount: number;
};

export type ClaimedLongTail = {
  storeCount: number;
  totalClaims: number;
  top10Claims: number;
  top10Share: number;
  onceCount: number;
};

export type ClaimedWalk = {
  busy: ClaimedStore | null;
  fat: ClaimedStore | null;
  quiet: ClaimedStore | null;
  quietGapDays: number | null;
};

const BANNED_COPY = [
  "due-ness",
  "due soon",
  "running hot",
  "cooling off",
  "high confidence",
  "beats Quick Pick",
  "winning numbers",
  "buy here",
  "kiosk",
  "fable",
  "route-to-win",
];

export const WA_CLAIMED = book as ClaimedPrizeBook;

function storeKey(store: Pick<ClaimedStore, "name" | "address" | "city">): string {
  return `${store.name}|${store.address}|${store.city}`;
}

export function parseClaimedPrizeBook(raw: unknown): ClaimedPrizeBook {
  if (!raw || typeof raw !== "object") {
    throw new Error("Claimed-prize book is missing.");
  }
  const data = raw as ClaimedPrizeBook;
  if (!Array.isArray(data.stores) || data.stores.length === 0) {
    throw new Error("Claimed-prize book has no stores.");
  }
  if (data.sourceUrl !== CLAIMED_SOURCE_URL) {
    throw new Error("Claimed-prize book must cite the official winners search.");
  }
  if (data.unlocatedByGame) {
    let unlocatedSum = 0;
    for (const count of Object.values(data.unlocatedByGame)) {
      if (!Number.isInteger(count) || count < 0) {
        throw new Error("Claimed-prize book has a bad unlocated-by-game count.");
      }
      unlocatedSum += count;
    }
    if (unlocatedSum !== data.unlocatedClaims) {
      throw new Error("Unlocated-by-game counts must sum to unlocatedClaims.");
    }
  }
  for (const store of data.stores) {
    if (
      !store.name ||
      !store.address ||
      !store.city ||
      !Number.isInteger(store.claims) ||
      store.claims < 1 ||
      typeof store.sum !== "number"
    ) {
      throw new Error(`Bad claimed-prize store row: ${store.name}`);
    }
    if (
      "lat" in store ||
      "lng" in store ||
      "kiosk" in store ||
      "sales" in store ||
      "winnerName" in store
    ) {
      throw new Error(`Store row has banned fields: ${store.name}`);
    }
  }
  return data;
}

export function filterClaimedStores(
  data: ClaimedPrizeBook,
  game: ClaimedGame | "all",
): ClaimedStore[] {
  const rows =
    game === "all"
      ? data.stores
      : data.stores
          .map((store) => {
            const claims = store.games[game] ?? 0;
            if (claims < 1) return null;
            return {
              ...store,
              claims,
              sum: store.gameSums[game] ?? 0,
              lastDate: store.gameLastDates?.[game] ?? "",
            };
          })
          .filter((store): store is ClaimedStore => store != null);
  return [...rows].sort(
    (a, b) =>
      b.claims - a.claims ||
      b.sum - a.sum ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  );
}

export function claimedCities(stores: ClaimedStore[]): ClaimedCity[] {
  const map = new Map<string, ClaimedCity>();
  for (const store of stores) {
    const row = map.get(store.city) ?? {
      city: store.city,
      claims: 0,
      sum: 0,
      storeCount: 0,
    };
    row.claims += store.claims;
    row.sum += store.sum;
    row.storeCount += 1;
    map.set(store.city, row);
  }
  return [...map.values()].sort(
    (a, b) => b.claims - a.claims || a.city.localeCompare(b.city),
  );
}

export function unlocatedClaimsFor(
  data: Pick<ClaimedPrizeBook, "unlocatedClaims" | "unlocatedByGame">,
  game: ClaimedGame | "all",
): number | null {
  if (game === "all") {
    return Number.isInteger(data.unlocatedClaims) && data.unlocatedClaims >= 0
      ? data.unlocatedClaims
      : null;
  }
  const count = data.unlocatedByGame?.[game];
  if (count == null || !Number.isInteger(count) || count < 0) return null;
  return count;
}

export function claimedFilterNote(
  stores: ClaimedStore[],
  unlocated: number | null,
): string {
  const tail = claimedLongTail(stores);
  const share = tail.totalClaims ? Math.round(tail.top10Share * 100) : 0;
  const parts = [
    `${tail.storeCount.toLocaleString("en-US")} stores. The top 10 are about ${share}% of listed claims.`,
    `${tail.onceCount.toLocaleString("en-US")} stores appear once.`,
  ];
  if (unlocated != null) {
    parts.push(`${unlocated.toLocaleString("en-US")} listed cards had no store.`);
  }
  return parts.join(" ");
}

export function claimedLongTail(stores: ClaimedStore[]): ClaimedLongTail {
  const ranked = [...stores].sort(
    (a, b) =>
      b.claims - a.claims ||
      b.sum - a.sum ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  );
  const totalClaims = ranked.reduce((n, store) => n + store.claims, 0);
  const top10Claims = ranked.slice(0, 10).reduce((n, store) => n + store.claims, 0);
  return {
    storeCount: ranked.length,
    totalClaims,
    top10Claims,
    top10Share: totalClaims ? top10Claims / totalClaims : 0,
    onceCount: ranked.filter((store) => store.claims === 1).length,
  };
}

export function listedGapDays(asOf: string, lastDate: string): number | null {
  if (!asOf || !lastDate) return null;
  const end = Date.parse(`${asOf}T00:00:00Z`);
  const start = Date.parse(`${lastDate}T00:00:00Z`);
  if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
  return Math.round((end - start) / 86_400_000);
}

export function pickBusyCounter(stores: ClaimedStore[]): ClaimedStore | null {
  return [...stores].sort(
    (a, b) =>
      b.claims - a.claims ||
      b.sum - a.sum ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  )[0] ?? null;
}

export function pickFatTicket(
  stores: ClaimedStore[],
  exclude: Array<ClaimedStore | null> = [],
): ClaimedStore | null {
  const skip = new Set(
    exclude.filter((store): store is ClaimedStore => store != null).map(storeKey),
  );
  const ranked = [...stores]
    .filter((store) => store.sum > 0 && !skip.has(storeKey(store)))
    .sort(
      (a, b) =>
        b.sum / b.claims - a.sum / a.claims ||
        b.sum - a.sum ||
        a.claims - b.claims ||
        a.name.localeCompare(b.name),
    );
  return ranked[0] ?? null;
}

export function pickQuietList(
  stores: ClaimedStore[],
  asOf: string,
  exclude: Array<ClaimedStore | null> = [],
): ClaimedStore | null {
  const skip = new Set(
    exclude.filter((store): store is ClaimedStore => store != null).map(storeKey),
  );
  let best: ClaimedStore | null = null;
  let bestGap = Number.NEGATIVE_INFINITY;
  for (const store of stores) {
    if (!store.lastDate || skip.has(storeKey(store))) continue;
    const gap = listedGapDays(asOf, store.lastDate);
    if (gap == null) continue;
    if (
      !best ||
      gap > bestGap ||
      (gap === bestGap &&
        (store.name.localeCompare(best.name) < 0 ||
          (store.name === best.name && store.city.localeCompare(best.city) < 0)))
    ) {
      best = store;
      bestGap = gap;
    }
  }
  return best;
}

export function pickClaimedWalk(
  data: ClaimedPrizeBook,
  game: ClaimedGame | "all",
): ClaimedWalk {
  const rows = filterClaimedStores(data, game);
  const busy = pickBusyCounter(rows);
  const fat = pickFatTicket(rows, [busy]);
  const quiet = pickQuietList(rows, data.asOf, [busy, fat]);
  return {
    busy,
    fat,
    quiet,
    quietGapDays: quiet ? listedGapDays(data.asOf, quiet.lastDate) : null,
  };
}

export function claimedTooltip(store: ClaimedStore): string {
  return `Listed ${store.claims} claimed prizes at ${store.name}, ${store.city} per Washington's Lottery winners search.`;
}

export function claimedPageLead(): string {
  return `${CLAIMED_SAME_ODDS} ${CLAIMED_QUESTION}`;
}

export function copyHasBannedPhrase(text: string): string | null {
  if (text.includes("\u2014")) return "em dash";
  const lower = text.toLowerCase();
  for (const phrase of BANNED_COPY) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  if (/\bdue\b/i.test(text)) return "due";
  return null;
}

export function bookHasWinnerNames(data: ClaimedPrizeBook): boolean {
  return /"NAME:"|firstName|lastName|winnerName/.test(JSON.stringify(data));
}
