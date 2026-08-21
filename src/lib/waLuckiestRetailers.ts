import book from "../data/waLuckiestRetailers.json";

export const HIT_SAME_ODDS =
  "Every licensed retailer has the same chance of selling a jackpot ticket.";

export const HIT_LOCATION_LINE = "Location does not change hit odds.";

export const HIT_FIT_LINE =
  "This page is stores that sold the most $1,000+ winning tickets in the Lottery's published year.";

export const HIT_ENTERTAIN = "Entertainment, not prediction.";

export const HIT_TOOLTIP =
  "Sold N tickets of $1,000+ in YEAR per Washington's Lottery.";

export const WA_LUCKIEST_REGIONS = [
  "Olympic Peninsula",
  "North Puget Sound",
  "South Puget Sound",
  "Southwest",
  "Central",
  "Eastern",
  "Tri-Cities",
] as const;

export type WaLuckiestRegion = (typeof WA_LUCKIEST_REGIONS)[number];

export type WaLuckiestStore = {
  year: number;
  region: WaLuckiestRegion;
  name: string;
  address: string;
  city: string;
  wins: number;
  sourceUrl: string;
};

export type WaLuckiestRegionTotal = {
  year: number;
  region: WaLuckiestRegion;
  storeCount: number;
  top10Wins: number;
  pressStatedTotal: number | null;
  sourceUrl: string;
};

export type WaLuckiestBook = {
  asOf: string;
  published: string;
  coverage: string;
  note: string;
  source: string;
  sources: { year: number; region: WaLuckiestRegion; url: string }[];
  regions: WaLuckiestRegionTotal[];
  stores: WaLuckiestStore[];
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

export const WA_LUCKIEST = book as WaLuckiestBook;

export function parseWaLuckiestBook(raw: unknown): WaLuckiestBook {
  if (!raw || typeof raw !== "object") {
    throw new Error("Luckiest retailers book is missing.");
  }
  const data = raw as WaLuckiestBook;
  if (!Array.isArray(data.stores) || data.stores.length === 0) {
    throw new Error("Luckiest retailers book has no stores.");
  }
  for (const store of data.stores) {
    if (
      !Number.isInteger(store.year) ||
      !store.region ||
      !store.name ||
      !store.address ||
      !store.city ||
      !Number.isInteger(store.wins) ||
      store.wins < 1 ||
      !isOfficialSource(store.sourceUrl)
    ) {
      throw new Error(`Bad luckiest retailer row: ${store.name} ${store.year}`);
    }
    if ("lat" in store || "lng" in store || "kiosk" in store || "sales" in store) {
      throw new Error(`Store row has banned fields: ${store.name}`);
    }
  }
  return data;
}

export function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "walottery.com";
  } catch {
    return false;
  }
}

export function yearsInBook(data: WaLuckiestBook = WA_LUCKIEST): number[] {
  return [...new Set(data.stores.map((s) => s.year))].sort((a, b) => b - a);
}

export function filterLuckiestStores(
  data: WaLuckiestBook,
  year: number | "all",
  region: WaLuckiestRegion | "all",
): WaLuckiestStore[] {
  const rows = data.stores.filter((store) => {
    if (year !== "all" && store.year !== year) return false;
    if (region !== "all" && store.region !== region) return false;
    return true;
  });
  return sortLuckiestStores(rows);
}

export function sortLuckiestStores(stores: WaLuckiestStore[]): WaLuckiestStore[] {
  return [...stores].sort(
    (a, b) =>
      b.wins - a.wins ||
      b.year - a.year ||
      a.region.localeCompare(b.region) ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  );
}

export function regionHeat(
  data: WaLuckiestBook,
  year: number | "all",
): { region: WaLuckiestRegion; top10Wins: number; storeCount: number }[] {
  const rows =
    year === "all"
      ? data.regions
      : data.regions.filter((row) => row.year === year);
  const byRegion = new Map<
    WaLuckiestRegion,
    { top10Wins: number; storeCount: number }
  >();
  for (const row of rows) {
    const prev = byRegion.get(row.region) ?? { top10Wins: 0, storeCount: 0 };
    byRegion.set(row.region, {
      top10Wins: prev.top10Wins + row.top10Wins,
      storeCount: prev.storeCount + row.storeCount,
    });
  }
  return WA_LUCKIEST_REGIONS.map((region) => ({
    region,
    top10Wins: byRegion.get(region)?.top10Wins ?? 0,
    storeCount: byRegion.get(region)?.storeCount ?? 0,
  }));
}

export function heatFill(wins: number, maxWins: number): string {
  if (maxWins <= 0 || wins <= 0) return "#18181b";
  const t = wins / maxWins;
  const g = Math.round(40 + t * 159);
  return `rgb(0 ${g} ${Math.round(28 + t * 60)})`;
}

export function storeTooltip(store: WaLuckiestStore): string {
  return `Sold ${store.wins} tickets of $1,000+ in ${store.year} per Washington's Lottery.`;
}

export function copyHasBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  if (text.includes("\u2014")) return "em dash";
  for (const phrase of BANNED_COPY) {
    if (lower.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

export function pageLead(): string {
  return `${HIT_SAME_ODDS} ${HIT_LOCATION_LINE} ${HIT_FIT_LINE} ${HIT_ENTERTAIN}`;
}
