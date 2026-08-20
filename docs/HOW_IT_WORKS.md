# How JackpotDesk works

Read this before changing mint modes, ticket generation, or product copy. Claims we may and may not make are in [CLAIMS.md](CLAIMS.md). Data jobs and model math are in [DATA_AND_MODELS.md](DATA_AND_MODELS.md). How we ship and later charge is in [BUSINESS.md](BUSINESS.md). Visual language and the em-dash rule are in [STYLE.md](STYLE.md). The operator email is in [DIGEST.md](DIGEST.md). The public jar and inbox are in [DESK.md](DESK.md).

## Premise

The home product is **The Ladder**: boards ranked by how well they match official draw history. Hit odds are identical to Quick Pick for every legal combination. The ranking is a scored replay of the past. It is not a forecast.

Winner-count archives are append-only. As new official draws land, the fitted crowd weights and the pattern model re-score. That is the only sense in which the desk “gets smarter.”

## Same-odds rule

Every mode below draws from the legal matrix (count, range, uniqueness, special ball). None of them change the published hit probability. Differences are **which boards we show** and **what we score them for**.

## Modes

Default mode on Desk is Ladder ([`src/views/BoardView.tsx`](../src/views/BoardView.tsx)). Switch order: Ladder → Pattern lab → Desk pick → Quick mint.

### Ladder

- Engine: [`patternLadder`](../src/lib/patternLab.ts) scans 60,000 frequency-weighted candidates, scores them, returns the top `LADDER_DEPTH` (100) in strict descending pattern score.
- Seed is derived from the draw history, so the same history produces the same ladder. The fade-free ladder re-ranks only when new official draws change the model.
- Optional **Apply fades** toggle (`ladder.applyFades`): hard-veto last-draw, hot, cold, and the other fade criteria during the scan, then re-number the survivors from #1. History is a score, then a veto. Default is off. The faded ladder also re-ranks when the fade list changes.
- UI: [`PatternLadder`](../src/components/PatternLadder.tsx) infinite-scroll feed. Each row is a rendered slip plus points, why-line, Frequency / Heat / Pairs / Shape, and the live co-winner index.
- Special ball (national) is the historically most frequent special.
- Planned gate (not wired): `LADDER_FREE_DEPTH` = 10 free ranks; 11–100 is the paid field. The live site is still ungated.

### Pattern lab

- Same pattern model, but jittered: sample ~4,000 candidates, take a random window near the top so two mints are not identical frequency dumps.
- Optional **Apply fades** toggle (`pattern.applyFades`): hard-veto last-draw, hot, cold, and the other fade criteria, then keep the highest-scoring survivors. History is a score, then a veto. It does not raise hit odds.
- Per-ticket [`PatternReport`](../src/components/PatternReport.tsx). Co-winner index stays visible underneath.
- Entertainment mint, not the ranked field.

### Desk pick

- Opposite of Pattern lab. Scores boards with the **popularity** (crowd) model and keeps the **least-crowded** tail ([`deskPickTickets`](../src/lib/popularity.ts) / `deskPickWaPlays`).
- Fades apply. Unique-slip constraints apply; uniqueness relaxes if the pool runs out.
- Same hit odds; smaller expected split if the board hits.

### Quick mint

- Uniform random boards that fail fade criteria are redrawn ([`generateTickets`](../src/lib/picks.ts) / [`generateWaPlays`](../src/lib/waPicks.ts)).
- Does not use pattern or popularity scores. The original “uncrowded random slip” product.

## Secondary tools

- **Desk** (home tab, [`BoardView`](../src/views/BoardView.tsx)): mint + heat + ladder. One slip next to Heat (official-draw frequency: grid, pairs, draw map), NumberPool (fade space and crowd pick-rate), and the Ladder feed (pattern score). Mint N boards with Quick / Desk pick / Pattern lab, or step the ranked field with arrow keys, then click Heat, pool chips, or a live hint to edit the first board. While the slip is open, Desk hints name Heat (this-window last / gap / vs-chance), crowd pick-rate, and pattern pair partners as three separate lists. Same hit odds as Quick Pick. Clicking a hint fills a slot; it does not change hit odds. 50 points on an incomplete board is the average random ticket of that size. Copy, print, save, or add-to-pool operate on the minted stack. Live PatternReport and CrowdIndex re-score finished boards. Do not blend the three readouts into one score. Old `?tab=tickets` and `?tab=heat` bounce here. Clean home omits `tab`.
- **Heat** (on Desk, [`lotteryHeat.ts`](../src/lib/lotteryHeat.ts)): official-draw frequency. National Powerball / Mega Millions and Washington Hit 5 / Lotto / Match 4 / Cash Pop. Windows are all-time, last N draws, or a custom date range. Optional time-shift slides a 50-draw pane through that history (Play animates; reduced motion jumps). Views: grid, pair matrix (from the pattern model), draw map. Color is count or deviation from a uniform field. Click fills the slip. Mint from this view weights by this window (weight floor 1). Save grid PNG. Not crowd pick-rate. Not a forecast.
- **This week**: cash jackpot, tax, split risk, expected value. Does not pick numbers. Build slip lands on Desk. National advertised / cash load from the Worker `/market` cache of California’s feed; if that is down, the last baked copy in the site is used.
- **Map**: public jackpot tickets by sale state.
- **Pool**: members, shares, payouts in this browser.
- **Why this**: method copy. Keep it aligned with [CLAIMS.md](CLAIMS.md).
- **Recap** (desk tab, [`/recap`](../public/recap/index.html)): public scored replay. Latest at `/recap`. Dated copies at `/recap/YYYY-MM-DD`. Last official results versus the Ladder that was live before those numbers. EV call SKIP / ENTERTAIN ONLY / RARE PLUS. Link to the live Ladder for tonight. Does not publish tonight’s #1. Auto-built in the Pages job at 5:00 a.m. Pacific daily. Same primary tab bar as Desk. Each recap also appends that comparison to [`src/data/ladderReplay.json`](../src/data/ladderReplay.json) (public copy at `/recap/ladder-replay.json`). See [DIGEST.md](DIGEST.md) and [DATA_AND_MODELS.md](DATA_AND_MODELS.md).
- **Private digest**: daily operator email of Ladder #1–#3 plus the EV call, 10:00 a.m. Pacific. Not a public list. Same libraries as the public recap, later clock. See [DIGEST.md](DIGEST.md).
- **Tip the desk**: optional gift for hosting and archives. Not a pass. See [DESK.md](DESK.md).
- **Write the desk**: support form to the operator. No name required. Not a public list.

## Games

National: Powerball, Mega Millions. Washington: Hit 5, Lotto, Match 4, Cash Pop. Pick 3 and Keno were removed because they have no winner-count data set.
