import book from "../data/waClaimedPrizesByStore.json";

export const CLAIMED_SAME_ODDS =
  "Every licensed retailer has the same chance of selling a jackpot ticket.";

export const CLAIMED_LOCATION_LINE = "Location does not change hit odds.";

export const CLAIMED_FIT_LINE =
  "This page counts claimed prizes Washington's Lottery listed in the last year, by the store on that row.";

export const CLAIMED_ENTERTAIN = "Entertainment, not prediction.";

export const CLAIMED_SOURCE_URL = "https://www.walottery.com/winners/Search.aspx";

export const CLAIMED_GAMES = [
  "Powerball",
  "Mega Millions",
  "Lotto",
  "Hit 5",
  "Match 4",
  "Scratch",
] as const;

export type ClaimedGame = (typeof CLAIMED_GAMES)[number];

export type ClaimedStore = {
  name: string;
  address: string;
  city: string;
  claims: number;
  sum: number;
  games: Partial<Record<ClaimedGame, number>>;
  gameSums: Partial<Record<ClaimedGame, number>>;
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
  merchandiseClaims: number;
  storeCount: number;
  dateMin: string | null;
  dateMax: string | null;
  games: Record<string, number>;
  stores: ClaimedStore[];
};

const BANNED_COPY = [
  "due soon",
  "running hot",
  "cooling off",
  "high confidence",
  "beats Quick Pick",
  "winning numbers",
  "buy here",
  "kiosk",
];

export const WA_CLAIMED = book as ClaimedPrizeBook;

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
            return { ...store, claims, sum: store.gameSums[game] ?? 0 };
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

export function claimedTooltip(store: ClaimedStore): string {
  return `Listed ${store.claims} claimed prizes at ${store.name}, ${store.city} per Washington's Lottery winners search. Not a forecast.`;
}

export function claimedPageLead(): string {
  return `${CLAIMED_SAME_ODDS} ${CLAIMED_LOCATION_LINE} ${CLAIMED_FIT_LINE} ${CLAIMED_ENTERTAIN}`;
}

export function copyHasBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  if (text.includes("\u2014")) return "em dash";
  for (const phrase of BANNED_COPY) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

export function bookHasWinnerNames(data: ClaimedPrizeBook): boolean {
  return /"NAME:"|firstName|lastName|winnerName/.test(JSON.stringify(data));
}
