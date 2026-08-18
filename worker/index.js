/**
 * CORS JSON host for Washington boards and the US jackpot map.
 * GET is public. PUT (Actions) needs FEED_SECRET. Cron scrapes WA as a backup.
 */
import { isWaBook, scrapeWaLottery } from "../scripts/wa-lottery.mjs";

const ALLOW = new Set([
  "https://www.jackpotdesk.com",
  "https://jackpotdesk.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
]);

const PATHS = {
  wa: "/wa-draws",
  map: "/jackpot-wins",
};

const last = { wa: null, map: null };

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOW.has(origin) ? origin : "https://www.jackpotdesk.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(body, request, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

function feedKind(pathname) {
  if (pathname === PATHS.map || pathname.startsWith(`${PATHS.map}/`)) return "map";
  return "wa";
}

function cacheRequest(origin, kind) {
  return new Request(`${origin}${PATHS[kind]}`);
}

async function readCache(origin, kind) {
  try {
    return await caches.default.match(cacheRequest(origin, kind));
  } catch (err) {
    console.error("cache match failed", err);
    return undefined;
  }
}

async function writeCache(origin, kind, book) {
  last[kind] = book;
  const res = new Response(JSON.stringify(book), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
  try {
    await caches.default.put(cacheRequest(origin, kind), res.clone());
  } catch (err) {
    console.error("cache put failed", err);
  }
  return res;
}

function authorized(request, env) {
  const secret = env.FEED_SECRET;
  if (!secret) return false;
  const header = request.headers.get("Authorization") || "";
  return header === `Bearer ${secret}`;
}

function isJackpotBook(data) {
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
    if (n >= 40) return true;
  }
  return n >= 40;
}

function validBook(kind, book) {
  return kind === "map" ? isJackpotBook(book) : isWaBook(book);
}

async function cachedWaBook(origin) {
  if (last.wa && validBook("wa", last.wa)) return last.wa;
  const hit = await readCache(origin, "wa");
  if (!hit) return {};
  try {
    return await hit.json();
  } catch {
    return {};
  }
}

async function refreshWa(origin) {
  const previous = await cachedWaBook(origin);
  const book = await scrapeWaLottery(previous);
  await writeCache(origin, "wa", book);
  return book;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const parsed = new URL(request.url);
    const kind = feedKind(parsed.pathname);
    const origin = parsed.origin;

    if (request.method === "PUT") {
      if (!authorized(request, env)) {
        return jsonResponse({ error: "unauthorized" }, request, 401);
      }
      let book;
      try {
        book = await request.json();
      } catch {
        return jsonResponse({ error: "invalid json" }, request, 400);
      }
      if (!validBook(kind, book)) {
        return jsonResponse({ error: "invalid book" }, request, 400);
      }
      book.fetchedAt = new Date().toISOString();
      await writeCache(origin, kind, book);
      return jsonResponse({ ok: true, asOf: book.asOf }, request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "method" }, request, 405);
    }

    const memory = last[kind];
    if (memory && validBook(kind, memory)) {
      return jsonResponse(memory, request);
    }

    const hit = await readCache(origin, kind);
    if (hit) {
      const headers = new Headers(hit.headers);
      for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);
      return new Response(request.method === "HEAD" ? null : hit.body, {
        status: 200,
        headers,
      });
    }

    if (kind === "wa") {
      ctx.waitUntil(
        refreshWa(origin).catch((err) => console.error("wa scrape failed", err)),
      );
    }
    return jsonResponse({ error: "warming" }, request, 503);
  },

  async scheduled(_event, env, ctx) {
    const origin = env.PUBLIC_ORIGIN;
    if (!origin) return;
    ctx.waitUntil(
      refreshWa(origin.replace(/\/$/, "")).catch((err) =>
        console.error("wa cron failed", err),
      ),
    );
  },
};
