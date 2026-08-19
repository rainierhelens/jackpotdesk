export const SITE_URL = "https://www.jackpotdesk.com";
export const SITE_NAME = "JackpotDesk";

/** Cloudflare Worker JSON feed. After `npx wrangler deploy`, paste that URL here. */
export const WA_DRAWS_URL =
  import.meta.env.VITE_WA_DRAWS_URL ||
  "https://jackpotdesk-wa.darren-bacon.workers.dev/wa-draws";

export const JACKPOT_WINS_URL =
  import.meta.env.VITE_JACKPOT_WINS_URL ||
  WA_DRAWS_URL.replace(/\/wa-draws\/?$/, "/jackpot-wins");

/** National advertised jackpots. Worker caches California; baked JSON is the fallback. */
export const MARKET_QUOTES_URL =
  import.meta.env.VITE_MARKET_QUOTES_URL ||
  WA_DRAWS_URL.replace(/\/wa-draws\/?$/, "/market");

/** Worker route for Write the desk. Same origin as the WA feed. */
export const WRITE_DESK_URL =
  import.meta.env.VITE_WRITE_DESK_URL ||
  WA_DRAWS_URL.replace(/\/wa-draws\/?$/, "/write-desk");

/**
 * Outbound tip jar (Ko-fi or Stripe Payment Link). Blank means the tip
 * page explains the jar is not open yet. Do not put a personal name here.
 */
export const TIP_JAR_URL = import.meta.env.VITE_TIP_JAR_URL || "";
