/**
 * Private draw-night digest for the operator (one recipient).
 *
 * Builds the same Ladder #1–#3 the site shows, plus This-week EV for national
 * games and the WA cashpot line. Sends via Resend. Not a public signup.
 *
 *   npm run digest           # print + send if secrets are set
 *   npm run digest:dry       # print only
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMarket, estimateTicketsSold } from "../src/lib/market.ts";
import {
  computeEv,
  formatCompact,
  moneyExact,
  playAdvice,
} from "../src/lib/ev.ts";
import { crowdReading, waCrowdReading } from "../src/lib/popularity.ts";
import {
  buildPatternModel,
  patternLadder,
  type LadderEntry,
} from "../src/lib/patternLab.ts";
import { GAMES } from "../src/lib/prizes.ts";
import { fetchOfficialDraws } from "../src/lib/winners.ts";
import { WA_GAMES } from "../src/lib/waGames.ts";
import type { GameId, WaGameId } from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.jackpotdesk.com";
const TAX = { federalTax: 0.37, stateTax: 0, humanTicketShare: 0.2 };
const LADDER_TOP = 3;

type WaBook = {
  asOf?: string;
  draws?: Record<string, { date: string; numbers: number[] }[]>;
  prizes?: {
    hit5?: { cashpot?: number };
    lotto?: { advertised?: number; cash?: number };
  };
};

type NationalBlock = {
  id: GameId;
  label: string;
  extraLabel: string;
  nextDraw: string | null;
  advertised: string;
  cash: string;
  netEv: string;
  advice: string;
  tone: "no" | "entertain" | "rare";
  lastDraw: string | null;
  history: number;
  rungs: Rung[];
};

type WaBlock = {
  id: WaGameId;
  label: string;
  when: string;
  prizeLine: string;
  lastDraw: string | null;
  history: number;
  rungs: Rung[];
};

type Rung = {
  rank: number;
  board: string;
  points: number;
  crowd: string | null;
  why: string;
};

type DigestPayload = {
  asOf: string;
  national: NationalBlock[];
  washington: WaBlock[];
  notes: string[];
};

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function boardLine(numbers: number[], extra: number | null, extraLabel: string | null): string {
  const whites = numbers.map((n) => String(n).padStart(2, "0")).join("  ");
  if (extra == null || !extraLabel) return whites;
  return `${whites}  +  ${String(extra).padStart(2, "0")} ${extraLabel}`;
}

function crowdLabel(
  reading: { index: number; beats: number } | null,
): string | null {
  if (!reading) return null;
  return `${reading.index.toFixed(2)}x crowd · beats ${reading.beats}% of random boards`;
}

function rungsFrom(
  entries: LadderEntry[],
  extraLabel: string | null,
  crowd: (entry: LadderEntry) => { index: number; beats: number } | null,
): Rung[] {
  return entries.slice(0, LADDER_TOP).map((entry) => ({
    rank: entry.rank,
    board: boardLine(entry.numbers, entry.extra, extraLabel),
    points: entry.points,
    crowd: crowdLabel(crowd(entry)),
    why: entry.why,
  }));
}

function loadWaBook(): WaBook {
  return JSON.parse(
    readFileSync(join(ROOT, "src/data/waDraws.json"), "utf8"),
  ) as WaBook;
}

async function nationalBlock(game: GameId): Promise<NationalBlock> {
  const spec = GAMES[game];
  const [market, official] = await Promise.all([
    fetchMarket(game),
    fetchOfficialDraws(game),
  ]);
  const ticketsSold = estimateTicketsSold(market.advertised, spec.ticketCost);
  const ev = computeEv(game, {
    advertisedJackpot: market.advertised,
    cashJackpot: market.cash,
    ticketsSold,
    ...TAX,
  });
  const advice = playAdvice(ev.unique.netEv);
  const model = buildPatternModel(
    official.draws.map((d) => ({ numbers: d.whites, extra: d.extra })),
    spec.whiteMax,
    spec.extraMax,
  );
  if (!model) {
    throw new Error(`Not enough ${spec.label} history to rank`);
  }
  const ladder = patternLadder(model, 5, LADDER_TOP);
  return {
    id: game,
    label: spec.label,
    extraLabel: spec.extraLabel,
    nextDraw: market.nextDraw,
    advertised: formatCompact(market.advertised),
    cash: formatCompact(market.cash),
    netEv: moneyExact.format(ev.unique.netEv),
    advice: advice.text,
    tone: advice.tone,
    lastDraw: official.asOf,
    history: official.draws.length,
    rungs: rungsFrom(ladder.entries, spec.extraLabel, (entry) =>
      entry.extra == null
        ? null
        : crowdReading(game, entry.numbers, entry.extra),
    ),
  };
}

function waWhen(id: WaGameId): string {
  if (id === "hit5") return "Daily 8 p.m. PT";
  if (id === "lotto") return "Mon / Wed / Sat 8 p.m. PT";
  return "See Washington's Lottery";
}

function waBlock(book: WaBook, id: "hit5" | "lotto"): WaBlock {
  const spec = WA_GAMES[id];
  const draws = book.draws?.[id] ?? [];
  const model = buildPatternModel(
    draws.map((d) => ({ numbers: d.numbers })),
    spec.whiteMax,
  );
  if (!model) {
    throw new Error(`Not enough ${spec.label} history to rank`);
  }
  const ladder = patternLadder(model, spec.whiteCount, LADDER_TOP);
  let prizeLine: string;
  if (id === "hit5") {
    const cashpot = book.prizes?.hit5?.cashpot ?? 0;
    const share = cashpot / spec.jackpotOdds;
    prizeLine = `Cashpot ${moneyExact.format(cashpot)}. About ${moneyExact.format(share)} of the $1 is the cashpot before lower prizes.`;
  } else {
    const advertised = book.prizes?.lotto?.advertised ?? 0;
    const cash = book.prizes?.lotto?.cash ?? 0;
    const share = (2 * cash) / spec.jackpotOdds;
    prizeLine = `Advertised ${moneyExact.format(advertised)} · cash ${moneyExact.format(cash)}. About ${moneyExact.format(share)} of the $1 is the cash jackpot (two boards per dollar).`;
  }
  return {
    id,
    label: spec.label,
    when: waWhen(id),
    prizeLine,
    lastDraw: draws[0]?.date ?? book.asOf ?? null,
    history: draws.length,
    rungs: rungsFrom(ladder.entries, null, (entry) =>
      waCrowdReading(id, entry.numbers),
    ),
  };
}

async function buildPayload(): Promise<DigestPayload> {
  const notes: string[] = [];
  const national: NationalBlock[] = [];
  for (const game of ["powerball", "megamillions"] as const) {
    try {
      national.push(await nationalBlock(game));
    } catch (err) {
      notes.push(
        `${GAMES[game].label} feed failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  const washington: WaBlock[] = [];
  try {
    const book = loadWaBook();
    for (const id of ["hit5", "lotto"] as const) {
      try {
        washington.push(waBlock(book, id));
      } catch (err) {
        notes.push(
          `${WA_GAMES[id].label} ranking failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    notes.push(
      `Washington book failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return { asOf: todayIso(), national, washington, notes };
}

function callLine(block: NationalBlock): string {
  if (block.tone === "rare") return "RARE PLUS";
  if (block.tone === "entertain") return "ENTERTAIN ONLY";
  return "SKIP AS AN INVESTMENT";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rungHtml(rung: Rung): string {
  return `<tr>
    <td style="padding:10px 0;border-top:1px solid #ffffff14;vertical-align:top;width:2.4rem;font-family:ui-monospace,Menlo,monospace;color:#f1fd0e;font-weight:700;">#${rung.rank}</td>
    <td style="padding:10px 0;border-top:1px solid #ffffff14;vertical-align:top;">
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;letter-spacing:0.04em;">${escapeHtml(rung.board)}</div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">${rung.points} pts${rung.crowd ? ` · ${escapeHtml(rung.crowd)}` : ""}</div>
      <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">${escapeHtml(rung.why)}</div>
    </td>
  </tr>`;
}

function formatHtml(payload: DigestPayload): string {
  const national = payload.national
    .map((block) => {
      const callColor =
        block.tone === "no" ? "#ef4444" : block.tone === "rare" ? "#00c758" : "#ffca16";
      return `<h2 style="font-family:Impact,Arial Black,sans-serif;text-transform:uppercase;letter-spacing:0.04em;font-size:22px;margin:28px 0 8px;">${escapeHtml(block.label)}</h2>
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:13px;">Next draw ${escapeHtml(block.nextDraw ?? "unlisted")} · advertised $${escapeHtml(block.advertised)} · cash $${escapeHtml(block.cash)}</p>
      <p style="margin:0 0 10px;font-size:14px;"><span style="color:${callColor};font-weight:700;">${callLine(block)}</span> · unique-ticket EV ${escapeHtml(block.netEv)} after 37% federal, 0% WA state.</p>
      <p style="margin:0 0 12px;color:#a1a1aa;font-size:13px;">${escapeHtml(block.advice)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${block.rungs.map(rungHtml).join("")}</table>
      <p style="margin:10px 0 0;color:#71717a;font-size:12px;">Last official ${escapeHtml(block.lastDraw ?? "n/a")} · ${block.history} draws in the model. <a href="${SITE}/?desk=national&game=${block.id}&tab=tickets" style="color:#3b9eff;">Open the ladder</a></p>`;
    })
    .join("");

  const washington = payload.washington
    .map(
      (block) => `<h2 style="font-family:Impact,Arial Black,sans-serif;text-transform:uppercase;letter-spacing:0.04em;font-size:22px;margin:28px 0 8px;">${escapeHtml(block.label)}</h2>
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:13px;">${escapeHtml(block.when)}</p>
      <p style="margin:0 0 12px;font-size:14px;">${escapeHtml(block.prizeLine)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${block.rungs.map(rungHtml).join("")}</table>
      <p style="margin:10px 0 0;color:#71717a;font-size:12px;">Last official ${escapeHtml(block.lastDraw ?? "n/a")} · ${block.history} draws in the baked book. <a href="${SITE}/?desk=washington&wa=${block.id}&tab=tickets" style="color:#3b9eff;">Open the ladder</a></p>`,
    )
    .join("");

  const notes = payload.notes.length
    ? `<p style="margin:24px 0 0;color:#ffa057;font-size:13px;">${payload.notes.map(escapeHtml).join("<br>")}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;background:#09090b;color:#fafafa;font-family:Inter,system-ui,Segoe UI,sans-serif;line-height:1.45;">
  <div style="max-width:640px;margin:0 auto;padding:28px 20px 40px;">
    <p style="margin:0;color:#f1fd0e;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">JackpotDesk · private digest</p>
    <h1 style="font-family:Impact,Arial Black,sans-serif;text-transform:uppercase;letter-spacing:0.03em;font-size:32px;margin:8px 0 10px;">What to buy · ${escapeHtml(payload.asOf)}</h1>
    <p style="margin:0 0 8px;color:#a1a1aa;font-size:14px;">Ladder ranks #1 to #3 against measured history. Same hit odds as Quick Pick. This is a scored replay of the past, not a forecast.</p>
    <p style="margin:0;color:#71717a;font-size:13px;">You are the only subscriber. Do not forward as “winning numbers.”</p>
    ${national}
    ${washington}
    ${notes}
    <p style="margin:32px 0 0;color:#71717a;font-size:12px;">Entertainment only. We do not sell tickets. Responsible gaming: <a href="https://www.ncpgambling.org/" style="color:#3b9eff;">ncpgambling.org</a></p>
  </div>
</body></html>`;
}

function formatText(payload: DigestPayload): string {
  const lines: string[] = [
    `JackpotDesk private digest · ${payload.asOf}`,
    "",
    "Ladder ranks #1 to #3 against measured history. Same hit odds as Quick Pick.",
    "This is a scored replay of the past, not a forecast. You are the only subscriber.",
    "",
  ];
  for (const block of payload.national) {
    lines.push(block.label.toUpperCase());
    lines.push(
      `Next draw ${block.nextDraw ?? "unlisted"} · advertised $${block.advertised} · cash $${block.cash}`,
    );
    lines.push(
      `${callLine(block)} · unique-ticket EV ${block.netEv} after 37% federal, 0% WA state.`,
    );
    lines.push(block.advice);
    for (const rung of block.rungs) {
      lines.push(
        `  #${rung.rank}  ${rung.board}  ·  ${rung.points} pts${rung.crowd ? `  ·  ${rung.crowd}` : ""}`,
      );
      lines.push(`      ${rung.why}`);
    }
    lines.push(
      `Last official ${block.lastDraw ?? "n/a"} · ${block.history} draws. ${SITE}/?desk=national&game=${block.id}&tab=tickets`,
    );
    lines.push("");
  }
  for (const block of payload.washington) {
    lines.push(block.label.toUpperCase());
    lines.push(block.when);
    lines.push(block.prizeLine);
    for (const rung of block.rungs) {
      lines.push(
        `  #${rung.rank}  ${rung.board}  ·  ${rung.points} pts${rung.crowd ? `  ·  ${rung.crowd}` : ""}`,
      );
      lines.push(`      ${rung.why}`);
    }
    lines.push(
      `Last official ${block.lastDraw ?? "n/a"} · ${block.history} draws. ${SITE}/?desk=washington&wa=${block.id}&tab=tickets`,
    );
    lines.push("");
  }
  if (payload.notes.length) {
    lines.push("Notes");
    for (const note of payload.notes) lines.push(`  ${note}`);
    lines.push("");
  }
  lines.push("Entertainment only. We do not sell tickets. https://www.ncpgambling.org/");
  return lines.join("\n");
}

function subjectLine(payload: DigestPayload): string {
  const bits = payload.national.map((block) => {
    const short = block.id === "powerball" ? "PB" : "MM";
    const call =
      block.tone === "rare" ? "plus" : block.tone === "entertain" ? "play" : "skip";
    return `${short} ${call}`;
  });
  const tail = bits.length ? bits.join(" · ") : "feeds down";
  return `Desk digest · ${payload.asOf} · ${tail}`;
}

function assertNoEmDash(label: string, raw: string): void {
  if (raw.includes("\u2014") || raw.includes("—")) {
    throw new Error(`${label} contains an em dash`);
  }
}

async function sendResend(subject: string, html: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO_EMAIL;
  const from = process.env.DIGEST_FROM || "JackpotDesk <beth.t@example.com>";
  if (!apiKey || !to) {
    throw new Error(
      "Missing RESEND_API_KEY or DIGEST_TO_EMAIL. Add them as GitHub Actions secrets. See docs/DIGEST.md.",
    );
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend HTTP ${response.status}: ${body}`);
  }
  console.log(`Sent to ${to}: ${body}`);
}

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry");
  const payload = await buildPayload();
  const subject = subjectLine(payload);
  const html = formatHtml(payload);
  const text = formatText(payload);
  assertNoEmDash("subject", subject);
  assertNoEmDash("html", html);
  assertNoEmDash("text", text);
  console.log(text);
  if (dry) {
    console.log("\nDry run. No email sent.");
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_TO_EMAIL) {
    console.log(
      "\nSecrets not set. Printed only. Add RESEND_API_KEY and DIGEST_TO_EMAIL to send. See docs/DIGEST.md.",
    );
    return;
  }
  await sendResend(subject, html, text);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
