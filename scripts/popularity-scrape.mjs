/**
 * Append California Lottery per-tier winner counts to src/data/winnerCounts.json.
 *
 * The CA DrawGameApi returns exact winner counts for all nine prize tiers of
 * Powerball and Mega Millions (California winners only, roughly the last nine
 * months). California is ~10% of national sales, which is plenty of signal for
 * fitting number-popularity weights. The archive is append-only: draws that
 * fall out of the API window are kept forever, so history accumulates.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/winnerCounts.json");

const GAMES = [
  { key: "powerball", caGameId: 12 },
  { key: "megamillions", caGameId: 15 },
];

/**
 * Canonical tier order. `s` is the special ball (Powerball / Mega Ball).
 * Counts are stored as a 9-element array in this order.
 */
export const TIER_ORDER = [
  "5+s",
  "5",
  "4+s",
  "4",
  "3+s",
  "3",
  "2+s",
  "1+s",
  "0+s",
];

function tierKey(description) {
  const desc = description.trim();
  const num = desc.match(/^(\d+)/);
  const whites = num ? Number(num[1]) : 0;
  const special = !num || desc.includes("+");
  return `${whites}${special ? "+s" : ""}`;
}

async function fetchPage(gameId, page, size) {
  const url = `https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/${gameId}/${page}/${size}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (jackpotdesk popularity bake)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function parseDraw(raw) {
  const date = String(raw.DrawDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const balls = Object.values(raw.WinningNumbers ?? {});
  const whites = balls
    .filter((b) => !b.IsSpecial)
    .map((b) => Number(b.Number))
    .sort((a, b) => a - b);
  const special = balls.find((b) => b.IsSpecial);
  if (whites.length !== 5 || !special) return null;

  const counts = new Array(TIER_ORDER.length).fill(null);
  for (const prize of Object.values(raw.Prizes ?? {})) {
    const idx = TIER_ORDER.indexOf(tierKey(prize.PrizeTypeDescription ?? ""));
    if (idx >= 0) counts[idx] = Number(prize.Count);
  }
  if (counts.some((c) => c === null || !Number.isFinite(c))) return null;

  return { date, n: whites, s: Number(special.Number), c: counts };
}

/** Fetch every draw the CA API will serve for one game. */
async function fetchGame(gameId) {
  const draws = [];
  for (let page = 1; page <= 40; page++) {
    const data = await fetchPage(gameId, page, 50);
    const rows = data?.PreviousDraws ?? [];
    for (const raw of rows) {
      const draw = parseDraw(raw);
      if (draw) draws.push(draw);
    }
    if (rows.length < 50) break;
  }
  return draws;
}

let previous = { games: {} };
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  // First bake.
}

const payload = {
  updated: new Date().toISOString(),
  source:
    "calottery.com DrawGameApi — California winner counts per prize tier",
  scope: "California winners only (~10% of national sales)",
  tierOrder: TIER_ORDER,
  games: {},
};

let failures = 0;
for (const { key, caGameId } of GAMES) {
  const existing = previous.games?.[key]?.draws ?? {};
  const merged = { ...existing };
  let fresh = 0;
  try {
    for (const draw of await fetchGame(caGameId)) {
      if (!merged[draw.date]) fresh++;
      merged[draw.date] = { n: draw.n, s: draw.s, c: draw.c };
    }
  } catch (err) {
    failures++;
    console.error(`${key}: keeping previous archive —`, err.message ?? err);
  }
  const dates = Object.keys(merged).sort();
  payload.games[key] = { draws: merged };
  console.error(
    `${key}: ${dates.length} draws archived (${fresh} new), ${dates[0] ?? "-"} .. ${dates[dates.length - 1] ?? "-"}`,
  );
}

if (failures === GAMES.length && Object.keys(previous.games ?? {}).length) {
  console.error("all fetches failed; leaving winnerCounts.json untouched");
  process.exit(0);
}

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.error(`wrote ${outPath}`);
