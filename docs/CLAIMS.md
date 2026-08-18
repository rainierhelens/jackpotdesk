# Claims

Read this before changing masthead, SEO, Why this, Ladder copy, or a paywall. The consumer claim is **honest-hero**: The Ladder is the product; it does not predict the next drawing.

## Allowed

- “The Ladder ranks every scanned board against measured history.”
- “A scored replay of the past, best first.”
- “Same hit odds as Quick Pick.”
- “The ranking gets sharper as new official draws land” / “winner-count archives are append-only, so the ranking compounds.”
- “Rank #1 is the strongest match to the past.”
- “50 points = the average random ticket.”
- “1.00× crowd = expected co-winners of the average random board if it hits. Lower is lonelier.”
- “Entertainment, not prediction.”
- Internal / docs: “fitted popularity model,” “pattern-ranking model,” “quasi-Poisson.” “Machine learning” only in docs, never on the masthead, SEO, or a paywall.

## Banned

- “These are the numbers most likely to come up next.”
- “Machine learning / AI that predicts winning combinations.”
- “Beats Quick Pick” or any implied raise in hit probability.
- “Exclusive numbers nobody else can buy” — that would *create* the crowded ticket Desk pick exists to avoid.
- Holdout or backtest language that implies the model forecasts future draws.
- Selling an edge on the drawing. Sell **access to the ranked field**.

Lottery Lab ([`public/lottery-lab.html`](../public/lottery-lab.html)) stays the proof page: models cannot beat Quick Pick. Do not rewrite it to sell prediction.

## Product contract (paid later)

Live site is **ungated** (Phase 0 in [BUSINESS.md](BUSINESS.md)). Constants live in [`src/lib/patternLab.ts`](../src/lib/patternLab.ts):

- `LADDER_FREE_DEPTH` = 10 — ranks #1–#10 are the free desk.
- `LADDER_DEPTH` = 100 — ranks #11–#100 are the Desk pass field (“the rest of tonight’s ranking”).

When auth is wired, the gate is those two numbers. Until then do not hide ranks, and do not put prices in this repo.

Paid copy may say: the rest of tonight’s ranking, the write-up beside each board, Desk pick, Pattern lab mint, save / print / add-to-pool from ladder tiles.

Paid copy may not say: winning numbers, AI picks that win, a higher chance of hitting.

## If a sentence is in doubt

Keep same-odds in the first sentence. Describe the score as a fit to the past. Point at Lottery Lab.
