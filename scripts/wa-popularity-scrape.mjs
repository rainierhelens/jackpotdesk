/**
 * Append Washington per-tier winner counts to src/data/waWinnerCounts.json.
 *
 * walottery.com's past-drawings pages include a prize table per draw
 * (Prize Level / Prize Amount / WA Winners / Total). Unlike the California
 * feed these counts are the game's entire player population. The page serves
 * up to 180 days per fetch; the archive is append-only so history accumulates.
 *
 * Pick 3 and Daily Keno pages publish no winner counts, so they are skipped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/waWinnerCounts.json");

const UA = "JackpotDesk/1.0 (+https://www.jackpotdesk.com; wa-draw feed)";

const GAMES = [
  { key: "hit5", slug: "hit5", pick: 5, poolMax: 42, tiers: [5, 4, 3, 2] },
  { key: "lotto", slug: "lotto", pick: 6, poolMax: 49, tiers: [6, 5, 4, 3] },
  { key: "match4", slug: "match4", pick: 4, poolMax: 24, tiers: [4, 3, 2] },
  // cashpop: one number 1-15; the winner total IS the popularity reading
  { key: "cashpop", slug: "cashpop", pick: 1, poolMax: 15, tiers: null },
];

const MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function isoDate(label) {
  const m = String(label).match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[3], MONTHS[m[1]], +m[2]))
    .toISOString()
    .slice(0, 10);
}

function cellsOf(rowHtml) {
  return [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
  );
}

function toCount(text) {
  if (!/^[\d,]+$/.test(text)) return null;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Parse one past-drawings page into { date, n, c } rows for a game. */
export function parseWinnerBlocks(html, game) {
  const draws = [];
  for (const block of html.split('class="table-viewport-small"').slice(1)) {
    const dateMatch = block.match(/h2-like">([^<]+)</);
    const date = dateMatch ? isoDate(dateMatch[1]) : null;
    const balls = [...(block.split("</ul>")[0] ?? "").matchAll(/<li>(\d+)<\/li>/g)]
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    if (!date || balls.length !== game.pick) continue;
    if (balls.some((n) => n < 1 || n > game.poolMax)) continue;

    // The block renders the same table twice (mobile + desktop); slicing to
    // the first Totals row keeps exactly one copy.
    const region = block.split(/Totals/i)[0] ?? "";
    const rows = [...region.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      cellsOf(m[1]),
    );

    if (game.tiers) {
      const byTier = new Map();
      for (const cells of rows) {
        const tier = cells[0]?.match(/^(\d+) of \d+$/);
        if (!tier) continue;
        // winners = first pure-number cell after the prize amount
        const count = cells.slice(2).map(toCount).find((c) => c !== null)
          ?? toCount(cells[2] ?? "");
        if (count !== null && !byTier.has(Number(tier[1]))) {
          byTier.set(Number(tier[1]), count);
        }
      }
      const c = game.tiers.map((k) => byTier.get(k) ?? null);
      if (c.some((x) => x === null)) continue;
      draws.push({ date, n: balls, c });
    } else {
      // cashpop: sum winners across the $-amount rows
      let total = 0;
      let seen = 0;
      for (const cells of rows) {
        if (!/^\$[\d,]+$/.test(cells[0] ?? "")) continue;
        const count = toCount(cells[1] ?? "");
        if (count === null) continue;
        total += count;
        seen++;
      }
      if (seen === 0) continue;
      draws.push({ date, n: balls, c: [total] });
    }
  }
  return draws;
}

async function fetchGame(game) {
  const url = `https://walottery.com/winningnumbers/pastdrawings.aspx?gamename=${game.slug}&unittype=day&unitcount=180`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return parseWinnerBlocks(await res.text(), game);
}

let previous = { games: {} };
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  // First bake.
}

const payload = {
  updated: new Date().toISOString(),
  source: "walottery.com past drawings — WA winner counts per prize tier",
  scope: "All Washington players (state-only games)",
  games: {},
};

let failures = 0;
for (const game of GAMES) {
  const existing = previous.games?.[game.key]?.draws ?? {};
  const merged = { ...existing };
  let fresh = 0;
  try {
    for (const draw of await fetchGame(game)) {
      if (!merged[draw.date]) fresh++;
      merged[draw.date] = { n: draw.n, c: draw.c };
    }
  } catch (err) {
    failures++;
    console.error(`${game.key}: keeping previous archive —`, err.message ?? err);
  }
  const dates = Object.keys(merged).sort();
  payload.games[game.key] = {
    pick: game.pick,
    poolMax: game.poolMax,
    tierOrder: game.tiers ? game.tiers.map(String) : ["pop"],
    draws: merged,
  };
  console.error(
    `${game.key}: ${dates.length} draws archived (${fresh} new), ${dates[0] ?? "-"} .. ${dates[dates.length - 1] ?? "-"}`,
  );
}

if (failures === GAMES.length && Object.keys(previous.games ?? {}).length) {
  console.error("all fetches failed; leaving waWinnerCounts.json untouched");
  process.exit(0);
}

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.error(`wrote ${outPath}`);
