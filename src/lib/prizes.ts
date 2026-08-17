import type { GameId, GameSpec, PrizeTier } from "../types";

export const GAMES: Record<GameId, GameSpec> = {
  powerball: {
    id: "powerball",
    label: "Powerball",
    whiteMax: 69,
    extraMax: 26,
    extraLabel: "Powerball",
    ticketCost: 2,
    jackpotOdds: 292_201_338,
  },
  megamillions: {
    id: "megamillions",
    label: "Mega Millions",
    whiteMax: 70,
    extraMax: 24,
    extraLabel: "Mega Ball",
    ticketCost: 5,
    jackpotOdds: 290_472_336,
  },
};

/** Official base-game prize chart. Power Play / Megaplier not included. */
export const PRIZE_TABLE: Record<GameId, PrizeTier[]> = {
  powerball: [
    { label: "5 + Powerball", odds: 292_201_338, prize: 0, isJackpot: true },
    { label: "5", odds: 11_688_053.52, prize: 1_000_000, isJackpot: false },
    { label: "4 + Powerball", odds: 913_129.18, prize: 50_000, isJackpot: false },
    { label: "4", odds: 36_525.17, prize: 100, isJackpot: false },
    { label: "3 + Powerball", odds: 14_494.11, prize: 100, isJackpot: false },
    { label: "3", odds: 579.76, prize: 7, isJackpot: false },
    { label: "2 + Powerball", odds: 701.33, prize: 7, isJackpot: false },
    { label: "1 + Powerball", odds: 91.98, prize: 4, isJackpot: false },
    { label: "Powerball only", odds: 38.32, prize: 4, isJackpot: false },
  ],
  megamillions: [
    { label: "5 + Mega Ball", odds: 290_472_336, prize: 0, isJackpot: true },
    { label: "5", odds: 12_629_232, prize: 1_000_000, isJackpot: false },
    { label: "4 + Mega Ball", odds: 893_761, prize: 10_000, isJackpot: false },
    { label: "4", odds: 38_859, prize: 500, isJackpot: false },
    { label: "3 + Mega Ball", odds: 13_965, prize: 200, isJackpot: false },
    { label: "3", odds: 607, prize: 10, isJackpot: false },
    { label: "2 + Mega Ball", odds: 665, prize: 10, isJackpot: false },
    { label: "1 + Mega Ball", odds: 86, prize: 4, isJackpot: false },
    { label: "Mega Ball only", odds: 35, prize: 2, isJackpot: false },
  ],
};

export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return Math.round(result);
}
