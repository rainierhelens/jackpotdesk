export type GameId = "powerball" | "megamillions";

export type DeskId = "national" | "washington";

export type WaGameId =
  | "hit5"
  | "lotto"
  | "match4"
  | "pick3"
  | "keno"
  | "cashpop";

export type Filters = {
  birthday: boolean;
  sequence: boolean;
  multiples: boolean;
  previous: boolean;
  visual: boolean;
  hot: boolean;
  cold: boolean;
  lastDraw: boolean;
  uniqueSlip: boolean;
};

export type Pick3Way = "straight" | "box";

/** Washington slip fades. Same hit odds; skip crowded public tickets. */
export type WaFilters = {
  uniqueSlip: boolean;
  birthday: boolean;
  highBall: boolean;
  sequence: boolean;
  multiples: boolean;
  visual: boolean;
  previous: boolean;
  lastDraw: boolean;
  hot: boolean;
  cold: boolean;
  areaCodes: boolean;
  dates: boolean;
  doubles: boolean;
  decade: boolean;
  lowHalf: boolean;
  luckyPops: boolean;
};

export type Ticket = {
  id: string;
  whites: number[];
  extra: number;
};

export type Member = {
  id: string;
  name: string;
  shares: number;
  paid: boolean;
};

export type Pool = {
  name: string;
  game: GameId;
  members: Member[];
  tickets: Ticket[];
};

export type GameSpec = {
  id: GameId;
  label: string;
  whiteMax: number;
  extraMax: number;
  extraLabel: string;
  ticketCost: number;
  jackpotOdds: number;
};

export type PrizeTier = {
  label: string;
  odds: number;
  prize: number;
  isJackpot: boolean;
};
