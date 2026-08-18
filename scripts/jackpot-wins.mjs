/** Public Powerball / Mega Millions jackpot tickets by sale state. Merge scrape + baked history. */

const PAGES = {
  powerball: "https://portalseven.com/lottery/powerball_jackpot_winners.jsp",
  megamillions: "https://portalseven.com/lottery/mega_millions_jackpot_winners.jsp",
};

const UA =
  "Mozilla/5.0 (compatible; JackpotDesk/1.0; +https://www.jackpotdesk.com; jackpot-map feed)";
const JACKPOT_FLOOR = 20_000_000;

const MONTHS = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

const STATES = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "PUERTO RICO": "PR",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  "VIRGIN ISLANDS": "VI",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
};

const ABBR = new Set([...Object.values(STATES), "DC"]);

const CITY_STATE = {
  "ROCKY POINT": "NY",
  WYANDANCH: "NY",
  "NORTH BELLMORE": "NY",
  "MAHOPAC FALLS": "NY",
  "NEW WINDSOR": "NY",
  "TOMS RIVER": "NJ",
  "MILL VALLEY": "CA",
  "SOUTH WEBSTER": "OH",
  "COMSTOCK PARK": "MI",
  STREAMWOOD: "IL",
};

const INFORMAL = [
  [/\bGA\./i, "GA"],
  [/\bFLA\./i, "FL"],
  [/\bCALIF\./i, "CA"],
  [/\bNYC\b/i, "NY"],
  [/\bN\.Y\./i, "NY"],
  [/\bN\.J\./i, "NJ"],
];

const ROW =
  /\$?\s*([\d,.]+)\s*(Billion|Million|Millions|M)?\s+Date\s*:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+Winner\s*:\s*(.*?)\s+Store Location\s*:\s*(.*?)\s+Winning Numbers/gi;

const SHARES = /Total\s+(\d+)\s+Winners/i;
const ZIP_STATE = /,\s*([A-Za-z .'-]+?)[,\s]+([A-Z]{2})\s*-?\s*\d{5}\b/;
const ABBR_TAIL = /\b([A-Z]{2})\s*-?\s*\d{5}\b/;
const ABBR_COMMA = /,\s*([A-Z]{2})\.?(?:\s|,|$)/;

function parseAmount(num, unit) {
  let n = Number(String(num).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = String(unit || "").toLowerCase();
  if (u === "billion") n *= 1_000_000_000;
  else if (u === "million" || u === "millions" || u === "m") n *= 1_000_000;
  else if (n < 10_000) n *= 1_000_000;
  return Math.round(n);
}

function parseDate(raw) {
  const m = String(raw)
    .replace(/\s+/g, " ")
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m || MONTHS[m[1]] == null) return null;
  const iso = `${m[3]}-${String(MONTHS[m[1]] + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function cityState(location) {
  const loc = String(location || "").trim();
  const upper = loc.toUpperCase();
  for (const [pat, st] of INFORMAL) {
    if (pat.test(loc)) {
      const before = loc.split(pat)[0].replace(/[,\s]+$/, "");
      const city = before.split(",").pop()?.replace(/\bin\s+$/i, "").trim();
      return { city: city || null, state: st };
    }
  }
  for (const [cityName, st] of Object.entries(CITY_STATE)) {
    if (upper.includes(cityName)) return { city: titleCity(cityName), state: st };
  }
  if (upper.includes("ILOTTERY") || upper.includes("I-LOTTERY")) {
    return { city: "iLottery", state: "IL" };
  }
  if (upper.includes("NEW YORK LOTTERY") && upper.includes("SUBSCRIB")) {
    return { city: "Lottery subscription", state: "NY" };
  }
  if (upper.includes("PUERTO RICO") || /\bPR\b/.test(loc)) {
    const city = loc.includes(",") ? loc.split(",")[0].trim() : "Puerto Rico";
    return { city: city.slice(0, 48), state: "PR" };
  }
  if (/\bWASHINGTON,\s*D\.?C\.?\b/i.test(loc) || /\bDC\s+\d{5}\b/.test(loc)) {
    return { city: "Washington", state: "DC" };
  }
  const zip = loc.match(ZIP_STATE);
  if (zip && ABBR.has(zip[2])) {
    return { city: zip[1].replace(/^[\s-]+|[\s-]+$/g, "") || null, state: zip[2] };
  }
  const tail = loc.match(ABBR_TAIL);
  if (tail && ABBR.has(tail[1])) {
    const before = loc.slice(0, tail.index).replace(/[,\s]+$/, "");
    return { city: before.split(",").pop()?.trim() || null, state: tail[1] };
  }
  const comma = loc.match(ABBR_COMMA);
  if (comma && ABBR.has(comma[1])) {
    const before = loc.slice(0, comma.index).replace(/[,\s]+$/, "");
    return { city: before.split(",").pop()?.trim() || null, state: comma[1] };
  }
  const names = Object.keys(STATES).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(loc)) {
      const before = loc.split(re)[0].replace(/[,\s]+$/, "");
      return { city: before.split(",").pop()?.trim() || null, state: STATES[name] };
    }
  }
  if (upper.includes("NOT AVAILABLE")) return { city: null, state: null };
  return { city: null, state: null };
}

function titleCity(name) {
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

function toText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
}

export function parseJackpotPage(html, game) {
  const text = toText(html);
  const rows = [];
  const seen = new Set();
  ROW.lastIndex = 0;
  let m;
  while ((m = ROW.exec(text))) {
    const advertised = parseAmount(m[1], m[2]);
    const date = parseDate(m[3]);
    const winner = String(m[4]).replace(/\s+/g, " ").trim();
    const location = String(m[5]).replace(/\s+/g, " ").trim();
    if (!date || advertised < 1_000_000) continue;
    const shareHit = winner.match(SHARES);
    const shares = shareHit ? Number(shareHit[1]) : 1;
    const { city, state } = cityState(location);
    if (!state) continue;
    const key = `${game}|${date}|${advertised}|${state}|${location.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      game,
      date,
      advertised,
      shares: Number.isFinite(shares) && shares > 0 ? shares : 1,
      state,
      city,
    });
  }
  return rows;
}

function winKey(row) {
  return `${row.game}|${row.date}|${row.state}|${String(row.city || "").toLowerCase()}|${row.advertised}`;
}

export function isJackpotBook(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.wins) || data.wins.length < 40) return false;
  if (typeof data.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.asOf)) {
    return false;
  }
  let n = 0;
  for (const row of data.wins) {
    if (!row || typeof row !== "object") return false;
    if (row.game !== "powerball" && row.game !== "megamillions") return false;
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      return false;
    }
    if (typeof row.advertised !== "number" || row.advertised < 1_000_000) {
      return false;
    }
    if (typeof row.shares !== "number" || row.shares < 1) return false;
    if (typeof row.state !== "string" || row.state.length !== 2) return false;
    n += 1;
    if (n >= 40) break;
  }
  return true;
}

function asOfFrom(wins) {
  let latest = "1970-01-01";
  for (const row of wins) {
    if (row.date > latest) latest = row.date;
  }
  return latest;
}

function dayKey(row) {
  return `${row.game}|${row.date}|${row.state}`;
}

function upsertWins(prevWins, scraped) {
  const byFull = new Map();
  const days = new Set();
  for (const row of prevWins) {
    byFull.set(winKey(row), row);
    days.add(dayKey(row));
  }
  for (const row of scraped) {
    const full = winKey(row);
    const existing = byFull.get(full);
    if (existing) {
      if (!existing.city && row.city) byFull.set(full, row);
      continue;
    }
    if (days.has(dayKey(row))) continue;
    byFull.set(full, row);
    days.add(dayKey(row));
  }
  return [...byFull.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.game !== b.game) return a.game.localeCompare(b.game);
    return a.state.localeCompare(b.state);
  });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/json" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function scrapePortalSeven() {
  const rows = [];
  for (const [game, url] of Object.entries(PAGES)) {
    rows.push(...parseJackpotPage(await fetchText(url), game));
  }
  return rows;
}

function parseCompactAmount(raw) {
  const m = String(raw)
    .replace(/,/g, "")
    .match(/\$?\s*([\d.]+)\s*(billion|million|millions|b|m)?/i);
  if (!m) return 0;
  return parseAmount(m[1], m[2]);
}

function parseSlashDate(raw) {
  const m = String(raw)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${String(Number(m[1])).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

function parseShortMonthDate(raw) {
  const m = String(raw)
    .replace(/\s+/g, " ")
    .trim()
    .match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return parseDate(raw);
  const months = {
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
  if (months[m[1]] == null) return null;
  return `${m[3]}-${String(months[m[1]] + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

function statesFrom(raw) {
  return [...String(raw).matchAll(/\b([A-Z]{2})\b/g)]
    .map((m) => m[1])
    .filter((st) => ABBR.has(st));
}

export function parseMegaGallery(html) {
  const rows = [];
  const item =
    /winnerListPrizeAmt">\s*([^<]+)<[\s\S]*?winnerListLocation">\s*([^<]+)<[\s\S]*?winnerListDate">\s*([^<]+)</gi;
  let m;
  while ((m = item.exec(html))) {
    const advertised = parseCompactAmount(m[1]);
    const date = parseSlashDate(m[3]);
    const { city, state } = cityState(m[2]);
    if (!date || !state || advertised < JACKPOT_FLOOR) continue;
    rows.push({
      game: "megamillions",
      date,
      advertised,
      shares: 1,
      state,
      city: city && city.toLowerCase() === "online" ? "iLottery" : city,
    });
  }
  return rows;
}

export function parseLotteryUsaTable(html, game) {
  const rows = [];
  const block =
    /<strong>\s*(\$[^<]+)<\/strong>[\s\S]*?<td>\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\s*<\/td>\s*<td>\s*([^<]+)<\/td>/gi;
  let m;
  while ((m = block.exec(html))) {
    const advertised = parseCompactAmount(m[1]);
    const date = parseShortMonthDate(m[2]);
    const states = statesFrom(m[3]);
    if (!date || advertised < JACKPOT_FLOOR || states.length === 0) continue;
    const shares = Math.max(1, states.length);
    for (const state of states) {
      rows.push({
        game,
        date,
        advertised,
        shares,
        state,
        city: null,
      });
    }
  }
  return rows;
}

function parseWikiAmount(raw) {
  const m = String(raw)
    .replace(/,/g, "")
    .match(/\$([\d.]+)\s*([bm])/i);
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2].toLowerCase() === "b" ? Math.round(n * 1e9) : Math.round(n * 1e6);
}

export function parseWikipediaRecords(wikitext) {
  const rows = [];
  const chunks = String(wikitext).split(/\n\|-/);
  for (const chunk of chunks) {
    const gameHit = chunk.match(/\[\[(Powerball|Mega Millions)\]\]|(Powerball|Mega Millions)/i);
    if (!gameHit) continue;
    const game = /mega/i.test(gameHit[0]) ? "megamillions" : "powerball";
    const amountHit = chunk.match(/\$[\d.]+[bm]/i);
    const dateHit = chunk.match(
      /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})/,
    );
    if (!amountHit || !dateHit) continue;
    const advertised = parseWikiAmount(amountHit[0]);
    const date = parseDate(dateHit[1]);
    const tickets = Number(chunk.match(/\n\|\s*(\d+)\s*\n/)?.[1] || 1);
    const locChunk = chunk.split(dateHit[1])[1] || "";
    const states = [
      ...new Set(
        [...locChunk.matchAll(/\b([A-Z]{2})\b/g)]
          .map((m) => m[1])
          .filter((st) => ABBR.has(st)),
      ),
    ];
    if (!date || advertised < JACKPOT_FLOOR || states.length === 0) continue;
    const shares = Number.isFinite(tickets) && tickets > 0 ? tickets : Math.max(1, states.length);
    for (const state of states) {
      rows.push({
        game,
        date,
        advertised,
        shares,
        state,
        city: null,
      });
    }
  }
  return rows;
}

async function scrapeMegaGallery() {
  return parseMegaGallery(
    await fetchText("https://www.megamillions.com/Winners-Gallery.aspx"),
  );
}

async function scrapeLotteryUsa() {
  return parseLotteryUsaTable(
    await fetchText("https://www.lotteryusa.com/powerball/jackpots"),
    "powerball",
  );
}

async function scrapeWikipedia() {
  const url =
    "https://en.wikipedia.org/w/api.php?action=parse&page=Lottery_jackpot_records&prop=wikitext&format=json";
  const data = JSON.parse(await fetchText(url));
  const text = data?.parse?.wikitext?.["*"];
  if (!text) throw new Error("wikipedia wikitext missing");
  return parseWikipediaRecords(text);
}

export async function scrapeJackpotWins(previous = {}) {
  const prevWins = Array.isArray(previous.wins) ? previous.wins : [];
  const scraped = [];
  const errors = [];
  const jobs = [
    ["portalseven", scrapePortalSeven],
    ["mega-gallery", scrapeMegaGallery],
    ["lotteryusa", scrapeLotteryUsa],
    ["wikipedia", scrapeWikipedia],
  ];
  for (const [name, job] of jobs) {
    try {
      const rows = await job();
      scraped.push(...rows);
      console.error(`${name}: ${rows.length} rows`);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : err}`);
      console.error(`${name} failed`, err);
    }
  }
  if (scraped.length === 0) {
    throw new Error(`jackpot scrape empty (${errors.join("; ") || "no sources"})`);
  }
  const wins = upsertWins(prevWins, scraped);
  return {
    asOf: asOfFrom(wins),
    fetchedAt: new Date().toISOString(),
    source:
      "Public jackpot tickets by sale state (PortalSeven when reachable, plus Mega Millions gallery, LotteryUSA, Wikipedia records). Not lower-tier prizes.",
    note: "Public jackpot tickets by sale state. Not lower-tier prizes.",
    wins,
  };
}
