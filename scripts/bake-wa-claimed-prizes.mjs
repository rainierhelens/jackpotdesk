import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_URL, buildClaimedPrizeBook, bookHasWinnerNames } from "./wa-claimed-prizes.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcOut = resolve(root, "src/data/waClaimedPrizesByStore.json");
const publicOut = resolve(root, "public/data/wa-claimed-prizes-by-store.json");

async function loadHtml() {
  const fromFlag = process.argv.find((arg) => arg.startsWith("--from="));
  if (fromFlag) {
    return readFile(fromFlag.slice("--from=".length), "utf8");
  }
  const res = await fetch(SOURCE_URL, {
    headers: { "user-agent": "JackpotDesk/0.1 (+https://www.jackpotdesk.com/)" },
  });
  if (!res.ok) {
    throw new Error(`Winners search returned ${res.status}`);
  }
  return res.text();
}

const html = await loadHtml();
const book = buildClaimedPrizeBook(html);
if (bookHasWinnerNames(book)) {
  throw new Error("Refusing to bake a book that still contains winner names.");
}
const json = `${JSON.stringify(book, null, 2)}\n`;
await mkdir(dirname(publicOut), { recursive: true });
await writeFile(srcOut, json);
await writeFile(publicOut, json);
console.log(
  `baked ${book.locatedClaims} located claims · ${book.storeCount} stores · ${book.dateMin}–${book.dateMax}`,
);
