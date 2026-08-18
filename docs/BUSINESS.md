# JackpotDesk business plan

Status: **Phase 0 — free, honest experiment.** The live site is ungated. This file is the plan for later income, not a paywall spec. Claims we may not make are in [CLAIMS.md](CLAIMS.md). How the product works is in [HOW_IT_WORKS.md](HOW_IT_WORKS.md).

## One-sentence business

JackpotDesk is a free lottery desk that ranks boards against official history (The Ladder) and prices the drawing. Income, if any, comes from **access to more of tonight’s ranking** and from **an audience that comes back on draw nights** — not from selling a higher chance of winning.

## What we sell later (and what we never sell)

Sell:

- The rest of tonight’s ranked field (ranks 11–100) and the write-up beside each board.
- Optional: Pattern lab / Desk pick mints as consumable “packs.”
- Optional: a YouTube / shorts ritual that points at the free ladder.

Never sell:

- “Winning numbers,” “AI that expects the next draw,” exclusive boards nobody else can buy.
- A claimed raise in hit odds. Lottery Lab stays the proof page.

The data archives compounding is a **story and a ranking-stability story**. It is not a forecasting edge.

## Phase 0 — ship the experiment (now)

Live, free, full ladder (still ungated despite `LADDER_FREE_DEPTH`).

Goals:

1. See if people open The Ladder on draw nights and screenshot #1.
2. Keep archives appending (popularity Action + WA union). Every week live is more history.
3. Do not take payment, accounts, or refunds yet.
4. Private digest is live for the operator only ([DIGEST.md](DIGEST.md)). No public signup.

Copy on the site stays entertainment / same-odds. Optional later: a one-line “free experiment” note on Why this — do not add a fake “coming soon / subscribe” gate.

**Distribution (cheap):** share the site as a lab. If you make video, one honest format: tonight’s #1 vs last night’s official draw, then EV. No “system.”

**Ads:** skip until there is traffic. Lottery + prediction-adjacent language is a policy risk; AdSense on a tiny tool site is usually not worth the claim drift.

**Success (go to Phase 1):** repeat visits clustered on draw days, people using save/print/copy, or inbound asking for more ranks / a mint.  
**Fail (stay free):** nobody returns; treat it as a portfolio lab and keep collecting data.

Do not paywall Quick mint or This week EV. Those are trust.

## Phase 1 — Desk pass (first real product)

Turn on the constants already in [`src/lib/patternLab.ts`](../src/lib/patternLab.ts):

- Free desk: ranks **#1–#10**, Why this, This week, Quick mint, crowd chips on those ten.
- Desk pass: ranks **#11–#100**, Desk pick, Pattern lab, save/print/add-to-pool from ladder tiles.

Price like a cheap **monthly** or a **night pass** on a big advertised jackpot. Do not put a dollar amount in this repo until you pick a processor.

Why this can work:

- The ladder is deterministic per history. A new official draw → new seed → new #1. That is a reason to come back (and to pay for “the rest of tonight”).
- You are selling the ordered list, not an edge.

Why packs are a skin, not the core:

- A pack as “reroll The Ladder” is a bad product (same #1 until a new draw).
- A pack as “10 more ranks” or “1 Pattern lab mint” is honest. Use packs to sell **units**, Desk pass to sell **the season**.

Do not launch Stripe until Phase 0 shows the ritual. Auth, receipts, and “why didn’t #1 hit” support start the day you charge.

## Phase 2 — only if Phase 1 sells

In order, and only with a reason:

1. **Video** as the top of funnel (draw-night recap → free #1–#10 → pass).
2. **Packs** on top of the pass (rank pages / mints), if people ask to pay once without a subscription.
3. **Deeper field or more markets** after WA archives outgrow the 180-day vendor window and extra ranks actually differ.
4. **Office-pool / print** for groups — small, operational, honest.

Still no affiliate “buy tickets here” unless a licensed partner exists. Still no exclusive numbers.

## Unit economics (honest)

Costs stay low: GitHub Pages, a Cloudflare Worker, Actions minutes, a domain. Time is the real cost (scrapers breaking, copy staying honest, support if paid).

Revenue will likely be small until there is an audience. Plan for “coffee money / side project,” not a full-time salary, until Phase 1 conversion is visible.

Do not spend on ads that promise winners.

## Legal and brand

- Educational / entertainment. We do not sell lottery tickets.
- Same-odds in the first sentence of paid copy.
- Responsible gaming links stay in the footer.
- No holdout charts that imply the model forecasts future draws.

If a sentence would be illegal as an investment pitch, it is illegal as a lottery pitch too.

## Metrics worth watching (Phase 0)

No accounts yet, so use what you have (Analytics, already on the site):

- Sessions on Tickets / Ladder vs bounce.
- Draw-day vs off-day traffic.
- Outbound to Lottery Lab (honesty is working if some people click it).
- Save/print/copy if you later event those.

Phase 1 adds: pass starts, night-pass on jackpot spikes, refunds, “#1 missed” tickets.

## Decision log

- **2026-08:** Premise is The Ladder, honest-hero. Monetize ranked-field access, not prediction. Live site ships ungated as an experiment. This plan is the next document; payments are not in this pass.
- **2026-08:** Operator is subscriber #1 on a private Resend digest. Public email list waits for Phase 1.
