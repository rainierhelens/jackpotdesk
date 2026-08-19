/**
 * CORS JSON host for Washington boards, the US jackpot map, and national jackpots.
 * GET is public. PUT (Actions) needs FEED_SECRET. Cron scrapes WA as a backup.
 * POST /write-desk sends support mail via Resend (DESK_TO_EMAIL).
 */
import { isWaBook, scrapeWaLottery } from "../scripts/wa-lottery.mjs";
import { fetchCaMarket, isMarketBook } from "../scripts/market-feed.mjs";

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
  market: "/market",
  write: "/write-desk",
};

const last = { wa: null, map: null, market: null };

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOW.has(origin) ? origin : "https://www.jackpotdesk.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
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
  if (pathname === PATHS.market || pathname.startsWith(`${PATHS.market}/`)) {
    return "market";
  }
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
  if (kind === "map") return isJackpotBook(book);
  if (kind === "market") return isMarketBook(book);
  return isWaBook(book);
}

async function refreshMarket(origin) {
  const book = await fetchCaMarket();
  await writeCache(origin, "market", book);
  return book;
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanSecret(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u202F]/g, " ")
    .trim()
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
    .replace(/^mailto:/i, "")
    .trim();
}

function deskInbox(value) {
  const raw = cleanSecret(value);
  const angled = raw.match(/^(.+)<([^>]+)>$/);
  const email = (angled ? angled[2] : raw).trim();
  return EMAIL_RE.test(email) ? raw : "";
}

function writeResponse(body, request, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function rateLimited(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = new Request(`https://desk.internal/write-desk/${ip}`);
  const hit = await caches.default.match(key);
  if (hit) return true;
  await caches.default.put(
    key,
    new Response("1", { headers: { "Cache-Control": "max-age=45" } }),
  );
  return false;
}

async function sendResend(env, payload) {
  const apiKey = cleanSecret(env.RESEND_API_KEY);
  const to = deskInbox(env.DESK_TO_EMAIL);
  const from = cleanSecret(env.DESK_FROM) || "JackpotDesk <onboarding@resend.dev>";
  if (!apiKey || !to) {
    const raw = typeof env.DESK_TO_EMAIL === "string" ? env.DESK_TO_EMAIL : "";
    console.error("desk inbox unset or invalid", {
      hasKey: Boolean(apiKey),
      rawLen: raw.length,
      hasAt: raw.includes("@"),
    });
    return { ok: false, closed: true };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload({ from, to })),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error("resend failed", response.status, text);
    return { ok: false };
  }
  return { ok: true };
}

async function handleWriteDesk(request, env) {
  if (request.method !== "POST") {
    return writeResponse({ error: "method" }, request, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return writeResponse({ error: "invalid json" }, request, 400);
  }
  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (company) return writeResponse({ ok: true }, request);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 20 || message.length > 4000) {
    return writeResponse({ error: "message" }, request, 400);
  }
  const reply =
    typeof body.reply === "string" && EMAIL_RE.test(body.reply.trim())
      ? body.reply.trim()
      : "";
  if (await rateLimited(request)) {
    return writeResponse({ error: "rate" }, request, 429);
  }

  const sent = await sendResend(env, ({ from, to }) => ({
    from,
    to: [to],
    subject: "Desk note",
    text: `${message}\n\n${reply ? `Reply: ${reply}` : "No reply address."}`,
  }));
  if (sent.closed) return writeResponse({ error: "desk closed" }, request, 503);
  if (!sent.ok) return writeResponse({ error: "mail" }, request, 502);

  if (reply) {
    await sendResend(env, ({ from }) => ({
      from,
      to: [reply],
      subject: "The desk got your note",
      text:
        "The desk received your note and reads these when it can. JackpotDesk does not sell tickets and does not send winning numbers. Same hit odds as Quick Pick.\n",
    }));
  }
  return writeResponse({ ok: true }, request);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const parsed = new URL(request.url);
    if (
      parsed.pathname === PATHS.write ||
      parsed.pathname === `${PATHS.write}/`
    ) {
      return handleWriteDesk(request, env);
    }
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
    if (kind === "market") {
      ctx.waitUntil(
        refreshMarket(origin).catch((err) =>
          console.error("market scrape failed", err),
        ),
      );
    }
    return jsonResponse({ error: "warming" }, request, 503);
  },

  async scheduled(_event, env, ctx) {
    const origin = env.PUBLIC_ORIGIN;
    if (!origin) return;
    const host = origin.replace(/\/$/, "");
    ctx.waitUntil(
      Promise.all([
        refreshWa(host).catch((err) => console.error("wa cron failed", err)),
        refreshMarket(host).catch((err) =>
          console.error("market cron failed", err),
        ),
      ]),
    );
  },
};
