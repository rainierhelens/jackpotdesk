# JackpotDesk business plan

Status: **Phase 0. Free, honest experiment.** The live site is ungated. This file is the plan for later income, not a paywall spec. Claims we may not make are in [CLAIMS.md](CLAIMS.md). How the product works is in [HOW_IT_WORKS.md](HOW_IT_WORKS.md).

## One-sentence business

JackpotDesk is a free lottery desk that ranks boards against official history (The Ladder) and prices the drawing. Income, if any, comes from **access to more of tonight’s ranking** and from **an audience that comes back on draw nights**. It does not come from selling a higher chance of winning.

## What we sell later (and what we never sell)

Sell:

- The rest of tonight’s ranked field (ranks 11–100) and the write-up beside each board.
- Honest packs as units: “10 more ranks” or “1 Pattern lab mint.” Not a Ladder reroll. The fade-free ladder is the same #1 until a new official draw lands.
- Optional: a YouTube / shorts ritual that points at the free ladder and the public recap.

Never sell:

- “Winning numbers,” “AI that expects the next draw,” exclusive boards nobody else can buy.
- A claimed raise in hit odds. Lottery Lab stays the proof page.
- Loot boxes, gacha, or any paid mystery drop. Pay + chance + a prize of value is the Washington gambling test. A sealed pack whose contents are chance and worth money fails that test. An honest pack names the unit before the click.

The data archives compounding is a **story and a ranking-stability story**. It is not a forecasting edge.

## Phase 0: ship the experiment (now)

Live, free, full ladder (still ungated despite `LADDER_FREE_DEPTH`).

Goals:

1. See if people open The Ladder on draw nights and screenshot #1.
2. Keep archives appending (popularity Action + WA union). Every week live is more history.
3. Do not take payment, accounts, or refunds yet.
4. Private digest is live for the operator only ([DIGEST.md](DIGEST.md)). No public signup. It is the 5:00 a.m. Pacific letter (`scripts/draw-digest.ts`, `draw-digest.yml`), same clock as the public recap.
5. Public daily recap on the live site, auto-published through GitHub at 5:00 a.m. Pacific every day, no per-recap approval. Same official data libraries as the private digest, a Pages deploy instead of an inbox. Package: same-odds in the first sentence (reuse live site copy); last night’s official results vs last night’s Ladder #1–#3 as a scored replay; EV call using SKIP / ENTERTAIN ONLY / RARE PLUS; link to the live Ladder for tonight. Do not publish tonight’s #1 as a tip sheet (it crowds the ticket). Desk pick may be mentioned as the least-crowded board, not a forecast. Rank #1 is the strongest match to history, never “the winning pick.”
6. [Tip the desk](DESK.md) and [Write the desk](DESK.md) are the public-anonymous jar and inbox. No named founder page. The jar URL stays blank until you paste a Ko-fi or Stripe Payment Link.

Copy on the site stays entertainment / same-odds. Optional later: a one-line “free experiment” note on Why this. Do not add a fake “coming soon / subscribe” gate.

**Distribution (cheap):** share the site as a lab. The public recap is the daily ritual people can open without an email. If you make video, one honest format: last night’s official vs last night’s Ladder, then tonight’s EV, then a link to the live ladder. No “system.” No blasting tonight’s #1.

**Ads:** skip until there is traffic. Lottery + prediction-adjacent language is a policy risk; AdSense on a tiny tool site is usually not worth the claim drift.

**Success (go to Phase 1):** repeat visits clustered on draw days, people using save/print/copy, recap page views, or inbound asking for more ranks / a mint.  
**Fail (stay free):** nobody returns; treat it as a portfolio lab and keep collecting data.

Do not paywall Quick mint or This week EV. Those are trust.

## Phase 1: Desk pass (first real product)

Turn on the constants already in [`src/lib/patternLab.ts`](../src/lib/patternLab.ts):

- Free desk: ranks **#1–#10**, Why this, This week, Quick mint, crowd chips on those ten.
- Desk pass: ranks **#11–#100**, Desk pick, Pattern lab, save/print/add-to-pool from ladder tiles.

Price like a cheap **monthly** or a **night pass** on a big advertised jackpot. Do not put a dollar amount in this repo until you pick a processor.

Why this can work:

- The ladder is deterministic per history. A new official draw → new seed → new #1. That is a reason to come back (and to pay for “the rest of tonight”).
- You are selling the ordered list, not an edge.

Gamification that stays legal:

- **Desk pass:** the season. Access to the rest of tonight’s ranking.
- **Honest packs:** named units (“10 more ranks,” “1 Pattern lab mint”). The buyer knows the contents.
- **Free ritual:** the public recap, an optional streak for opening it, print / pool sheets. No prize of value behind a chance roll.

Not loot boxes. Not a Ladder reroll pack. A pack as “reroll The Ladder” is a bad product (same #1 until a new draw) and a bad legal shape if the contents are chance.

Do not launch Stripe until Phase 0 shows the ritual. Auth, receipts, and “why didn’t #1 hit” support start the day you charge.

## Phase 2: only if Phase 1 sells

In order, and only with a reason:

1. **Video** as the top of funnel (public recap → free #1–#10 → pass).
2. **Packs** on top of the pass (rank pages / mints), if people ask to pay once without a subscription. Honest units only.
3. **Deeper field or more markets** after WA archives outgrow the 180-day vendor window and extra ranks actually differ.
4. **Office-pool / print** for groups. In-browser members, shares, and payout splits already exist. Print / pool sheets are the free ritual. The group buys its own slips at a licensed store. JackpotDesk does not collect money or buy tickets.

Still no affiliate “buy tickets here” unless a licensed partner exists. Still no exclusive numbers.

## What we will not build

These are product bans, not a later maybe:

- **No lottery courier / internet ticket sales.** Washington bans them. Prizes can be refused. No convenience fees for fetching a slip.
- **No website that sells shares then buys slips.** That is a courier with a ledger. The pool tab is bookkeeping. Someone still walks to a licensed retailer.
- **No cover-the-field / Texas-style bulk print**, including Hit 5. We do not print the matrix. We do not sell a “cover it” stack.
- **No loot boxes, gacha, or paid mystery drops.** See the Washington test above.
- **No blasting tonight’s #1 as a tip sheet.** The public recap is last night’s scored replay. Tonight’s #1 lives on the live Ladder. Forwarding it as “winning numbers” manufactures the crowded ticket Desk pick exists to avoid.

Legal adjacent lanes we may use: ranking access (Desk pass / honest packs), the public recap, pool / print tooling, the tip jar.

## Unit economics (honest)

Costs stay low: GitHub Pages, a Cloudflare Worker, Actions minutes, a domain. Time is the real cost (scrapers breaking, copy staying honest, support if paid).

Revenue will likely be small until there is an audience. Plan for “coffee money / side project,” not a full-time salary, until Phase 1 conversion is visible.

Do not spend on ads that promise winners.

## Legal and brand

- Educational / entertainment. We do not sell lottery tickets.
- Same-odds in the first sentence of paid copy, and in the first sentence of the public recap.
- Responsible gaming links stay in the footer.
- No holdout charts that imply the model forecasts future draws.
- JackpotDesk is the speaker. No founder page.

If a sentence would be illegal as an investment pitch, it is illegal as a lottery pitch too.

## Metrics worth watching (Phase 0)

No accounts yet, so use what you have (Analytics, already on the site):

- Sessions on Desk / Ladder vs bounce.
- Draw-day vs off-day traffic.
- Outbound to Lottery Lab (honesty is working if some people click it).
- Recap page views once live (`/recap`).
- Save/print/copy if you later event those.

Phase 1 adds: pass starts, night-pass on jackpot spikes, refunds, “#1 missed” tickets.

## Decision log

- **2026-08:** Premise is The Ladder, honest-hero. Monetize ranked-field access, not prediction. Live site ships ungated as an experiment. This plan is the next document; payments are not in this pass.
- **2026-08:** Operator is subscriber #1 on a private Resend digest. Public email list waits for Phase 1.
- **2026-08:** Tip the desk and Write the desk ship as JackpotDesk, not a personal brand. Financial KYC stays off the site.
- **2026-08-19:** Public daily recap ships as a Phase 0 goal. Auto-publish through GitHub (sibling the 10:00 a.m. PT digest). No per-recap approval. Package: same-odds first sentence from live site copy; last night’s official vs last night’s Ladder #1–#3 as a scored replay; SKIP / ENTERTAIN ONLY / RARE PLUS; link to the live Ladder for tonight. Do not publish tonight’s #1 as a tip sheet. Desk pick may be named as the least-crowded board, not a forecast.
- **2026-08-19:** Never sell loot boxes, gacha, or paid mystery drops (Washington: pay + chance + a prize of value). Honest packs and a desk pass only. No lottery courier or internet ticket sales (WA bans them; prizes can be refused; no convenience fees). No site that sells shares then buys slips. No cover-the-field / Texas-style bulk print, including Hit 5. Adjacent lanes: ranking access, public recap, pool/print tooling, tip jar.
- **2026-08-20:** Public daily feed lives at `/recap` (latest as the default page). Dated archives at `/recap/YYYY-MM-DD` if a permalink is needed. Linked from the desk tabs. Not a query-string route.
- **2026-08-20:** Public recap and the private operator digest both run at 5:00 a.m. Pacific daily (`0 12 * * *` UTC while PDT). All 7 days. Same official data libraries. Digest stays on `draw-digest.yml`. Recap stays on `deploy.yml`.
