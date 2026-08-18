/**
 * CORS JSON host for Washington Lottery boards.
 * GET is public. PUT (Actions) needs FEED_SECRET. Cron scrapes as a backup.
 */
import { isWaBook, scrapeWaLottery } from "../scripts/wa-lottery.mjs";

const ALLOW = new Set([
  "https://www.jackpotdesk.com",
  "https://jackpotdesk.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
]);

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

function cacheRequest(url) {
  const origin = new URL(url).origin;
  return new Request(`${origin}/wa-draws`);
}

async function readCache(url) {
  try {
    return await caches.default.match(cacheRequest(url));
  } catch (err) {
    console.error("cache match failed", err);
    return undefined;
  }
}

let lastBook = null;

async function writeCache(url, book) {
  lastBook = book;
  const res = new Response(JSON.stringify(book), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
  try {
    await caches.default.put(cacheRequest(url), res.clone());
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

async function refresh(url, previousJson) {
  let previous = {};
  try {
    previous = previousJson ? JSON.parse(previousJson) : {};
  } catch {
    previous = {};
  }
  const book = await scrapeWaLottery(previous);
  await writeCache(url, book);
  return book;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = request.url;

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
      if (!isWaBook(book)) {
        return jsonResponse({ error: "invalid book" }, request, 400);
      }
      book.fetchedAt = new Date().toISOString();
      await writeCache(url, book);
      return jsonResponse({ ok: true, asOf: book.asOf }, request);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "method" }, request, 405);
    }

    if (lastBook && isWaBook(lastBook)) {
      return jsonResponse(lastBook, request);
    }

    const hit = await readCache(url);
    if (hit) {
      const headers = new Headers(hit.headers);
      for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);
      return new Response(request.method === "HEAD" ? null : hit.body, {
        status: 200,
        headers,
      });
    }

    ctx.waitUntil(
      refresh(url).catch((err) => console.error("wa scrape failed", err)),
    );
    return jsonResponse({ error: "warming" }, request, 503);
  },

  async scheduled(_event, env, ctx) {
    const origin = env.PUBLIC_ORIGIN;
    if (!origin) return;
    ctx.waitUntil(
      refresh(`${origin.replace(/\/$/, "")}/wa-draws`).catch((err) =>
        console.error("wa cron failed", err),
      ),
    );
  },
};
