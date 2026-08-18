import type { WaGameId } from "../types";

export type WaGameKind = "matrix" | "cashpop";

export type WaGameSpec = {
  id: WaGameId;
  label: string;
  kind: WaGameKind;
  whiteMax: number;
  whiteCount: number;
  ticketCost: number;
  jackpotOdds: number;
  extraLabel: string | null;
  note: string;
  minCount?: number;
  maxCount?: number;
  pairSize?: number;
};

export const WA_GAMES: Record<WaGameId, WaGameSpec> = {
  hit5: {
    id: "hit5",
    label: "Hit 5",
    kind: "matrix",
    whiteMax: 42,
    whiteCount: 5,
    ticketCost: 1,
    jackpotOdds: 850_668,
    extraLabel: null,
    note: "5 of 42. $1. Daily 8 p.m. PT. Cashpot starts at $100,000. Match 4 = $150, 3 = $15, 2 = a free ticket.",
  },
  lotto: {
    id: "lotto",
    label: "Lotto",
    kind: "matrix",
    whiteMax: 49,
    whiteCount: 6,
    ticketCost: 1,
    jackpotOdds: 13_983_816,
    extraLabel: null,
    pairSize: 2,
    note: "$1 buys two 6/49 plays. Jackpot starts at $1 million, cash option usually half. Mon / Wed / Sat 8 p.m. PT.",
  },
  match4: {
    id: "match4",
    label: "Match 4",
    kind: "matrix",
    whiteMax: 24,
    whiteCount: 4,
    ticketCost: 1,
    jackpotOdds: 10_626,
    extraLabel: null,
    note: "4 of 24. $1. Top prize is a fixed $10,000 — it does not roll like Hit 5 or Lotto.",
  },
  cashpop: {
    id: "cashpop",
    label: "Cash Pop",
    kind: "cashpop",
    whiteMax: 15,
    whiteCount: 1,
    ticketCost: 5,
    jackpotOdds: 15,
    extraLabel: null,
    note: "Each POP is $5. One number from 1–15 is drawn. The $25–$500 prize is printed at the register — Desk cannot mint prizes. Count is budget, not odds.",
    minCount: 1,
    maxCount: 15,
  },
};

export const WA_GAME_ORDER: WaGameId[] = ["hit5", "lotto", "match4", "cashpop"];

export const CASH_POP_CROWDED = [1, 7, 11, 13, 15];
