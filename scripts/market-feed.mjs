/**
 * California Lottery next-draw jackpots for Powerball and Mega Millions.
 * Node and the Worker can fetch this. The browser cannot (CORS).
 */

const CA = { powerball: 12, megamillions: 15 };

function isoDate(raw) {
  if (typeof raw !== "string") return null;
  const day = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function isMarketBook(data) {
  if (!data || typeof data !== "object" || !data.games) return false;
  if (typeof data.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) {
    return false;
  }
  for (const id of Object.keys(CA)) {
    const row = data.games[id];
    if (!row || typeof row !== "object") return false;
    if (typeof row.advertised !== "number" || row.advertised <= 0) return false;
    if (typeof row.cash !== "number" || row.cash <= 0) return false;
  }
  return true;
}

async function fetchCaGame(id) {
  const url = `https://www.calottery.com/api/DrawGameApi/DrawGamePastDrawResults/${CA[id]}/1/1`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) {
    throw new Error(`Jackpot feed HTTP ${response.status}`);
  }
  const data = await response.json();
  const next = data?.NextDraw;
  const advertised = Number(next?.JackpotAmount);
  const cash = Number(next?.EstimatedCashValue);
  if (!Number.isFinite(advertised) || advertised <= 0) {
    throw new Error("Jackpot feed had no advertised amount");
  }
  if (!Number.isFinite(cash) || cash <= 0) {
    throw new Error("Jackpot feed had no cash value");
  }
  return {
    advertised,
    cash,
    nextDraw: isoDate(next?.DrawDate),
  };
}

export async function fetchCaMarket() {
  const games = {};
  for (const id of Object.keys(CA)) {
    games[id] = await fetchCaGame(id);
  }
  const nextDates = Object.values(games)
    .map((row) => row.nextDraw)
    .filter(Boolean)
    .sort();
  return {
    asOf: nextDates[0] ?? new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    source: "California Lottery (national jackpot)",
    games,
  };
}
