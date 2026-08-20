# JackpotDesk

Live site: [https://www.jackpotdesk.com](https://www.jackpotdesk.com)

The product is **The Ladder**: a ranked feed of boards scored against official draw history (frequency, pairs, recent heat, winning shapes). Same hit odds as Quick Pick. The ranking re-scores when new official draws land; winner-count archives are append-only, so the models compound.

Secondary tools:

1. **This week:** expected value using cash jackpot, tax, and split risk.
2. **Desk:** Ladder (default), Pattern lab, Desk pick (least-crowded), Quick mint, plus Heat and the number pool on one slip.
3. **Recap** ([`/recap`](https://www.jackpotdesk.com/recap)): public scored replay of the latest official draw versus that night’s Ladder #1–#3. Auto-published at 5:00 a.m. Pacific daily. Does not list tonight’s #1.
4. **Pool:** members, shares, and payout splits in this browser.

This does **not** raise the chance of winning. Hit odds match Quick Pick. The live site is a free experiment; how we might charge later is in [`docs/BUSINESS.md`](docs/BUSINESS.md). How it looks and how copy is written: [`docs/STYLE.md`](docs/STYLE.md). Engines, claims, and the private digest: [`docs/`](docs/).

## Local

```bash
npm install
npm run dev
```

## GitHub Pages + custom domain

The site deploys from `main` via `.github/workflows/deploy.yml`. `public/CNAME` is set to `www.jackpotdesk.com` so the canonical host is www. GitHub redirects the apex to www.

At your registrar, point the domain at GitHub Pages:

**A records** for `@` / `jackpotdesk.com`:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | `<your-github-username>.github.io` |

In the GitHub repo: **Settings → Pages → Custom domain** `www.jackpotdesk.com`, then enable **Enforce HTTPS** after DNS propagates (can take up to 24 hours). Keep the apex A records so `jackpotdesk.com` can redirect to www.

## Washington draw feed (Cloudflare Worker)

The browser cannot fetch `walottery.com` or `calottery.com` (CORS). A Worker caches the boards and national jackpots and serves JSON to `www.jackpotdesk.com`. The site falls back to the baked `src/data/waDraws.json` and `src/data/marketQuotes.json` if the Worker is cold or down. The same Worker also hosts `/jackpot-wins` for the US jackpot map (public jackpot tickets by sale state, not every prize), `/market` for advertised Powerball / Mega Millions jackpots, and `POST /write-desk` for [Write the desk](docs/DESK.md).

One-time setup:

1. Cloudflare account, then in this repo:

```bash
npx wrangler login
npx wrangler deploy
npx wrangler secret put FEED_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put DESK_TO_EMAIL
```

Use a long random string for `FEED_SECRET`. Wrangler prints a URL like `https://jackpotdesk-wa.<you>.workers.dev`.

2. Put that origin in `wrangler.toml` as `PUBLIC_ORIGIN` (no path) and the `/wa-draws` URL in `src/config.ts` as `WA_DRAWS_URL`. Redeploy the Worker.

3. GitHub repo secrets (Settings → Secrets → Actions):

- `WA_DRAWS_URL` — same URL as in `src/config.ts`
- `WA_FEED_SECRET` — same value as the Worker secret

GitHub Actions then scrapes the Lottery (Node, no CPU cap) and `PUT`s JSON to the Worker on every Pages deploy and on the twice-daily schedule. The same job bakes and `PUT`s the US jackpot map to `/jackpot-wins`. The Worker cron is a backup scrape for Washington boards only.

Locally, `npm run bake:wa` and `npm run bake:map` still write the fallback files. `npm run dev` will call the live Worker if it is deployed.
