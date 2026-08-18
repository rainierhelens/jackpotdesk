/** Shared Washington Lottery scrape. Used by the bake script and the Worker. */

export const WA_GAMES = [
  ["hit5", "hit5"],
  ["lotto", "lotto"],
  ["match4", "match4"],
  ["pick3", "pick3"],
  ["keno", "dailykeno"],
  ["cashpop", "cashpop"],
];

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const UA = "JackpotDesk/1.0 (+https://www.jackpotdesk.com; wa-draw feed)";

function isoDate(label) {
  const m = String(label).match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[3], MONTHS[m[1]], +m[2])).toISOString().slice(0, 10);
}

function drawKey(row) {
  return `${row.date}|${row.numbers.join(",")}`;
}

/** Union fresh scrape rows with any prior archive. Newest first. */
export function mergeDraws(fresh, previous = []) {
  const seen = new Set();
  const out = [];
  for (const row of [...fresh, ...previous]) {
    if (!row?.date || !Array.isArray(row.numbers) || row.numbers.length === 0) {
      continue;
    }
    const key = drawKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date: row.date, numbers: row.numbers });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

export function parseDraws(html) {
  const blocks = html.split('class="table-viewport-small"');
  const draws = [];
  for (const block of blocks.slice(1)) {
    const dateMatch = block.match(/h2-like">([^<]+)</);
    const date = dateMatch ? isoDate(dateMatch[1]) : null;
    const ballChunk = block.split("</ul>")[0] ?? "";
    const numbers = [...ballChunk.matchAll(/<li>(\d+)<\/li>/g)].map((row) =>
      Number(row[1]),
    );
    if (!date || numbers.length === 0) continue;
    draws.push({ date, numbers });
  }
  return draws;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function money(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function isWaBook(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.draws || !data.prizes) return false;
  for (const [id] of WA_GAMES) {
    if (!Array.isArray(data.draws[id]) || data.draws[id].length < 10) return false;
  }
  const cashpot = data.prizes.hit5?.cashpot;
  const advertised = data.prizes.lotto?.advertised;
  const cash = data.prizes.lotto?.cash;
  return (
    typeof cashpot === "number" &&
    cashpot > 0 &&
    typeof advertised === "number" &&
    advertised > 0 &&
    typeof cash === "number" &&
    cash > 0
  );
}

export async function scrapeWaLottery(previous = {}) {
  const prevPrizes = previous.prizes ?? {};
  const prevDraws = previous.draws ?? {};
  const draws = {};
  for (const [id, slug] of WA_GAMES) {
    const url = `https://walottery.com/winningnumbers/pastdrawings.aspx?gamename=${slug}&unittype=day&unitcount=180`;
    const html = await fetchHtml(url);
    const fresh = parseDraws(html);
    if (fresh.length < 10) {
      throw new Error(`${id}: expected at least 10 drawings, got ${fresh.length}`);
    }
    // walottery.com only serves 180 days. Keep every draw we have already seen.
    draws[id] = mergeDraws(fresh, prevDraws[id] ?? []);
  }

  const hit5Html = await fetchHtml("https://walottery.com/JackpotGames/Hit5.aspx");
  const lottoHtml = await fetchHtml("https://walottery.com/JackpotGames/Lotto.aspx");

  const payload = {
    asOf: new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    source: "https://walottery.com/winningnumbers/pastdrawings.aspx",
    draws,
    prizes: {
      hit5: {
        cashpot:
          money(hit5Html, [
            /cashpot[^$]{0,80}\$([0-9,]+)/i,
            /\$([0-9,]+)\s*cashpot/i,
            /Estimated Cashpot[^$]*\$([0-9,]+)/i,
          ]) ?? prevPrizes.hit5?.cashpot ?? 230_000,
      },
      lotto: {
        advertised:
          money(lottoHtml, [
            /jackpot[^$]{0,80}\$([0-9,]+)/i,
            /\$([0-9,]+(?:\.[0-9]+)?)\s*million/i,
          ]) ?? prevPrizes.lotto?.advertised ?? 1_000_000,
        cash:
          money(lottoHtml, [
            /cash\s*(?:option|value)[^$]{0,120}\$([0-9]{1,3}(?:,[0-9]{3})+)/i,
          ]) ?? prevPrizes.lotto?.cash ?? 500_000,
      },
    },
  };

  if (
    /\$([0-9.]+)\s*million/i.test(lottoHtml) &&
    payload.prizes.lotto.advertised < 10_000
  ) {
    const m = lottoHtml.match(/\$([0-9.]+)\s*million/i);
    if (m) payload.prizes.lotto.advertised = Math.round(Number(m[1]) * 1_000_000);
  }

  return payload;
}
