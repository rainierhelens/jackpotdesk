# JackpotDesk

Live site: [https://jackpotdesk.com](https://jackpotdesk.com)

Free Powerball and Mega Millions desk:

1. **This week** — expected value using cash jackpot, tax, and split risk.
2. **Tickets** — random picks that skip birthdays, sequences, and recent winners.
3. **Pool** — members, shares, and payout splits in this browser.

This does **not** raise the chance of winning. Hit odds match Quick Pick. The benefit is fewer jackpot splits and a pass on bad drawings.

## Local

```bash
npm install
npm run dev
```

## GitHub Pages + custom domain

The site deploys from `main` via `.github/workflows/deploy.yml`. `public/CNAME` is set to `jackpotdesk.com`.

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

In the GitHub repo: **Settings → Pages → Custom domain** `jackpotdesk.com`, then enable **Enforce HTTPS** after DNS propagates (can take up to 24 hours).

## Ads (AdSense)

Slots are already on the page (top, mid, footer) and labeled Advertisement.

1. Publish the site and add [privacy.html](https://jackpotdesk.com/privacy.html).
2. Apply at [Google AdSense](https://www.google.com/adsense/).
3. After approval, put your publisher ID and ad unit IDs in `src/config.ts`:

```ts
export const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
export const ADSENSE_SLOTS = {
  top: "1234567890",
  mid: "1234567890",
  footer: "1234567890",
};
```

4. Uncomment and edit `public/ads.txt`:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

5. Commit and push. AdSense also needs the site to stay honest: do not claim the tool predicts winning numbers.
