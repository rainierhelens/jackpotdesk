import { parseMoney } from "./ev";
import { WA_GAMES } from "./waGames";
import { waPrizes } from "./waDraws";

export function hit5CashpotEv(cashpot: number): number {
  return cashpot / WA_GAMES.hit5.jackpotOdds;
}

/** Two 6/49 plays per $1. Cash option only; annuity is not what you are paid. */
export function lottoCashEvPerDollar(cash: number): number {
  return (2 * cash) / WA_GAMES.lotto.jackpotOdds;
}

export function waPrizeInputs(
  cashpotRaw: string,
  advertisedRaw: string,
  cashRaw: string,
): { cashpot: number; advertised: number; cash: number } {
  const baked = waPrizes();
  const cashpot = parseMoney(cashpotRaw) || baked.hit5.cashpot;
  const advertised = parseMoney(advertisedRaw) || baked.lotto.advertised;
  const cash = parseMoney(cashRaw) || baked.lotto.cash;
  return { cashpot, advertised, cash };
}
