/** Bake national advertised jackpots into src/data/marketQuotes.json */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCaMarket } from "./market-feed.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(ROOT, "src/data/marketQuotes.json");

const payload = await fetchCaMarket();
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.error(
  `wrote market quotes as of ${payload.asOf} (${payload.games.powerball.advertised} PB / ${payload.games.megamillions.advertised} MM)`,
);
