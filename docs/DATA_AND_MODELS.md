# Data and models

Operational map of sources, jobs, and the two scoring engines. Do not put secrets, Worker URLs, or prices in this file.

## Accumulate everything we can store

Frequency, pairs, shapes, and crowd weights get stabler with more official draws. **Every store we control is append-only.** A source that only *serves* a rolling window is a vendor limit, not a reason to drop history.

Two windows stay rolling **on purpose** — they measure recency, not the all-time model:

- Pattern **hot lift**: last 30 draws (`RECENT_WINDOW` in [`src/lib/patternLab.ts`](../src/lib/patternLab.ts)).
- Fade **recent winners**: last 40 official white sets (`RECENT_WINNER_LIMIT` in [`src/lib/winners.ts`](../src/lib/winners.ts)).

More history does not make the next drawing more likely to match the past. It makes the *description* of the past less noisy.

| Dataset | Source limit | Our store | Accumulates? |
| --- | --- | --- | --- |
| National official draws | None — NY Open Data has the full modern era | Runtime fetch in [`src/lib/winners.ts`](../src/lib/winners.ts) | Already full (Powerball 2015–, Mega Millions 2017–). Mega Ball shrank to 24 on 2025-04-08; special-ball stats use only in-range extras. |
| National winner counts | CA API ~9 months | [`src/data/winnerCounts.json`](../src/data/winnerCounts.json) | **Yes.** Daily append. |
| WA winner counts | walottery.com 180 days | [`src/data/waWinnerCounts.json`](../src/data/waWinnerCounts.json) | **Yes.** Daily append. |
| WA draw numbers | walottery.com 180 days | [`src/data/waDraws.json`](../src/data/waDraws.json) + Worker cache | **Yes.** Scrape merges prior draws; bake also folds the winner-count archive. |
| Fitted crowd weights | n/a | [`src/data/popularity.json`](../src/data/popularity.json) | Re-fit from the full archive after each append. |
| Pattern model | n/a | Built in the browser from the draw list | Grows as the draw list grows. No separate bake. |

The Cloudflare Worker is a cache of the accumulating book, not the archive. Permanent stores are the JSON files committed by GitHub Actions.

## Jobs

- [`.github/workflows/popularity.yml`](../.github/workflows/popularity.yml) — daily `45 16 * * *`: scrape national + WA winner counts, refit weights, commit if changed.
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — on push to `main` and twice daily: `bake:wa`, `bake:map`, PUT books to the Worker, Pages build.

## Popularity model (crowd)

[`src/lib/popularity.ts`](../src/lib/popularity.ts) loads `popularity.json`.

- Fit: quasi-Poisson regression of per-tier winner counts on per-number (and pattern) pick rates. Weight 1 = picked at the random-play rate.
- A board’s **co-winner index** is the product of its number weights, normalized so the average random board reads 1.00×. Lower is lonelier.
- Used by: number-pool heat, CrowdIndex / WaCrowdIndex, Desk pick.
- Does not change hit odds. It estimates expected sharing if the board hits.

## Pattern-ranking model

[`src/lib/patternLab.ts`](../src/lib/patternLab.ts), built by `buildPatternModel(draws, poolMax, specialMax?)`.

From **all** stored history (newest-first):

- Per-number frequency lift vs uniform; last-30-draw hot lift (the recency window).
- Pair co-occurrence. Triples only when history is ≥ 400 draws (national). WA needs that many archived draws before triples turn on.
- Special-ball frequency (national only; in-range extras).
- Shape histograms: odd count, high/low split (above pool midpoint), middle-50% sum band.
- Top-10 numbers and top-10 pairs for explanations.

`scoreTicket` blends frequency, heat, pairs, triples, shape, special. Calibrated so a uniform random ticket averages **50 points**.

`explainTicket` states only facts the score used (top-10 membership, named pairs, hot count, modal odd/even, sum band).

`patternLadder(model, size, depth, opts?)` is the ranked field. Deterministic seed from the frequency vector. Optional `opts.reject` is a fade veto after the score. `patternPickTickets` is the jittered mint.

Lottery Heat ([`src/lib/lotteryHeat.ts`](../src/lib/lotteryHeat.ts)) is a **client window** on the official draw list (national or WA). It extends `numberField` with share, uniform expected count, signed deviation, last-drawn date, and the special-ball row (in-range extras only). Time-shift is a 50-draw pane walked across that slice. The pair view reads `buildPatternModel` pair counts. No new fetch or bake. Changing the window does not change hit odds.

## Client data flow

```
NY Open Data ──► winners.ts ──► pattern model (national, full history)
                              └── hot/cold fades, past keys
                              └── Lottery Heat (windowed client frequency)

waWinnerCounts.json ──► fit-popularity ──► popularity.json ──► crowd + Desk pick
winnerCounts.json ────┘

prior waDraws ∪ 180-day scrape ∪ winner-count numbers
        ──► bake-wa-draws / Worker scrape ──► accumulating book
        ──► waDrawsFor ──► pattern model (WA)
                              └── Lottery Heat (WA windows)
```
