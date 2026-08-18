# JackpotDesk style guide

How the site is built and how copy should read. Product claims (what we may say) live in [CLAIMS.md](CLAIMS.md). This file is visual language, layout, and punctuation.

## Stack

- Vite + React 19. No Tailwind, no CSS-in-JS, no component library.
- One global sheet: [`src/index.css`](../src/index.css). New UI gets a class there, not a new stylesheet, unless it is a standalone page like Lottery Lab.
- TypeScript in `src/`. Node scrapers in `scripts/*.mjs`. The Cloudflare Worker is `worker/index.js`.
- Fonts load from Google in the CSS `@import`: **Anton** (display), **Inter** (body), **Geist Mono** (numbers, chips, tickets). Do not add a fourth family.

## Tokens

All color, type, and radius come from `:root` in `src/index.css`. Reuse these. Do not invent hex for a one-off.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#09090b` | Page |
| `--bg-2` / `--card` | `#18181b` | Panels |
| `--card-2` | `#1f1f22` | Raised controls |
| `--line` | `#ffffff14` | Hairline borders |
| `--ink` | `#fafafa` | Body text; also the “on” segment fill |
| `--muted` | `#a1a1aa` | Secondary lines |
| `--green` | `#00c758` | Go, uncrowded, live |
| `--green-bright` | `#05df72` | Focus rings |
| `--on-green` | `#052e16` | Text on green |
| `--red` | `#ef4444` | Crowded, skip, danger |
| `--gold` | `#f1fd0e` | Kickers, pattern score, brand accent |
| `--peach` | `#ffa057` | Warnings that are not errors |
| `--warn` | `#ffca16` | Entertain-only / caution |
| `--blue` | `#3b9eff` | Links, info |
| `--radius` | `0.75rem` | Buttons, cards, segments |
| `--sans` | Inter | Body |
| `--display` | Anton | `h1`, `h2`, `.brand` |
| `--mono` | Geist Mono | Boards, EV, crowd chips |

Dark only. `color-scheme: dark`. Do not add a light theme.

## Type and voice

Display headings are Anton, weight 400, uppercase, tight tracking. Body is Inter 16 / 1.45 with tabular numbers. Kickers (`.kicker`) are gold, uppercase, letter-spaced.

The room is a **night desk**, not a carnival and not a bank. Short sentences. Concrete nouns (board, rank, cash, crowd). No hype, no slang that implies a system, no “AI” on the masthead.

Numbers are first-class: tickets, EV, and crowd chips sit in mono. Prefer `·` as a separator in metadata lines (`Washington’s Lottery · 2026-08-17`).

## Layout

- Shell max width **1080px**, padded for safe areas.
- Sticky masthead: brand left, market / desk tools right. Tagline is two short sentences. If a third sentence clips, cut it; do not shrink Anton below the current size.
- Tickets use `.gen-layout` (board column + number pool). Ladder mode uses `.gen-layout.is-ladder` so the tile and the report both fit. Do not let ticket tiles bleed into the pool; clip inside the row if the column is tight.
- Mobile: segment controls wrap; tap targets stay at least 2.4–2.75rem.

## Controls

- **Segment** (`.segment`): inset dark track, selected button is `--ink` on `--bg` (white pill). Unselected text is muted gray. This is the mode / game switch.
- **Primary** button: ink fill, dark text. Generate, save, confirm.
- **On** button: green fill. Active filters, live states.
- **Danger**: red text on a dark red wash. Destructive only.
- Inputs: 16px to stop iOS zoom, dark field, white focus ring. Range sliders use green accent.

Hover styles exist only under `@media (hover: hover)`. Touch devices get the active press (`translateY(1px)`), not a sticky hover.

## Color meaning (do not mix)

- **Green**: uncrowded, positive EV (rare), live feed, selected “on.”
- **Red**: crowded, skip-as-investment, remove.
- **Gold**: pattern score, kickers, ladder rank. Gold is “this is the story,” not “this will hit.”
- **Yellow / peach**: caution, entertain-only, partial data.
- **Blue**: outbound / deep links only.

Crowd chips: green if lonelier than average, red if more crowded, flat if near 1.00×, gold for pattern points. Keep that mapping.

## Motion

Short and mechanical. 120–160ms on color and border. `FlashNum` ticks when a live figure changes. No page transitions, no confetti, no skeleton shimmer that looks like a prediction loading.

## Imagery

Ticket tiles are the product shot (save / share). They should keep looking like a printed slip: mono numbers, quiet chrome, no decorative illustration behind the balls. The email digest follows the same palette (bg `#09090b`, gold kicker, mono boards) but uses system fonts; web fonts are unreliable in mail.

## Copy: punctuation and the em dash

**Do not use em dashes** (`—`, U+2014) in user-facing copy. That includes the site, `index.html` meta, README blurbs, the digest email, and `docs/` files people might quote.

They show up as a writing tic (clause, clause, clause) and they clip badly in tight headers. Rewrite instead.

Allowed replacements:

| Instead of | Use |
| --- | --- |
| Parenthetical aside — like this — in a sentence | A period. A second sentence. Or parentheses. |
| Label — value | Colon: `Cashpot: $230,000` |
| Soft break in a metadata line | Middle dot: `Live feed · NY Open Data` |
| Two related independent clauses | Period, or a semicolon if they are truly a pair |
| Range of numbers or dates | En dash is fine: `2015-10-07–present`, `1–69` |
| Minus / negative EV | Hyphen-minus: `-2.00` |
| Menu ellipsis | `...` or a second line, not an em dash |

Examples:

- No: “The Ladder ranks boards — same odds as Quick Pick — and gets sharper over time.”
- Yes: “The Ladder ranks boards against measured history. Same hit odds as Quick Pick. The ranking gets sharper as new official draws land.”
- No: “EV — skip tonight”
- Yes: “EV: skip tonight” or “EV · skip”

En dashes (U+2013) for ranges, hyphens in compound adjectives, and minus signs in math are all fine. The ban is the long break-in-the-thought mark.

If you are tempted to use an em dash, the sentence is usually two sentences.

Also avoid: stacked slogans, “Unlock,” “Beats Quick Pick,” “AI picks,” and any line that would be illegal as an investment pitch. See [CLAIMS.md](CLAIMS.md).

## Docs and email

Internal docs (`docs/*`) follow the same punctuation rule so they can be pasted into the site. Code comments may stay conversational; do not let those phrases leak into UI strings.

The private digest ([DIGEST.md](DIGEST.md)) is user-facing copy. Same claims, same em-dash ban, same gold / mono hierarchy.

## Checklist before shipping UI

1. Tokens only. No new hex, no new font.
2. Claims pass: entertainment, same odds, scored replay. No forecast verbs on the masthead.
3. No em dashes in strings the user can see.
4. Ladder / ticket tiles do not clip the number pool.
5. Segment “on” state is the white pill, not a second green unless the control is a filter.
