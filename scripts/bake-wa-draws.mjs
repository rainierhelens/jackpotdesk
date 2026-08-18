/** Bake Washington Lottery past drawings into src/data/waDraws.json */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeWaLottery } from "./wa-lottery.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/waDraws.json");
const archivePath = join(ROOT, "src/data/waWinnerCounts.json");

let previous = {};
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  // First bake.
}

const payload = await scrapeWaLottery(previous);

// walottery.com only serves a rolling 180 days, but the winner-count archive
// (appended daily by the popularity workflow) keeps every draw's numbers
// forever. Folding it in here means draw history deepens for as long as the
// site is live instead of staying capped at 180 days.
try {
  const archive = JSON.parse(readFileSync(archivePath, "utf8"));
  for (const [id, data] of Object.entries(archive.games ?? {})) {
    const rows = payload.draws[id];
    if (!Array.isArray(rows)) continue;
    const seen = new Set(rows.map((r) => `${r.date}|${r.numbers.join(",")}`));
    let added = 0;
    for (const [date, draw] of Object.entries(data.draws ?? {})) {
      if (!Array.isArray(draw?.n) || draw.n.length === 0) continue;
      const key = `${date}|${draw.n.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ date, numbers: draw.n });
      added += 1;
    }
    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    if (added > 0) console.error(`${id}: +${added} draws from the archive`);
  }
} catch {
  // No archive yet; the 180-day scrape stands alone.
}

writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
const n = Object.values(payload.draws).reduce((sum, rows) => sum + rows.length, 0);
console.error(`wrote ${n} draws`);
