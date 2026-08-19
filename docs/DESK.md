# Tip the desk and Write the desk

Public-anonymous paths. The site speaks as JackpotDesk. No legal name, photo, or personal Gmail on these pages.

## Tip the desk

Lives in the main desk as the **Tip** tab ([`src/views/TipView.tsx`](../src/views/TipView.tsx)). Old `/tip.html` links redirect to `/?tab=tip`.

The jar URL lives in [`src/config.ts`](../src/config.ts) as `TIP_JAR_URL` (or `VITE_TIP_JAR_URL`). Leave it blank until the jar exists. The tab then says the jar is not open yet.

Do not title the Ko-fi page with a first name. Use JackpotDesk. No photo.

A tip is a gift. It is not a Desk pass and it does not raise hit odds. Do not put a dollar amount in this repo.

GA4 event: `tip_click` when someone opens the outbound jar.

### Ko-fi (simplest)

1. Sign up at [ko-fi.com](https://ko-fi.com) and create a page titled **JackpotDesk** (not your first name). No profile photo per product rules.
2. Enable **Donations** (one-time tips). Optional: add a short line that tips keep hosting and archives on, not winning numbers or a Desk pass.
3. Copy your public page URL, e.g. `https://ko-fi.com/jackpotdesk`.

### Stripe Payment Link (alternative)

1. In [Stripe Dashboard](https://dashboard.stripe.com) → **Payment links** → **New**.
2. Use a **Customer chooses what to pay** product (variable amount) or a few preset gifts. Do not commit amounts to this repo.
3. Copy the `https://buy.stripe.com/...` link.

### Wire the URL

**Local dev** — create `.env.local` in the repo root (gitignored via `*.local`):

```bash
VITE_TIP_JAR_URL=https://ko-fi.com/jackpotdesk
```

Restart `npm run dev`. Open `/?tab=tip` and confirm **Open the tip jar** appears.

**Production (GitHub Pages)** — repo secret:

- Name: `VITE_TIP_JAR_URL`
- Value: the same HTTPS checkout URL (no quotes)

Settings → Secrets and variables → Actions → New repository secret. The deploy workflow passes it into `npm run build`. Push to `main` or run **Deploy GitHub Pages** manually.

Leave the secret unset (or the env blank locally) to keep the “jar is not open yet” copy.

## Write the desk

Lives in the main desk as the **Write** tab ([`src/views/WriteView.tsx`](../src/views/WriteView.tsx)). Old `/contact.html` links redirect to `/?tab=write`. POST JSON `{ message, reply? }` to the Worker at `/write-desk`.

Worker secrets (same account as the WA feed):

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put DESK_TO_EMAIL
npx wrangler secret put DESK_FROM
```

`DESK_FROM` is optional. Leave it unset to use Resend’s test sender (`JackpotDesk <onboarding@resend.dev>`), which can only deliver to the Resend account email. After you verify `jackpotdesk.com`, set `JackpotDesk <desk@jackpotdesk.com>`.

Paste `DESK_TO_EMAIL` as a plain address (`you@domain.com`). No quotes. Until the domain is verified, it must be the same inbox you used to sign up for Resend. A 422 from Resend on `to` means this secret is not a valid email.

Then:

```bash
npx wrangler deploy
```

Until those secrets are set, the form returns “The desk is not taking mail yet.”

The Worker rate-limits by IP (~45 seconds). Honeypot field `company` is dropped. Auto-reply (if they left an address) speaks as the desk and does not promise winning numbers.

GA4 event: `write_desk_send` on success. Message body is not sent to Google.

## Anonymity

Reply as JackpotDesk from `desk@`. Do not sign with a first name. Terms say “the operator of jackpotdesk.com.”
