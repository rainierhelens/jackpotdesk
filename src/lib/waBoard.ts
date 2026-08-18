import { yearTint, JACKPOT_WINS, winYear } from "./jackpotMap";
import type { GameId } from "../types";
import book from "../data/waRetailers.json";
import localJackpots from "../data/waJackpots.json";

export type WaRegion =
  | "South Puget Sound"
  | "North Puget Sound"
  | "Olympic Peninsula"
  | "Eastern"
  | "Southwest"
  | "Tri-Cities"
  | "Central";

export type WaMapGame = GameId | "hit5" | "lotto";
export type WaTicketFilter = "all" | WaMapGame;

export type WaStore = {
  id: string;
  region: WaRegion;
  name: string;
  address: string;
  city: string;
  wins: number;
  lat: number;
  lng: number;
  year: number;
  kind?: "retailer" | "jackpot";
  game?: WaMapGame;
  advertised?: number;
  date?: string;
  shares?: number;
};

type LocalJackpot = {
  game: "hit5" | "lotto";
  date: string;
  advertised: number;
  shares: number;
  name: string;
  address: string;
  city: string;
  region: WaRegion;
  lat: number;
  lng: number;
};

const WA_LOCAL_JACKPOTS = localJackpots.wins as LocalJackpot[];
export const WA_JACKPOT_AS_OF = localJackpots.asOf;
export const WA_JACKPOT_SOURCE = localJackpots.source;

export const WA_AS_OF = book.asOf;
export const WA_SOURCE = book.source;
export const WA_STORES = book.stores as WaStore[];
export const WA_REGIONS = [
  "South Puget Sound",
  "North Puget Sound",
  "Olympic Peninsula",
  "Eastern",
  "Southwest",
  "Tri-Cities",
  "Central",
] as const;

export function pinRadius(wins: number, maxWins: number): number {
  const t = maxWins <= 0 ? 0 : wins / maxWins;
  return 4.5 + t * 9;
}

export function pinFill(store: WaStore): string {
  if (store.kind === "jackpot") {
    if (store.game === "megamillions") return "#f1fd0e";
    if (store.game === "hit5") return "#4ade80";
    if (store.game === "lotto") return "#38bdf8";
    return "#fb7185";
  }
  return yearTint(storeYear(store));
}

export function waGameShort(game: WaMapGame): string {
  if (game === "hit5") return "H5";
  if (game === "lotto") return "LT";
  return game === "powerball" ? "PB" : "MM";
}

export function waGameLabel(game: WaMapGame): string {
  if (game === "hit5") return "Hit 5";
  if (game === "lotto") return "Lotto";
  return game === "powerball" ? "Powerball" : "Mega Millions";
}

export function storeYear(store: WaStore): number {
  return store.year ?? Number(WA_AS_OF);
}

export function yearsInStores(stores: WaStore[]): number[] {
  return [...new Set(stores.map(storeYear))].sort((a, b) => a - b);
}

export function waYearSpan(): number {
  let oldest = Number(WA_AS_OF);
  let newest = oldest;
  for (const store of WA_STORES) {
    const year = storeYear(store);
    if (year < oldest) oldest = year;
    if (year > newest) newest = year;
  }
  return Math.max(1, newest - oldest + 1);
}

export function waWinsSpan(stores: WaStore[]): { min: number; max: number } {
  if (stores.length === 0) return { min: 0, max: 0 };
  let min = stores[0].wins;
  let max = stores[0].wins;
  for (const store of stores) {
    if (store.wins < min) min = store.wins;
    if (store.wins > max) max = store.wins;
  }
  return { min, max };
}

export function filterWaStores(
  region: WaRegion | "all",
  yearsShown = waYearSpan(),
): WaStore[] {
  const newest = Number(WA_AS_OF);
  const oldest = newest - Math.min(Math.max(1, yearsShown), waYearSpan()) + 1;
  const rows = (region === "all" ? WA_STORES : WA_STORES.filter((s) => s.region === region)).filter(
    (s) =>
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng) &&
      storeYear(s) >= oldest,
  );
  return [...rows].sort((a, b) => b.wins - a.wins || a.city.localeCompare(b.city));
}

const WA_CITY_POINT: Record<string, { lat: number; lng: number }> = {
  Auburn: { lat: 47.3073, lng: -122.2285 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  "South Seattle": { lat: 47.5483, lng: -122.3115 },
  "North Bend": { lat: 47.4957, lng: -121.7865 },
  Hoquiam: { lat: 46.9809, lng: -123.8893 },
};

function pointForCity(city: string): { lat: number; lng: number } | null {
  const named = WA_CITY_POINT[city];
  if (named) return named;
  const store = WA_STORES.find(
    (s) => s.city.toLowerCase() === city.toLowerCase(),
  );
  return store ? { lat: store.lat, lng: store.lng } : null;
}

function regionForCity(city: string): WaRegion {
  const store = WA_STORES.find(
    (s) => s.city.toLowerCase() === city.toLowerCase(),
  );
  if (store) return store.region;
  if (city === "Hoquiam") return "Olympic Peninsula";
  return "South Puget Sound";
}

export function waJackpotYearSpan(game: WaMapGame): number {
  const years =
    game === "hit5" || game === "lotto"
      ? WA_LOCAL_JACKPOTS.filter((w) => w.game === game).map((w) =>
          winYear(w.date),
        )
      : JACKPOT_WINS.filter((w) => w.state === "WA" && w.game === game).map(
          (w) => winYear(w.date),
        );
  if (years.length === 0) return 1;
  return Math.max(1, Math.max(...years) - Math.min(...years) + 1);
}

export function waJackpots(game: WaMapGame, yearsShown: number): WaStore[] {
  if (game === "hit5" || game === "lotto") {
    return waLocalJackpots(game, yearsShown);
  }
  const pool = JACKPOT_WINS.filter((w) => w.state === "WA" && w.game === game);
  const years = pool.map((w) => winYear(w.date));
  const newest = years.length ? Math.max(...years) : Number(WA_AS_OF);
  const span = waJackpotYearSpan(game);
  const oldest = newest - Math.min(Math.max(1, yearsShown), span) + 1;
  const rows: WaStore[] = [];
  for (const win of pool) {
    if (winYear(win.date) < oldest) continue;
    const city = win.city ?? "Washington";
    const point = pointForCity(city);
    if (!point) continue;
    rows.push({
      id: `jp-${win.game}-${win.date}-${city}`,
      region: regionForCity(city),
      name:
        win.game === "powerball" ? "Powerball jackpot" : "Mega Millions jackpot",
      address: city,
      city,
      wins: 1,
      lat: point.lat,
      lng: point.lng,
      year: winYear(win.date),
      kind: "jackpot",
      game: win.game,
      advertised: win.advertised,
      date: win.date,
    });
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function waLocalJackpots(
  game: "hit5" | "lotto",
  yearsShown: number,
): WaStore[] {
  const pool = WA_LOCAL_JACKPOTS.filter((w) => w.game === game);
  const years = pool.map((w) => winYear(w.date));
  const newest = years.length ? Math.max(...years) : Number(WA_AS_OF);
  const span = waJackpotYearSpan(game);
  const oldest = newest - Math.min(Math.max(1, yearsShown), span) + 1;
  return pool
    .filter((win) => winYear(win.date) >= oldest)
    .map((win) => ({
      id: `wa-${win.game}-${win.date}-${win.city}-${win.address}`,
      region: win.region,
      name: win.name,
      address: win.address,
      city: win.city,
      wins: win.shares,
      lat: win.lat,
      lng: win.lng,
      year: winYear(win.date),
      kind: "jackpot" as const,
      game: win.game,
      advertised: win.advertised,
      date: win.date,
      shares: win.shares,
    }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
