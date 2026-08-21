import { lookupTier } from "./settle";

export type DeskGameId = "powerball" | "megamillions" | "hit5" | "lotto";

export type DeskPay = {
  kind: "zero" | "cash" | "free-play" | "jackpot";
  amount: number | null;
  /** Mega Millions non-jackpot cash is the base ticket. No invented multiplier. */
  base: boolean;
};

export type DeskPaySource = {
  id?: string | null;
  label: string;
  officialWhites: number[];
  officialExtra: number | null;
  cashpot?: number | null;
  advertised?: string | number | null;
  cash?: string | number | null;
};

export type DeskPayRung = {
  whites: number[];
  extra: number | null;
  extraHit?: boolean | null;
};

/**
 * Official scored-replay prizes. Powerball reuses PRIZE_TABLE via lookupTier.
 * Mega Millions 1+MB / 0+MB on that table are the old $2 chart; the desk uses
 * the current base prizes ($7 / $5). Hit 5: WAC 315-39-040. Lotto: walottery.com.
 * Never invent a dollar or a multiplier.
 */
const HIT5_CASH: Record<number, number> = { 4: 150, 3: 15 };
const LOTTO_CASH: Record<number, number> = { 5: 1_000, 4: 30, 3: 3 };
const MEGA_CASH: Record<string, number> = {
  "5-0": 1_000_000,
  "4-1": 10_000,
  "4-0": 500,
  "3-1": 200,
  "3-0": 10,
  "2-1": 10,
  "1-1": 7,
  "0-1": 5,
};

export function deskGameId(source: {
  id?: string | null;
  label: string;
}): DeskGameId | null {
  const raw = `${source.id ?? ""} ${source.label}`.toLowerCase();
  if (raw.includes("powerball")) return "powerball";
  if (raw.includes("mega")) return "megamillions";
  if (raw.includes("hit") && raw.includes("5")) return "hit5";
  if (raw.includes("lotto")) return "lotto";
  return null;
}

function extraHitOn(source: DeskPaySource, rung: DeskPayRung): boolean {
  if (rung.extraHit === true) return true;
  if (rung.extraHit === false) return false;
  return (
    source.officialExtra != null &&
    rung.extra != null &&
    rung.extra === source.officialExtra
  );
}

function whiteHits(source: DeskPaySource, rung: DeskPayRung): number {
  const drawn = new Set(source.officialWhites);
  return rung.whites.filter((n) => drawn.has(n)).length;
}

function cashPay(amount: number, base = false): DeskPay {
  if (amount <= 0) return { kind: "zero", amount: 0, base: false };
  return { kind: "cash", amount, base };
}

export function deskPay(source: DeskPaySource, rung: DeskPayRung): DeskPay {
  const game = deskGameId(source);
  const hits = whiteHits(source, rung);
  const extra = extraHitOn(source, rung);

  if (game === "hit5") {
    if (hits >= 5) return { kind: "jackpot", amount: null, base: false };
    if (hits === 2) return { kind: "free-play", amount: null, base: false };
    return cashPay(HIT5_CASH[hits] ?? 0);
  }

  if (game === "lotto") {
    if (hits >= 6) return { kind: "jackpot", amount: null, base: false };
    return cashPay(LOTTO_CASH[hits] ?? 0);
  }

  if (game === "powerball") {
    const tier = lookupTier("powerball", hits, extra);
    if (!tier) return { kind: "zero", amount: 0, base: false };
    if (tier.isJackpot) return { kind: "jackpot", amount: null, base: false };
    return cashPay(tier.prize);
  }

  if (game === "megamillions") {
    if (hits >= 5 && extra) return { kind: "jackpot", amount: null, base: false };
    const amount = MEGA_CASH[`${Math.min(hits, 5)}-${extra ? 1 : 0}`] ?? 0;
    return cashPay(amount, amount > 0);
  }

  return { kind: "zero", amount: 0, base: false };
}

export function formatDeskCash(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

function withDollar(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
}

function jackpotTail(source: DeskPaySource): string {
  const game = deskGameId(source);
  if (game === "hit5") {
    const pot = source.cashpot;
    if (typeof pot === "number" && pot > 0) {
      return ` · cashpot ${formatDeskCash(pot)}`;
    }
    return "";
  }
  if (typeof source.cash === "number" && source.cash > 0) {
    return ` · cash ${formatDeskCash(source.cash)}`;
  }
  if (typeof source.cash === "string" && source.cash.trim()) {
    return ` · cash ${withDollar(source.cash)}`;
  }
  if (typeof source.advertised === "number" && source.advertised > 0) {
    return ` · advertised ${formatDeskCash(source.advertised)}`;
  }
  if (typeof source.advertised === "string" && source.advertised.trim()) {
    return ` · advertised ${withDollar(source.advertised)}`;
  }
  return "";
}

export function deskPayPhrase(
  source: DeskPaySource,
  rung: DeskPayRung,
  style: "full" | "short" = "full",
): string {
  const pay = deskPay(source, rung);
  if (pay.kind === "free-play") {
    return style === "full" ? "paid a free play" : "free play";
  }
  if (pay.kind === "jackpot") {
    const tail = jackpotTail(source);
    return style === "full" ? `paid the jackpot${tail}` : `jackpot${tail}`;
  }
  const cash = formatDeskCash(pay.amount ?? 0);
  if (pay.base) {
    return style === "full" ? `paid base ${cash}` : `base ${cash}`;
  }
  return style === "full" ? `paid ${cash}` : cash;
}
