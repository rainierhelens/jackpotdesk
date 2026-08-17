# JackpotDesk

Live site: [https://www.jackpotdesk.com](https://www.jackpotdesk.com)

Free Powerball and Mega Millions desk:

1. **This week** — expected value using cash jackpot, tax, and split risk.
2. **Tickets** — random picks that skip birthdays, sequences, recent winners, and this matrix’s recently drawn, long-gap, and overdue whites.
3. **Pool** — members, shares, and payout splits in this browser.

This does **not** raise the chance of winning. Hit odds match Quick Pick. The benefit is fewer jackpot splits and a pass on bad drawings.

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
