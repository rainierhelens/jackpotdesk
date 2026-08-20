export type RecapTone = "no" | "entertain" | "rare";

export type RecapRung = {
  rank: number;
  board: string;
  points: number;
  crowd: string | null;
  why: string;
  matchLine: string;
};

export type RecapNational = {
  label: string;
  extraLabel: string;
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: RecapTone;
  officialDate: string;
  officialBoard: string;
  historyBefore: number;
  rungs: RecapRung[];
  ladderHref: string;
};

export type RecapWashington = {
  label: string;
  when: string;
  prizeLine: string;
  officialDate: string;
  officialBoard: string;
  historyBefore: number;
  rungs: RecapRung[];
  ladderHref: string;
};

export type RecapPayload = {
  asOf: string;
  national: RecapNational[];
  washington: RecapWashington[];
  notes: string[];
};

export function recapToneClass(tone: RecapTone): string {
  if (tone === "rare") return "is-rare";
  if (tone === "entertain") return "is-entertain";
  return "is-skip";
}

export function recapCallLabel(tone: RecapTone): string {
  if (tone === "rare") return "RARE PLUS";
  if (tone === "entertain") return "ENTERTAIN ONLY";
  return "SKIP";
}
