/**
 * Public daily recap. Writes today's dated HTML + JSON, then rebuilds
 * /recap as a newest-first log of every public/recap/YYYY-MM-DD.json.
 * Does not delete older days. No query-string route. No tonight #1.
 *
 *   npm run recap
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { formatRecapHeading } from "../src/lib/recapRoute.ts";
import {
  SAME_ODDS_LEAD,
  SITE,
  assertNoEmDash,
  buildRecapPayload,
  escapeHtml,
  recapCallLine,
  recapDeskLine,
  recapDeskStrip,
  type RecapNational,
  type RecapPayload,
  type RecapWashington,
  type ReplayRung,
} from "./lib/deskLetter.ts";
import {
  padBall,
  recapExtraClass,
  recapHeatPaint,
  type RecapHeat,
} from "../src/lib/recapPayload.ts";
import {
  OVERTIME_NOTE,
  overtimeNetClass,
  overtimeNightRead,
  overtimeWatchClass,
  scoreOvertimeWindows,
  type OvertimeWindow,
} from "../src/lib/deskOvertime.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECAP_DIR = join(ROOT, "public", "recap");

export type RecapPage = {
  path: string;
  kind: "latest" | "archive";
};

const DAY_JSON = /^(\d{4}-\d{2}-\d{2})\.json$/;

export function listRecapDayFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => name.match(DAY_JSON)?.[1] ?? "")
    .filter(Boolean)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

export function loadRecapLog(dir: string): RecapPayload[] {
  return listRecapDayFiles(dir).map(
    (day) =>
      JSON.parse(readFileSync(join(dir, `${day}.json`), "utf8")) as RecapPayload,
  );
}

function callClass(tone: "no" | "entertain" | "rare"): string {
  if (tone === "rare") return "is-rare";
  if (tone === "entertain") return "is-entertain";
  return "is-skip";
}

function extraClass(extraLabel: string | null | undefined): string {
  const cls = recapExtraClass(extraLabel);
  return cls ? ` ${cls}` : "";
}

function ballsHtml(
  whites: number[],
  extra: number | null,
  extraLabel: string | null | undefined,
  hits?: Set<number>,
  extraHit?: boolean,
): string {
  const whiteBalls = whites
    .map((n) => {
      const hit = hits?.has(n) ? " is-hit" : "";
      return `<span class="recap-ball${hit}">${padBall(n)}</span>`;
    })
    .join("");
  const extraBall =
    extra == null || !extraLabel
      ? ""
      : `<span class="recap-ball${extraClass(extraLabel)}${extraHit ? " is-hit" : ""}">${padBall(extra)}</span>`;
  return `<div class="recap-balls">${whiteBalls}${extraBall}</div>`;
}

function compareHtml(
  officialDate: string,
  officialWhites: number[],
  officialExtra: number | null,
  extraLabel: string | null | undefined,
  officialBoard: string,
  top: ReplayRung | undefined,
): string {
  const hits = new Set(officialWhites);
  const official = `<div class="recap-slip">
      <p class="recap-slip-label">Official ${escapeHtml(officialDate)}</p>
      ${ballsHtml(officialWhites, officialExtra, extraLabel)}
      <p class="recap-board">${escapeHtml(officialBoard)}</p>
    </div>`;
  const nightOne = top
    ? `<div class="recap-slip">
      <p class="recap-slip-label">Last night #1</p>
      ${ballsHtml(top.whites, top.extra, extraLabel, hits, top.extraHit === true)}
      <p class="recap-board">${escapeHtml(top.board)}</p>
    </div>`
    : "";
  return `<div class="recap-compare">${official}${nightOne}</div>`;
}

function heatRowHtml(
  cells: RecapHeat["whites"],
  official: Set<number>,
  ladder: Set<number>,
  extraKind: string | null,
): string {
  return recapHeatPaint(cells)
    .map((cell) => {
      const marks = [
        official.has(cell.n) ? " is-official" : "",
        ladder.has(cell.n) ? " is-ladder" : "",
        extraKind ? ` ${extraKind}` : "",
      ].join("");
      return `<span class="recap-heat-cell${marks}" style="background:${cell.fill};color:${cell.ink}" title="${padBall(cell.n)} · ${cell.count} draws">${padBall(cell.n)}</span>`;
    })
    .join("");
}

function heatHtml(
  heat: RecapHeat | null | undefined,
  officialWhites: number[],
  officialExtra: number | null,
  top: ReplayRung | undefined,
): string {
  if (!heat) return "";
  const official = new Set(officialWhites);
  const ladder = new Set(top?.whites ?? []);
  const extraKind = recapExtraClass(heat.extraLabel);
  const extraOfficial = new Set(
    officialExtra != null ? [officialExtra] : [],
  );
  const extraLadder = new Set(top?.extra != null ? [top.extra] : []);
  const extras = heat.extras.length
    ? `<p class="recap-heat-label">${escapeHtml(heat.extraLabel || "Extra")}</p>
    <div class="recap-heat-grid">${heatRowHtml(heat.extras, extraOfficial, extraLadder, extraKind)}</div>`
    : "";
  return `<figure class="recap-heat">
    <figcaption>Frequency before this drawing · ${heat.draws} official draws. White rings are the official board. Yellow rings are last night's #1. Same hit odds as Quick Pick.</figcaption>
    <div class="recap-heat-grid">${heatRowHtml(heat.whites, official, ladder, null)}</div>
    ${extras}
  </figure>`;
}

function rungHtml(
  rung: ReplayRung,
  extraLabel: string | null | undefined,
  officialWhites: number[],
): string {
  const rankNote =
    rung.rank === 1
      ? " #1 is the strongest match to history before this drawing. Not the winning pick."
      : " Not the winning pick.";
  const hits = new Set(officialWhites);
  return `<article class="recap-rung">
      <p class="recap-rank">#${rung.rank}</p>
      ${ballsHtml(rung.whites, rung.extra, extraLabel, hits, rung.extraHit === true)}
      <p class="recap-board">${escapeHtml(rung.board)}</p>
      <p class="recap-match">${escapeHtml(rung.matchLine)}.${rankNote}</p>
      <p class="recap-meta">${rung.points} pts${rung.crowd ? ` · ${escapeHtml(rung.crowd)}` : ""}</p>
      <p class="recap-why">${escapeHtml(rung.why)}</p>
    </article>`;
}

function deskLineSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function deskLineBox(id: string, label: string, line: string): string {
  return `<aside class="recap-desk-line">
    <div class="recap-desk-line-head">
      <p class="recap-desk-line-label">${escapeHtml(label)}</p>
      <button type="button" class="recap-desk-line-copy" data-copy-target="${escapeHtml(id)}">Copy</button>
    </div>
    <p class="recap-desk-line-text" id="${escapeHtml(id)}">${escapeHtml(line)}</p>
    <p class="recap-desk-line-meta">${line.length}/280 · Last night vs last night's Ladder. Not tonight's #1.</p>
  </aside>`;
}

function deskLineHtml(block: RecapNational | RecapWashington, day: string): string {
  return deskLineBox(
    `desk-line-${deskLineSlug(block.label)}-${day}`,
    "Desk line",
    recapDeskLine(block),
  );
}

function dayLede(payload: RecapPayload): string {
  return (
    recapDeskStrip(payload) ??
    (payload.national[0]
      ? recapDeskLine(payload.national[0])
      : payload.washington[0]
        ? recapDeskLine(payload.washington[0])
        : "")
  );
}

function deskStripHtml(payload: RecapPayload): string {
  const line = dayLede(payload);
  if (!line) return "";
  return deskLineBox(`desk-line-strip-${payload.asOf}`, "Desk strip", line);
}

const DESK_LINE_COPY_SCRIPT = `
    <script>
      document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = document.getElementById(btn.getAttribute("data-copy-target") || "");
          var text = target ? (target.textContent || "").trim() : "";
          if (!text) return;
          function done(ok) {
            btn.textContent = ok ? "Copied" : "Copy failed";
            window.setTimeout(function () { btn.textContent = "Copy"; }, 1600);
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }).catch(function () { done(false); });
            return;
          }
          done(false);
        });
      });
    </script>`;

function nationalHtml(block: RecapNational, day: string): string {
  const call = recapCallLine(block.tone);
  return `<section class="panel recap-game">
    <header class="panel-head">
      <div>
        <p class="kicker">Last official · ${escapeHtml(block.label)}</p>
        <h2>${escapeHtml(block.label)}</h2>
      </div>
    </header>
    ${deskLineHtml(block, day)}
    ${compareHtml(block.officialDate, block.officialWhites, block.officialExtra, block.extraLabel, block.officialBoard, block.rungs[0])}
    ${heatHtml(block.heat, block.officialWhites, block.officialExtra, block.rungs[0])}
    <div class="recap-rungs">
    ${block.rungs.map((rung) => rungHtml(rung, block.extraLabel, block.officialWhites)).join("\n    ")}
    </div>
    <div class="verdict ${callClass(block.tone)}">
      <strong>${escapeHtml(call)}</strong>
      <span>Tonight · unique-ticket EV ${escapeHtml(block.netEv)} after 37% federal, 0% WA state. Advertised $${escapeHtml(block.advertised)} · cash $${escapeHtml(block.cash)}${block.nextDraw ? ` · next draw ${escapeHtml(block.nextDraw)}` : ""}.</span>
      <span>${escapeHtml(block.advice)}</span>
    </div>
    <a class="recap-ladder" href="${escapeHtml(block.ladderHref)}">
      Open the live Ladder for tonight
      <span>${block.historyBefore} official draws sat under last night's ranking. Tonight's #1 is on the live desk, not on this page.</span>
    </a>
  </section>`;
}

function washingtonHtml(block: RecapWashington, day: string): string {
  return `<section class="panel recap-game">
    <header class="panel-head">
      <div>
        <p class="kicker">${escapeHtml(block.when)}</p>
        <h2>${escapeHtml(block.label)}</h2>
      </div>
    </header>
    ${deskLineHtml(block, day)}
    <p class="fine">${escapeHtml(block.prizeLine)}</p>
    ${compareHtml(block.officialDate, block.officialWhites, block.officialExtra, null, block.officialBoard, block.rungs[0])}
    ${heatHtml(block.heat, block.officialWhites, block.officialExtra, block.rungs[0])}
    <div class="recap-rungs">
    ${block.rungs.map((rung) => rungHtml(rung, null, block.officialWhites)).join("\n    ")}
    </div>
    <a class="recap-ladder" href="${escapeHtml(block.ladderHref)}">
      Open the live Ladder for tonight
      <span>${block.historyBefore} official draws sat under last night's ranking. Tonight's #1 is on the live desk, not on this page.</span>
    </a>
  </section>`;
}

function slipsHtml(payload: RecapPayload): string {
  const national = payload.national
    .map((block) => nationalHtml(block, payload.asOf))
    .join("\n  ");
  const washington = payload.washington
    .map((block) => washingtonHtml(block, payload.asOf))
    .join("\n  ");
  if (national || washington) return `${national}\n        ${washington}`;
  return '<section class="panel desk-page"><p>No official drawings were ready to score.</p></section>';
}

function dayArticleHtml(
  payload: RecapPayload,
  expand: boolean,
): string {
  const heading = formatRecapHeading(payload.asOf);
  const notes =
    expand && payload.notes.length
      ? `<p class="desk-status is-err">${payload.notes.map(escapeHtml).join("<br>")}</p>`
      : "";
  const body = expand
    ? `${notes}\n    ${slipsHtml(payload)}`
    : `<p class="recap-open"><a href="/recap/${escapeHtml(payload.asOf)}">Open the slip</a></p>`;
  return `<article class="panel recap-day" data-recap-day="${escapeHtml(payload.asOf)}">
    <header class="recap-day-head">
      <p class="kicker">Night desk</p>
      <h2>
        <a class="recap-day-link" href="/recap/${escapeHtml(payload.asOf)}">${escapeHtml(heading)}</a>
      </h2>
    </header>
    ${deskStripHtml(payload)}
    ${body}
  </article>`;
}

function overtimeWatchesHtml(window: OvertimeWindow): string {
  return `<dl class="recap-overtime-watches">
      <div>
        <dt>Any revenue</dt>
        <dd class="${overtimeWatchClass(window.revenueWatch)}">${escapeHtml(window.revenueWatch)}</dd>
      </div>
      <div>
        <dt>Beat the house</dt>
        <dd class="${overtimeWatchClass(window.houseWatch)}">${escapeHtml(window.houseWatch)}</dd>
      </div>
    </dl>`;
}

function overtimeWindowHtml(window: OvertimeWindow): string {
  const games = window.games
    .map((row) => `<li>${escapeHtml(row.line)}</li>`)
    .join("");
  return `<section class="recap-overtime-window${window.filling ? " is-filling" : ""}" data-overtime-window="${escapeHtml(window.id)}">
      <p class="recap-overtime-window-label">${escapeHtml(window.label)}</p>
      <p class="recap-overtime-headline ${overtimeNetClass(window)}">${escapeHtml(window.headline)}</p>
      <p class="recap-overtime-across">${escapeHtml(window.acrossLine)}</p>
      <ul class="recap-overtime-games">${games}</ul>
      ${overtimeWatchesHtml(window)}
    </section>`;
}

function overtimeHtml(log: RecapPayload[]): string {
  const desk = scoreOvertimeWindows(log);
  if (!desk.windows.length && !desk.all.mornings) return "";
  const night = desk.lastNight
    ? `<p class="recap-overtime-night">${escapeHtml(
        overtimeNightRead(
          desk.lastNight.nightLine,
          formatRecapHeading(desk.lastNight.asOf),
        ),
      )}</p>`
    : "";
  const lead = desk.windows[0] ?? desk.all;
  const all = desk.all.mornings
    ? `<p class="fine recap-overtime-all">${escapeHtml(`${desk.all.headline} · ${desk.all.acrossLine}`)}</p>`
    : "";
  return `<aside class="panel recap-overtime" aria-label="Overtime">
    <header class="panel-head">
      <div>
        <p class="kicker">Overtime · Ladder #1–#3</p>
        <h2 class="${overtimeNetClass(lead)}">${escapeHtml(lead.headline)}</h2>
      </div>
    </header>
    ${night}
    ${desk.windows.map(overtimeWindowHtml).join("\n    ")}
    ${all}
    <p class="fine recap-overtime-note">${escapeHtml(OVERTIME_NOTE)}</p>
  </aside>`;
}

function labFooterHtml(archive: boolean): string {
  const back = archive
    ? `<p class="fine"><a href="/recap">Latest recap</a></p>`
    : "";
  return `<section class="panel desk-page">
          <header class="panel-head">
            <div>
              <p class="kicker">Live desk</p>
              <h2>Desk pick</h2>
            </div>
          </header>
          <p>
            Same hit odds as Quick Pick. The Ladder ranks scanned boards against
            official draw history. This log is last night versus last night's Ladder.
            Entertainment, not prediction.
          </p>
          <p>
            Desk pick is the least-crowded board on the live desk. It is not a forecast
            and it is not tonight's #1. Open
            <a href="/">the desk</a>
            if you already planned to play and want the lonelier mint.
          </p>
          <p>
            <a href="/lottery-lab.html">Lottery Lab</a> stays the proof page: models
            cannot beat Quick Pick. The Ladder ranks the past.
          </p>
          ${back}
          <p class="fine">
            Entertainment only. We do not sell tickets. Responsible gaming:
            <a href="https://www.ncpgambling.org/">ncpgambling.org</a>
          </p>
        </section>`;
}

export function formatRecapHtml(
  payload: RecapPayload,
  page: RecapPage = { path: "/recap", kind: "latest" },
  log: RecapPayload[] = [payload],
): string {
  const days = (log.length ? log : [payload]).slice();
  const scoreLog =
    page.kind === "archive"
      ? days.filter((day) => day.asOf <= payload.asOf)
      : days;
  const overtime = overtimeHtml(scoreLog.length ? scoreLog : [payload]);
  const main =
    page.kind === "archive"
      ? dayArticleHtml(payload, true)
      : days
          .map((day, index) => dayArticleHtml(day, index === 0))
          .join("\n        ");
  const title =
    page.kind === "archive"
      ? `Recap · ${formatRecapHeading(payload.asOf)} | JackpotDesk`
      : "Recap | JackpotDesk";
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
    <link rel="stylesheet" href="/desk-page.css" />
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
  <body>
    <div class="shell">
      <div class="chrome">
        <header class="masthead">
          <div class="masthead-row">
            <div class="masthead-brand">
              <h1 class="brand">
                <a class="brand-home" href="/" aria-label="JackpotDesk home">
                  <img class="brand-logo" src="/logo.png" alt="" width="294" height="41" />
                </a>
              </h1>
              <p class="tag">
                The Ladder ranks every scanned board against measured history.
                Same hit odds as Quick Pick.
              </p>
              <a class="masthead-recap" href="/recap">
                Recap
                <span>Last night vs The Ladder</span>
              </a>
            </div>
          </div>
        </header>
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
      </div>
      <main class="recap-main">
        ${overtime}
        ${main}
        ${labFooterHtml(page.kind === "archive")}
      </main>
      <footer class="site-footer">
        <nav class="footer-links" aria-label="Site">
          <a class="footer-btn" href="/">Desk</a>
          <a class="footer-btn" href="/recap">Recap</a>
          <a class="footer-btn" href="/washington/claimed-prizes-by-store">Claimed prizes</a>
          <a class="footer-btn" href="/expected-value.html">Expected value</a>
          <a class="footer-btn" href="/unique-tickets.html">Unique tickets</a>
          <a class="footer-btn" href="/office-pool.html">Office pool</a>
          <a class="footer-btn" href="/lottery-lab.html">Lottery Lab</a>
          <a class="footer-btn" href="/about.html">About</a>
          <span class="footer-copy">© 2026 JackpotDesk</span>
        </nav>
      </footer>
    </div>
    ${DESK_LINE_COPY_SCRIPT}
  </body>
</html>
`;
}

export function writeRecapPages(payload: RecapPayload, dir = RECAP_DIR): string[] {
  mkdirSync(dir, { recursive: true });
  const json = `${JSON.stringify(payload)}\n`;
  writeFileSync(join(dir, `${payload.asOf}.json`), json);
  writeFileSync(join(dir, "latest.json"), json);

  const log = loadRecapLog(dir);
  writeFileSync(
    join(dir, "log.json"),
    `${JSON.stringify({ days: log.map((day) => day.asOf) })}\n`,
  );

  const archive = formatRecapHtml(
    payload,
    {
      path: `/recap/${payload.asOf}`,
      kind: "archive",
    },
    log,
  );
  assertNoEmDash(`/recap/${payload.asOf}`, archive);
  const archiveFile = join(dir, payload.asOf, "index.html");
  mkdirSync(dirname(archiveFile), { recursive: true });
  writeFileSync(archiveFile, archive);

  const latest = formatRecapHtml(
    log[0] ?? payload,
    { path: "/recap", kind: "latest" },
    log,
  );
  assertNoEmDash("/recap", latest);
  const latestFile = join(dir, "index.html");
  writeFileSync(latestFile, latest);
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
