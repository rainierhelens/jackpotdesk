/**
 * Public daily recap. Writes the latest page to /recap and a dated copy
 * to /recap/YYYY-MM-DD. No query-string route. No tonight #1. No signup.
 *
 *   npm run recap
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SAME_ODDS_LEAD,
  SITE,
  assertNoEmDash,
  buildRecapPayload,
  escapeHtml,
  recapCallLine,
  type RecapNational,
  type RecapPayload,
  type RecapWashington,
  type ReplayRung,
} from "./lib/deskLetter.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECAP_DIR = join(ROOT, "public", "recap");

const LEAD = `${SAME_ODDS_LEAD} This page is last night's official results against the Ladder that was live before those numbers landed. Entertainment, not prediction. Rank #1 is the strongest match to the past, never the winning pick.`;

export type RecapPage = {
  path: string;
  kind: "latest" | "archive";
};

function callClass(tone: "no" | "entertain" | "rare"): string {
  if (tone === "rare") return "is-rare";
  if (tone === "entertain") return "is-entertain";
  return "is-skip";
}

function rungHtml(rung: ReplayRung): string {
  const rankNote =
    rung.rank === 1
      ? " #1 is the strongest match to history before this drawing. Not the winning pick."
      : " Not the winning pick.";
  return `<article class="recap-rung">
      <p class="recap-rank">#${rung.rank}</p>
      <p class="recap-board">${escapeHtml(rung.board)}</p>
      <p class="recap-match">${escapeHtml(rung.matchLine)}.${rankNote}</p>
      <p class="recap-meta">${rung.points} pts${rung.crowd ? ` · ${escapeHtml(rung.crowd)}` : ""}</p>
      <p class="recap-why">${escapeHtml(rung.why)}</p>
    </article>`;
}

function nationalHtml(block: RecapNational): string {
  const call = recapCallLine(block.tone);
  return `<section class="recap-game">
    <h2>${escapeHtml(block.label)}</h2>
    <p class="recap-official">Official ${escapeHtml(block.officialDate)} · <span class="recap-board">${escapeHtml(block.officialBoard)}</span></p>
    ${block.rungs.map(rungHtml).join("\n    ")}
    <div class="verdict ${callClass(block.tone)}">
      <strong>${escapeHtml(call)}</strong>
      <span>Tonight · unique-ticket EV ${escapeHtml(block.netEv)} after 37% federal, 0% WA state. Advertised $${escapeHtml(block.advertised)} · cash $${escapeHtml(block.cash)}${block.nextDraw ? ` · next draw ${escapeHtml(block.nextDraw)}` : ""}.</span>
      <span>${escapeHtml(block.advice)}</span>
    </div>
    <a class="help" href="${escapeHtml(block.ladderHref)}">
      Open the live Ladder for tonight
      <span>${block.historyBefore} official draws sat under last night's ranking. Tonight's #1 is on the live desk, not on this page.</span>
    </a>
  </section>`;
}

function washingtonHtml(block: RecapWashington): string {
  return `<section class="recap-game">
    <h2>${escapeHtml(block.label)}</h2>
    <p class="updated">${escapeHtml(block.when)}</p>
    <p class="recap-official">Official ${escapeHtml(block.officialDate)} · <span class="recap-board">${escapeHtml(block.officialBoard)}</span></p>
    <p>${escapeHtml(block.prizeLine)}</p>
    ${block.rungs.map(rungHtml).join("\n    ")}
    <a class="help" href="${escapeHtml(block.ladderHref)}">
      Open the live Ladder for tonight
      <span>${block.historyBefore} official draws sat under last night's ranking. Tonight's #1 is on the live desk, not on this page.</span>
    </a>
  </section>`;
}

export function formatRecapHtml(
  payload: RecapPayload,
  page: RecapPage = { path: "/recap", kind: "latest" },
): string {
  const national = payload.national.map(nationalHtml).join("\n  ");
  const washington = payload.washington.map(washingtonHtml).join("\n  ");
  const notes = payload.notes.length
    ? `<p class="desk-status is-err">${payload.notes.map(escapeHtml).join("<br>")}</p>`
    : "";
  const games =
    national || washington
      ? `${national}\n  ${washington}`
      : "<p>No official drawings were ready to score.</p>";
  const title =
    page.kind === "archive"
      ? `Recap · ${payload.asOf} | JackpotDesk`
      : "Recap | JackpotDesk";
  const datedPath = `/recap/${payload.asOf}`;
  const stamp =
    page.kind === "archive"
      ? `Recap for ${escapeHtml(payload.asOf)}. <a href="/recap">Latest recap</a>`
      : `Built ${escapeHtml(payload.asOf)} from the latest official draws. <a href="${escapeHtml(datedPath)}">Permalink ${escapeHtml(datedPath)}</a>`;

  const recapCurrent =
    page.kind === "latest" ? ' class="on" aria-current="page"' : ' class="on"';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(title)}</title>
    <meta
      name="description"
      content="${SAME_ODDS_LEAD} Last official results versus last night's Ladder #1 to #3. Entertainment, not prediction."
    />
    <link rel="canonical" href="${SITE}${page.path}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Geist+Mono:wght@400;700&family=Inter:wght@400;600;700&display=swap" />
    <link rel="stylesheet" href="/legal.css" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="JackpotDesk" />
    <meta property="og:url" content="${SITE}${page.path}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta
      property="og:description"
      content="${SAME_ODDS_LEAD} A scored replay of the past, not a forecast."
    />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${SITE}/og-image.png" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-3HEMBNLM71"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-3HEMBNLM71');
    </script>
  </head>
  <body class="recap-body">
    <header class="recap-chrome">
      <a class="legal-brand" href="/"><img src="/logo.png" alt="JackpotDesk" width="220" height="31" /></a>
      <a class="masthead-recap" href="/recap">
        Recap
        <span>Last night vs The Ladder</span>
      </a>
      <nav class="tabs" aria-label="Primary">
        <a href="/">Desk</a>
        <a href="/recap"${recapCurrent}>Recap</a>
        <a href="/?tab=tickets">Tickets</a>
        <a href="/?tab=week"><span class="tab-full">This week</span><span class="tab-short">Week</span></a>
        <a href="/?tab=map">Map</a>
        <a href="/?tab=pool">Pool</a>
        <a href="/?tab=why"><span class="tab-full">Why this</span><span class="tab-short">Why</span></a>
        <a href="/?tab=write"><span class="tab-full">Write the desk</span><span class="tab-short">Write</span></a>
      </nav>
    </header>
    <main class="legal recap">
      <nav class="legal-nav" aria-label="Site">
        <a href="/">Desk</a>
        <a href="/recap"${page.kind === "latest" ? ' aria-current="page"' : ""}>Recap</a>
        <a href="/about.html">About</a>
        <a href="/tip.html">Tip the desk</a>
        <a href="/contact.html">Write the desk</a>
        <a href="/how-to-play.html">How to play</a>
        <a href="/refer.html">Refer a friend</a>
        <a href="/responsible.html">Responsible gaming</a>
        <a href="/accessibility.html">Accessibility</a>
        <a href="/terms.html">Terms</a>
        <a href="/privacy.html">Privacy</a>
      </nav>
      <nav class="legal-nav" aria-label="Tools">
        <a href="/recap"${page.kind === "latest" ? ' aria-current="page"' : ""}>Recap</a>
        <a href="/expected-value.html">Expected value</a>
        <a href="/unique-tickets.html">Unique tickets</a>
        <a href="/office-pool.html">Office pool</a>
        <a href="/lottery-lab.html">Lottery Lab</a>
      </nav>
      <p class="kicker">JackpotDesk · scored replay</p>
      <h1>Recap</h1>
      <p class="updated">${stamp}</p>
      <p>${escapeHtml(LEAD)}</p>
      ${games}
      ${notes}
      <h2>Desk pick</h2>
      <p>
        Desk pick is the least-crowded board on the live desk. It is not a forecast
        and it is not tonight's #1. Open
        <a href="/">the desk</a>
        if you already planned to play and want the lonelier mint.
      </p>
      <p class="why-lab">
        <a href="/lottery-lab.html">Lottery Lab</a> stays the proof page: models
        cannot beat Quick Pick. The Ladder ranks the past.
      </p>
      <p class="fine">
        Entertainment only. We do not sell tickets. Responsible gaming:
        <a href="https://www.ncpgambling.org/">ncpgambling.org</a>
      </p>
    </main>
  </body>
</html>
`;
}

export function writeRecapPages(payload: RecapPayload): string[] {
  const latest = formatRecapHtml(payload, { path: "/recap", kind: "latest" });
  const archive = formatRecapHtml(payload, {
    path: `/recap/${payload.asOf}`,
    kind: "archive",
  });
  assertNoEmDash("/recap", latest);
  assertNoEmDash(`/recap/${payload.asOf}`, archive);
  const latestFile = join(RECAP_DIR, "index.html");
  const archiveFile = join(RECAP_DIR, payload.asOf, "index.html");
  mkdirSync(dirname(latestFile), { recursive: true });
  mkdirSync(dirname(archiveFile), { recursive: true });
  writeFileSync(latestFile, latest);
  writeFileSync(archiveFile, archive);
  return [latestFile, archiveFile];
}

async function main(): Promise<void> {
  const payload = await buildRecapPayload();
  const paths = writeRecapPages(payload);
  const games = [
    ...payload.national.map((g) => `${g.label} ${g.officialDate}`),
    ...payload.washington.map((g) => `${g.label} ${g.officialDate}`),
  ];
  console.log(`Wrote ${paths.join(" · ")}`);
  console.log(`Games: ${games.join(" · ") || "none"}`);
  if (payload.notes.length) {
    console.log(`Notes: ${payload.notes.join(" | ")}`);
  }
}

const isMain = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href,
);

if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
