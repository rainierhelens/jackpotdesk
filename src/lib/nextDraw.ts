import type { GameId } from "../types";

const TZ = "America/New_York";

const DRAW: Record<
  GameId,
  { hour: number; minute: number; weekdays: number[]; timeLabel: string }
> = {
  powerball: {
    hour: 22,
    minute: 59,
    weekdays: [1, 3, 6],
    timeLabel: "10:59 p.m. ET",
  },
  megamillions: {
    hour: 23,
    minute: 0,
    weekdays: [2, 5],
    timeLabel: "11:00 p.m. ET",
  },
};

export type DrawPhase = {
  at: Date;
  status: "countdown" | "waiting";
  date: string;
  weekday: string;
  timeLabel: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function etParts(ms: number): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function etDate(ms: number): string {
  const p = etParts(ms);
  return `${p.year}-${p.month}-${p.day}`;
}

function weekdayName(isoDate: string): string {
  const at = etWallTime(isoDate, 12, 0);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(at);
}

function weekdayIndex(isoDate: string): number {
  const name = weekdayName(isoDate);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** Instant for an Eastern wall-clock time on a YYYY-MM-DD calendar date. */
export function etWallTime(isoDate: string, hour: number, minute: number): Date {
  const desired = `${isoDate}T${pad(hour)}:${pad(minute)}:00`;
  let utc = Date.parse(`${desired}Z`);
  for (let i = 0; i < 4; i += 1) {
    const p = etParts(utc);
    const shown = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
    utc += Date.parse(`${desired}Z`) - Date.parse(`${shown}Z`);
  }
  return new Date(utc);
}

function remaining(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function formatRemainCompact(ms: number): string {
  const { d, h, m, s } = remaining(ms);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(s)}s`;
}

export function formatRemainFull(ms: number): string {
  const { d, h, m, s } = remaining(ms);
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDrawWhen(isoDate: string): string {
  const at = etWallTime(isoDate, 12, 0);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(at);
}

export type DrawUrgency = "far" | "ok" | "soon" | "close" | "near" | "now";

export function drawUrgency(
  remainMs: number,
  status: DrawPhase["status"],
): DrawUrgency {
  if (status === "waiting" || remainMs <= 0) return "now";
  const hours = remainMs / 3_600_000;
  if (hours >= 36) return "far";
  if (hours >= 18) return "ok";
  if (hours >= 8) return "soon";
  if (hours >= 3) return "close";
  if (hours >= 1) return "near";
  return "now";
}

function candidate(
  game: GameId,
  isoDate: string,
  latestDate: string | null,
  now: number,
): DrawPhase | null {
  const spec = DRAW[game];
  const at = etWallTime(isoDate, spec.hour, spec.minute);
  const haveResults = Boolean(latestDate && latestDate >= isoDate);
  if (haveResults) return null;
  return {
    at,
    status: now < at.getTime() ? "countdown" : "waiting",
    date: isoDate,
    weekday: weekdayName(isoDate),
    timeLabel: spec.timeLabel,
  };
}

export function resolveDraw(
  game: GameId,
  feedDate: string | null,
  latestDate: string | null,
  now = Date.now(),
): DrawPhase {
  if (feedDate) {
    const fromFeed = candidate(game, feedDate, latestDate, now);
    if (fromFeed) return fromFeed;
  }

  const spec = DRAW[game];
  let day = etDate(now);
  for (let i = 0; i < 16; i += 1) {
    if (spec.weekdays.includes(weekdayIndex(day))) {
      const hit = candidate(game, day, latestDate, now);
      if (hit) return hit;
    }
    day = addDays(day, 1);
  }

  const fallback = addDays(etDate(now), 1);
  const at = etWallTime(fallback, spec.hour, spec.minute);
  return {
    at,
    status: "countdown",
    date: fallback,
    weekday: weekdayName(fallback),
    timeLabel: spec.timeLabel,
  };
}
