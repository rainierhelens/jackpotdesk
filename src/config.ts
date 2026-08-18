export const SITE_URL = "https://www.jackpotdesk.com";
export const SITE_NAME = "JackpotDesk";

/** Cloudflare Worker JSON feed. After `npx wrangler deploy`, paste that URL here. */
export const WA_DRAWS_URL =
  import.meta.env.VITE_WA_DRAWS_URL ||
  "https://jackpotdesk-wa.darren-bacon.workers.dev/wa-draws";
