# Claims

Read this before changing masthead, SEO, Why this, Ladder copy, a paywall, or the digest email. Visual language and the em-dash rule are in [STYLE.md](STYLE.md).

Honest-hero is the stance JackpotDesk chose. The Ladder is the product. It is a picture of captured official history, scored and ranked. The mixer does not care about the chart. Same hit odds as Quick Pick. That is still true.

We show the chart. We talk about it. We do not sell the next mix.

## Same odds, where it lives

Every legal board has the same published hit chance. Say so on the product: chrome, Why this, Lottery Lab.

Do not stuff “same odds” into the first sentence of every tweet, recap desk strip, or ladder why-line. Pattern talk can lead. Same-odds stays in the room.

Do not invent a new publish path. Recap is the morning ritual. Lottery Lab is the proof page. Do not rewrite [`public/lottery-lab.html`](../public/lottery-lab.html).

## The desk may

Talk about patterns in captured official history the way a desk shows a chart: frequency, pairs, heat, shapes. A picture of the sample. A scored replay. An educated ranking of typical boards.

Heat and the Ladder are history tools. Entertainment is fine. “Educated ranking” and “fit to the past” are fine.

Say Rank #1 is the strongest match to the past. Say the ranking compounds as new official draws land. Winner-count archives are append-only.

Talk crowd, lonely tickets, and Desk pick as less sharing if you hit, not more winning.

Name Heat, the number pool, and the Ladder as separate readouts. Do not blend them into one score.

Lines that already work:

- “The Ladder ranks every scanned board against measured history.”
- “A scored replay of the past, best first.”
- “Same hit odds as Quick Pick.”
- “The ranking gets sharper as new official draws land” / “winner-count archives are append-only, so the ranking compounds.”
- “Rank #1 is the strongest match to the past.”
- “50 points = the average random ticket.”
- “1.00× crowd = expected co-winners of the average random board if it hits. Lower is lonelier.”
- “Entertainment, not prediction.”
- “How often each number appeared in this window.” (Lottery Heat)
- “Mint a starting board, then click Heat, the number pool, or a ladder tile.”

Internal / docs: “fitted popularity model,” “pattern-ranking model,” “quasi-Poisson.” “Machine learning” only in docs, never on the masthead, SEO, or a paywall.

## Hard no

Do not claim the next drawing is more likely to land on a ranked board.

Do not sell the Ladder as a forecast, or as a narrower field that changes 1-in-X.

Lottery draws are independent mixers. You can say that. Do not compare the desk to stock-chart technical analysis as if either one predicts the next print. Do not claim stock TA works.

Still banned:

- “Winning numbers”
- “Beats Quick Pick” or any implied raise in hit probability
- AI / ML that predicts winning combinations
- Exclusive numbers nobody else can buy. That would create the crowded ticket Desk pick exists to avoid.
- Selling an edge on the drawing itself. Sell access to the ranked field.

Lottery Lab stays the proof page: models cannot beat Quick Pick.

## Product contract (paid later)

Live site is **ungated** (Phase 0 in [BUSINESS.md](BUSINESS.md)). Constants live in [`src/lib/patternLab.ts`](../src/lib/patternLab.ts):

- `LADDER_FREE_DEPTH` = 10: ranks #1–#10 are the free desk.
- `LADDER_DEPTH` = 100: ranks #11–#100 are the Desk pass field (“the rest of tonight’s ranking”).

When auth is wired, the gate is those two numbers. Until then do not hide ranks, and do not put prices in this repo.

Paid copy may say: the rest of tonight’s ranking, the write-up beside each board, Desk pick, Pattern lab mint, save / print / add-to-pool from ladder tiles.

Paid copy may not say: winning numbers, AI picks that win, a higher chance of hitting.

## If a sentence is in doubt

Ask: are we describing the sample, or promising the next mix?

If it is a picture of the past, say so. If it would change 1-in-X, cut it.

Same-odds is already on chrome, Why, and Lab. You do not have to open with it. Point at Lottery Lab when someone asks whether the model beats Quick Pick.
