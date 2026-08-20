# AGENTS.md

## Cursor Cloud specific instructions

JackpotDesk is a single front-end app: a React 19 + TypeScript site built with Vite, deployed as a static bundle to GitHub Pages. There is no backend to run locally — an optional Cloudflare Worker (`worker/index.js`, deployed with `wrangler`) proxies lottery feeds in production, but the site falls back to baked JSON in `src/data/` when the Worker is unreachable, so local dev needs no Worker, secrets, or `.env`.

Standard commands live in `package.json` `scripts`:

- `npm run dev` — Vite dev server on `http://localhost:5173/` (the primary way to run/develop the app).
- `npm run lint` — oxlint. Note: existing `react-hooks(exhaustive-deps)` warnings are pre-existing and do not fail the run (exit 0).
- `npm test` — vitest (unit tests for the scoring/EV/pattern libs in `src/lib` and the recap/scraper scripts).
- `npm run build` — `tsc -b && vite build`; output in `dist/`.

Non-obvious notes:

- Node 22 is required (matches `.github/workflows/deploy.yml`, which uses `npm ci` on Node 22).
- Route views (`BoardView`, `PoolView`, `MapView`, etc.) are `React.lazy` with `Suspense fallback={null}`, so switching tabs briefly shows a blank pane while the chunk loads. This is expected, not a bug.
- Pool/members/tickets are persisted in browser `localStorage`, not a server. State is per-browser.
- The `bake:*`, `digest`, and `recap` scripts scrape external lottery sites and are used by CI/cron; they are not needed to run or develop the app locally.
