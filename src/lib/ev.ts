import type { GameId } from "../types";
import { GAMES, PRIZE_TABLE, combinations } from "./prizes";

export type EvInputs = {
  advertisedJackpot: number;
  cashJackpot: number;
  ticketsSold: number;
  federalTax: number;
  stateTax: number;
  humanTicketShare: number;
};

export type EvScenario = {
  label: string;
  lambda: number;
  shareFactor: number;
  jackpotEv: number;
  lowerEv: number;
  grossEv: number;
  netEv: number;
};

export type EvResult = {
  afterTaxCash: number;
  lowerEv: number;
  unique: EvScenario;
  crowded: EvScenario;
  birthdayComboCount: number;
  fullComboCount: number;
};

/** E[1 / (1 + K)] for K ~ Poisson(lambda): expected jackpot share if you win. */
export function expectedShareFactor(lambda: number): number {
  if (lambda <= 1e-12) return 1;
  return (1 - Math.exp(-lambda)) / lambda;
}

export function lowerPrizeEv(game: GameId): number {
  return PRIZE_TABLE[game]
    .filter((tier) => !tier.isJackpot)
    .reduce((sum, tier) => sum + tier.prize / tier.odds, 0);
}

export function computeEv(game: GameId, inputs: EvInputs): EvResult {
  const spec = GAMES[game];
  const fullComboCount = spec.jackpotOdds;
  const birthdayComboCount = combinations(31, 5) * spec.extraMax;
  const tax = Math.min(0.95, Math.max(0, inputs.federalTax + inputs.stateTax));
  const afterTaxCash = Math.max(0, inputs.cashJackpot) * (1 - tax);
  const n = Math.max(0, inputs.ticketsSold);
  const f = Math.min(0.9, Math.max(0, inputs.humanTicketShare));
  const lowerEv = lowerPrizeEv(game);

  const lambdaUnique = ((1 - f) * n) / fullComboCount;
  const lambdaCrowded =
    (f * n) / birthdayComboCount + ((1 - f) * n) / fullComboCount;

  function scenario(label: string, lambda: number): EvScenario {
    const shareFactor = expectedShareFactor(lambda);
    const jackpotEv = (afterTaxCash * shareFactor) / spec.jackpotOdds;
    const grossEv = jackpotEv + lowerEv;
    return {
      label,
      lambda,
      shareFactor,
      jackpotEv,
      lowerEv,
      grossEv,
      netEv: grossEv - spec.ticketCost,
    };
  }

  return {
    afterTaxCash,
    lowerEv,
    unique: scenario("Unique random ticket", lambdaUnique),
    crowded: scenario("Birthday / pattern ticket", lambdaCrowded),
    birthdayComboCount,
    fullComboCount,
  };
}

export function playAdvice(netEv: number): {
  tone: "no" | "entertain" | "rare";
  text: string;
} {
  if (netEv < -1) {
    return {
      tone: "no",
      text: "Don't buy this as an investment. You are paying about two dollars for a story.",
    };
  }
  if (netEv < 0) {
    return {
      tone: "entertain",
      text: "Still negative expected value. Fine as entertainment if you already planned to play.",
    };
  }
  return {
    tone: "rare",
    text: "Non-negative under these assumptions, and still a terrible way to invest. You almost always lose the stake. The model is a sketch, not a priced contract.",
  };
}

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const moneyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseMoney(raw: string): number {
  const t = raw.trim().toLowerCase().replace(/[$,_\s]/g, "");
  const match = t.match(/^(-?[\d.]+)(k|m|b)?$/);
  if (!match) return Number(t) || 0;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return 0;
  const suffix = match[2];
  const mul = suffix === "b" ? 1e9 : suffix === "m" ? 1e6 : suffix === "k" ? 1e3 : 1;
  return n * mul;
}

export function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, "")}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  return money.format(n);
}
