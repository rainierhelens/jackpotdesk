/** Bake Washington Lottery past drawings into src/data/waDraws.json */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeWaLottery } from "./wa-lottery.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/waDraws.json");

let previous = {};
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  // First bake.
}

const payload = await scrapeWaLottery(previous);
writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
const n = Object.values(payload.draws).reduce((sum, rows) => sum + rows.length, 0);
console.error(`wrote ${n} draws`);
