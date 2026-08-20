/**
 * Private draw-night digest for the operator (one recipient).
 *
 * Builds the same Ladder #1–#3 the site shows, plus This-week EV for national
 * games and the WA cashpot line. Sends via Resend. Not a public signup.
 *
 *   npm run digest           # print + send if secrets are set
 *   npm run digest:dry       # print only
 */
import {
  SITE,
  assertNoEmDash,
  buildDigestPayload,
  digestCallLine,
  escapeHtml,
  type DigestPayload,
  type NationalBlock,
  type Rung,
} from "./lib/deskLetter.ts";

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
      <p style="margin:0 0 10px;font-size:14px;"><span style="color:${callColor};font-weight:700;">${digestCallLine(block.tone)}</span> · unique-ticket EV ${escapeHtml(block.netEv)} after 37% federal, 0% WA state.</p>
      <p style="margin:0 0 12px;color:#a1a1aa;font-size:13px;">${escapeHtml(block.advice)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${block.rungs.map(rungHtml).join("")}</table>
      <p style="margin:10px 0 0;color:#71717a;font-size:12px;">Last official ${escapeHtml(block.lastDraw ?? "n/a")} · ${block.history} draws in the model. <a href="${SITE}/?desk=national&game=${block.id}" style="color:#3b9eff;">Open the ladder</a></p>`;
    })
    .join("");

  const washington = payload.washington
    .map(
      (block) => `<h2 style="font-family:Impact,Arial Black,sans-serif;text-transform:uppercase;letter-spacing:0.04em;font-size:22px;margin:28px 0 8px;">${escapeHtml(block.label)}</h2>
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:13px;">${escapeHtml(block.when)}</p>
      <p style="margin:0 0 12px;font-size:14px;">${escapeHtml(block.prizeLine)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${block.rungs.map(rungHtml).join("")}</table>
      <p style="margin:10px 0 0;color:#71717a;font-size:12px;">Last official ${escapeHtml(block.lastDraw ?? "n/a")} · ${block.history} draws in the baked book. <a href="${SITE}/?desk=washington&wa=${block.id}" style="color:#3b9eff;">Open the ladder</a></p>`,
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
      `${digestCallLine(block.tone)} · unique-ticket EV ${block.netEv} after 37% federal, 0% WA state.`,
    );
    lines.push(block.advice);
    for (const rung of block.rungs) {
      lines.push(
        `  #${rung.rank}  ${rung.board}  ·  ${rung.points} pts${rung.crowd ? `  ·  ${rung.crowd}` : ""}`,
      );
      lines.push(`      ${rung.why}`);
    }
    lines.push(
      `Last official ${block.lastDraw ?? "n/a"} · ${block.history} draws. ${SITE}/?desk=national&game=${block.id}`,
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
      `Last official ${block.lastDraw ?? "n/a"} · ${block.history} draws. ${SITE}/?desk=washington&wa=${block.id}`,
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
  const bits = payload.national.map((block: NationalBlock) => {
    const short = block.id === "powerball" ? "PB" : "MM";
    const call =
      block.tone === "rare" ? "plus" : block.tone === "entertain" ? "play" : "skip";
    return `${short} ${call}`;
  });
  const tail = bits.length ? bits.join(" · ") : "feeds down";
  return `Desk digest · ${payload.asOf} · ${tail}`;
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
  const payload = await buildDigestPayload();
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
