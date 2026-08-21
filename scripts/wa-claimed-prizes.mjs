/** Parse Washington’s Lottery Winners By Game HTML into store aggregates. No names. */

export const SOURCE_URL = "https://www.walottery.com/winners/Search.aspx";
export const SOURCE_LABEL =
  "Washington's Lottery Winners By Game search (walottery.com/winners/Search.aspx)";

export const CLAIMED_GAMES = [
  "Powerball",
  "Mega Millions",
  "Lotto",
  "Hit 5",
  "Match 4",
  "Scratch",
];

const MONTHS = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

export function parseListedDate(text) {
  const match = String(text).match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1]];
  if (!month) return null;
  return `${match[3]}-${month}-${String(match[2]).padStart(2, "0")}`;
}

export function parseAmount(text) {
  const cleaned = String(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const match = cleaned.match(/^\$([0-9,]+)$/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

export function parseLocation(html) {
  const match = String(html).match(
    /LOCATION:<\/strong>\s*([\s\S]*?)<\/td>/i,
  );
  if (!match) return null;
  const raw = match[1]
    .replace(/<br\s*\/?>/gi, "|")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const [namePart, addressPart] = raw.split("|").map((part) => part.trim());
  if (!namePart || !addressPart) return null;
  const bits = addressPart.split(",").map((part) => part.trim()).filter(Boolean);
  if (bits.length < 3) return null;
  const state = bits[bits.length - 1];
  if (state !== "WA") return null;
  const city = bits[bits.length - 2];
  const address = bits.slice(0, -2).join(", ");
  if (!city || !address) return null;
  return {
    name: namePart,
    address,
    city,
    state: "WA",
    locationKey: `${namePart}|${address}, ${city}, WA`,
  };
}

function resultsChunk(html) {
  const start = html.indexOf("search-winners-results-viewport-min");
  if (start < 0) return html;
  const end = html.indexOf("</section>", start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

export function parseClaimedPrizeCards(html) {
  const chunk = resultsChunk(html);
  const tables = [...chunk.matchAll(/<table>([\s\S]*?)<\/table>/g)].map(
    (match) => match[1],
  );
  const claims = [];
  let unlocated = 0;
  let merchandise = 0;
  for (const table of tables) {
    const dateMatch = table.match(
      /<strong>([A-Z][a-z]+ \d{1,2}, \d{4})<\/strong>/,
    );
    const gameMatch = table.match(/alt="([^"]+)"/);
    const date = dateMatch ? parseListedDate(dateMatch[1]) : null;
    const game = gameMatch?.[1] ?? null;
    if (!date || !game || !CLAIMED_GAMES.includes(game)) continue;
    const location = parseLocation(table);
    const amountCell = table.match(
      /NAME:<\/strong>[\s\S]*?<td>([\s\S]*?)<\/td>/i,
    );
    const amount = amountCell ? parseAmount(amountCell[1]) : null;
    if (amount == null) merchandise += 1;
    if (!location) {
      unlocated += 1;
      continue;
    }
    const scratch = table.match(/<p>([^<]+)<\/p>/);
    claims.push({
      date,
      game,
      scratchTitle:
        game === "Scratch" && scratch ? scratch[1].trim() : null,
      amount,
      name: location.name,
      address: location.address,
      city: location.city,
      locationKey: location.locationKey,
    });
  }
  return { claims, unlocated, merchandise, listed: tables.length };
}

export function aggregateClaimedStores(claims) {
  const map = new Map();
  for (const claim of claims) {
    const row = map.get(claim.locationKey) ?? {
      name: claim.name,
      address: claim.address,
      city: claim.city,
      claims: 0,
      sum: 0,
      games: {},
      gameSums: {},
      gameLastDates: {},
      firstDate: claim.date,
      lastDate: claim.date,
    };
    row.claims += 1;
    if (typeof claim.amount === "number") {
      row.sum += claim.amount;
      row.gameSums[claim.game] = (row.gameSums[claim.game] ?? 0) + claim.amount;
    }
    row.games[claim.game] = (row.games[claim.game] ?? 0) + 1;
    const priorGameLast = row.gameLastDates[claim.game];
    if (!priorGameLast || claim.date > priorGameLast) {
      row.gameLastDates[claim.game] = claim.date;
    }
    if (claim.date < row.firstDate) row.firstDate = claim.date;
    if (claim.date > row.lastDate) row.lastDate = claim.date;
    map.set(claim.locationKey, row);
  }
  return [...map.values()].sort(
    (a, b) =>
      b.claims - a.claims ||
      b.sum - a.sum ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  );
}

export function buildClaimedPrizeBook(html, fetchedAt = new Date().toISOString()) {
  const parsed = parseClaimedPrizeCards(html);
  const stores = aggregateClaimedStores(parsed.claims);
  const dates = parsed.claims.map((claim) => claim.date).sort();
  const gameTotals = Object.fromEntries(CLAIMED_GAMES.map((game) => [game, 0]));
  for (const claim of parsed.claims) gameTotals[claim.game] += 1;
  return {
    asOf: dates.at(-1) ?? fetchedAt.slice(0, 10),
    fetchedAt,
    source: SOURCE_LABEL,
    sourceUrl: SOURCE_URL,
    coverage:
      "Rolling last ~365 days of claimed prizes listed on Washington's Lottery Winners By Game search. Floor about $600. Not every winning ticket sold. Not sales volume. Winner names are not republished.",
    listedCards: parsed.listed,
    locatedClaims: parsed.claims.length,
    unlocatedClaims: parsed.unlocated,
    merchandiseClaims: parsed.merchandise,
    storeCount: stores.length,
    dateMin: dates[0] ?? null,
    dateMax: dates.at(-1) ?? null,
    games: gameTotals,
    stores,
  };
}

export function bookHasWinnerNames(book) {
  const blob = JSON.stringify(book);
  return /"NAME:"/i.test(blob) || /firstName|lastName|winnerName/.test(blob);
}
