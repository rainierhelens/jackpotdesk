# How JackpotDesk works

Read this before changing mint modes, ticket generation, or product copy. Claims we may and may not make are in [CLAIMS.md](CLAIMS.md). Data jobs and model math are in [DATA_AND_MODELS.md](DATA_AND_MODELS.md). How we ship and later charge is in [BUSINESS.md](BUSINESS.md).

## Premise

The home product is **The Ladder**: boards ranked by how well they match official draw history. Hit odds are identical to Quick Pick for every legal combination. The ranking is a scored replay of the past. It is not a forecast.

Winner-count archives are append-only. As new official draws land, the fitted crowd weights and the pattern model re-score. That is the only sense in which the desk “gets smarter.”

## Same-odds rule

Every mode below draws from the legal matrix (count, range, uniqueness, special ball). None of them change the published hit probability. Differences are **which boards we show** and **what we score them for**.

## Modes

Default persisted pref is `mintMode = "ladder"` ([`src/views/TicketsView.tsx`](../src/views/TicketsView.tsx), [`src/views/WaTicketsView.tsx`](../src/views/WaTicketsView.tsx)). Switch order: Ladder → Pattern lab → Desk pick → Quick mint.

### Ladder

- Engine: [`patternLadder`](../src/lib/patternLab.ts) scans 60,000 frequency-weighted candidates, scores them, returns the top `LADDER_DEPTH` (100) in strict descending pattern score.
- Seed is derived from the draw history, so the same history produces the same ladder. It re-ranks only when new official draws change the model.
- UI: [`PatternLadder`](../src/components/PatternLadder.tsx) infinite-scroll feed. Each row is a rendered slip plus points, why-line, Frequency / Heat / Pairs / Shape, and the live co-winner index.
- Fades do not apply. Special ball (national) is the historically most frequent special.
- Planned gate (not wired): `LADDER_FREE_DEPTH` = 10 free ranks; 11–100 is the paid field. The live site is still ungated.

### Pattern lab

- Same pattern model, but jittered: sample ~4,000 candidates, take a random window near the top so two mints are not identical frequency dumps.
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

- **This week** — cash jackpot, tax, split risk, expected value. Does not pick numbers.
- **Map** — public jackpot tickets by sale state.
- **Pool** — members, shares, payouts in this browser.
- **Why this** — method copy. Keep it aligned with [CLAIMS.md](CLAIMS.md).

## Games

National: Powerball, Mega Millions. Washington: Hit 5, Lotto, Match 4, Cash Pop. Pick 3 and Keno were removed because they have no winner-count data set.
