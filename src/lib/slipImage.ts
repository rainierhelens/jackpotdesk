import { pad2 } from "./picks";
import { GAMES } from "./prizes";
import type { GameId, Ticket } from "../types";

const PAPER = "#fffaf4";
const PAPER_2 = "#f3ebe3";
const INK = "#161616";
const MUTED = "#5c534c";
const PB = "#e31837";
const MM_NAVY = "#0033a0";
const MM_GOLD = "#f6c51a";
const MM_EXTRA = "#b8860b";
const FONT = "Menlo, ui-monospace, SFMono-Regular, monospace";

export function playCode(i: number): string {
  if (i < 26) return String.fromCharCode(65 + i);
  return String(i + 1);
}

export function barcodeWidths(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({ length: 48 }, (_, i) => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return 1 + (Math.abs(h + i * 97) % 4);
  });
}

type SlipImage = {
  game: GameId;
  tickets: Ticket[];
  drawLabel?: string | null;
};

export async function saveSlipImage(opts: SlipImage): Promise<"shared" | "downloaded" | "cancelled"> {
  if (opts.tickets.length === 0) {
    throw new Error("No tickets to save");
  }
  const blob = await renderSlipPng(opts);
  const spec = GAMES[opts.game];
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `jackpotdesk-${spec.id}-${stamp}.png`;

  if (isAppleTouch()) {
    const file = new File([blob], filename, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${spec.label} slip`,
        });
        return "shared";
      }
    } catch (err) {
      if (isAbort(err)) return "cancelled";
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

function isAppleTouch(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAbort(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name: string }).name === "AbortError"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

function renderSlipPng(opts: SlipImage): Promise<Blob> {
  const spec = GAMES[opts.game];
  const pb = opts.game === "powerball";
  const extraShort = pb ? "PB" : "MB";
  const seed = opts.tickets.map((t) => t.id).join("") || opts.game;
  const serial = `JD-SAMPLE-${seed.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const total = spec.ticketCost * opts.tickets.length;
  const draw = opts.drawLabel ? `DRAW ${opts.drawLabel}` : "NEXT DRAW";

  const w = 720;
  const pad = 28;
  const rowH = 44;
  const headerH = 64;
  const priceH = 36;
  const barH = 76;
  const creditH = 56;
  const footH = 96;
  const h =
    pad +
    headerH +
    18 +
    opts.tickets.length * rowH +
    priceH +
    barH +
    footH +
    creditH +
    pad;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not available"));

  roundRect(ctx, 0, 0, w, h, 10);
  ctx.clip();

  const paper = ctx.createLinearGradient(0, 0, 0, h);
  paper.addColorStop(0, PAPER);
  paper.addColorStop(1, PAPER_2);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(40, 24, 16, 0.035)";
  for (let yScan = 0; yScan < h; yScan += 6) {
    ctx.fillRect(0, yScan + 4, w, 2);
  }

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = INK;
  ctx.font = `800 54px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2 - 20);
  ctx.rotate(-0.28);
  ctx.fillText("jackpotdesk.com", 0, 0);
  ctx.restore();

  ctx.strokeStyle = "#cbbfb4";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, w - 2, h - 2, 9);
  ctx.stroke();

  let y = pad;
  if (pb) {
    ctx.fillStyle = PB;
    ctx.font = `800 34px ${FONT}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("P", pad, y + 34);
    const afterP = pad + ctx.measureText("P").width + 6;
    ctx.beginPath();
    ctx.arc(afterP + 12, y + 22, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(afterP + 7, y + 17, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PB;
    ctx.fillText("WERBALL", afterP + 28, y + 34);
  } else {
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = PB;
    ctx.fillText("★★★", pad, y + 20);
    ctx.fillStyle = MM_GOLD;
    ctx.font = `800 32px ${FONT}`;
    ctx.fillText("MEGA", pad, y + 48);
    const megaW = ctx.measureText("MEGA").width;
    ctx.fillStyle = MM_NAVY;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText("MILLIONS", pad + megaW + 12, y + 46);
  }

  ctx.fillStyle = INK;
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(draw, w - pad, y + (pb ? 32 : 28));
  ctx.textAlign = "left";

  y += headerH;
  ctx.strokeStyle = pb ? PB : MM_GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();

  y += 28;
  opts.tickets.forEach((ticket, i) => {
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = "#666666";
    ctx.fillText(playCode(i), pad, y + 24);

    ctx.fillStyle = INK;
    const whites = ticket.whites.map(pad2).join("  ");
    ctx.fillText(whites, pad + 36, y + 24);

    ctx.textAlign = "right";
    ctx.fillStyle = pb ? PB : MM_NAVY;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(extraShort, w - pad - 52, y + 22);
    ctx.fillStyle = pb ? PB : MM_EXTRA;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(pad2(ticket.extra), w - pad, y + 24);
    ctx.textAlign = "left";
    y += rowH;
  });

  y += 8;
  ctx.fillStyle = INK;
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText(`$${total.toFixed(2)}`, pad, y + 20);
  const priceW = ctx.measureText(`$${total.toFixed(2)} `).width;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad + priceW, y + 2, 36, 22);
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText("EP", pad + priceW + 8, y + 18);
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(
    pb ? "POWER PLAY: NO" : "MEGAPLIER: NO",
    pad + priceW + 48,
    y + 18,
  );

  y += priceH;
  const bars = barcodeWidths(seed);
  const barTop = y;
  let x = pad;
  ctx.fillStyle = INK;
  for (const bw of bars) {
    const px = Math.max(2, bw * 2);
    ctx.fillRect(x, barTop, px, barH - 12);
    x += px + 2;
    if (x > w - pad) break;
  }
  ctx.fillStyle = pb ? PB : MM_NAVY;
  ctx.font = `800 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("SAMPLE", w / 2, barTop + barH / 2 + 2);
  ctx.textAlign = "left";

  y += barH;
  ctx.fillStyle = INK;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText(serial, pad, y);
  y += 22;
  ctx.fillStyle = MUTED;
  ctx.font = `700 13px ${FONT}`;
  wrapText(
    ctx,
    "JackpotDesk sample · not a valid lottery ticket · buy at a licensed retailer",
    pad,
    y,
    w - pad * 2,
    18,
  );

  ctx.fillStyle = pb ? PB : MM_NAVY;
  ctx.fillRect(0, h - creditH, w, creditH);
  ctx.fillStyle = PAPER;
  ctx.font = `800 22px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("jackpotdesk.com", w / 2, h - creditH / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode PNG"));
    }, "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
