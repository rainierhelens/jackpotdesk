/** Merge PortalSeven jackpot locations into src/data/jackpotWins.json */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeJackpotWins } from "./jackpot-wins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/jackpotWins.json");

let previous = {};
try {
  previous = JSON.parse(readFileSync(outPath, "utf8"));
} catch {
  // First bake.
}

try {
  const payload = await scrapeJackpotWins(previous);
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.error(`wrote ${payload.wins.length} jackpot tickets through ${payload.asOf}`);
} catch (err) {
  console.error("keeping previous jackpotWins.json", err);
}
