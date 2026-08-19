import { pad2 } from "./picks";
import {
  heatFill,
  heatRamp,
  heatScale,
  type HeatBook,
  type HeatCell,
  type HeatColorMode,
} from "./lotteryHeat";

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

const COLS = 10;
const CELL = 26;
const GAP = 2;
const PAD = 28;
const GUTTER = 22;
const HEAD = 52;
const CBAR = 36;

function matrixSize(count: number) {
  const rows = Math.ceil(count / COLS);
  return {
    rows,
    width: GUTTER + COLS * CELL + (COLS - 1) * GAP,
    height: 16 + rows * CELL + (rows - 1) * GAP,
  };
}

function drawColorBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  min: number,
  max: number,
  mode: HeatColorMode,
) {
  const mid = (min + max) / 2;
  const fmt = (n: number) =>
    mode === "deviation" ? n.toFixed(1) : String(Math.round(n));
  const barH = 8;
  const grad = ctx.createLinearGradient(x, 0, x + width, 0);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    grad.addColorStop(t, heatRamp(t));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, barH);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 10px ui-monospace, monospace";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(fmt(min), x, y + barH + 6);
  ctx.textAlign = "center";
  ctx.fillText(fmt(mid), x + width / 2, y + barH + 6);
  ctx.textAlign = "right";
  ctx.fillText(
    `${fmt(max)}  ${mode === "frequency" ? "count" : "vs chance"}`,
    x + width,
    y + barH + 6,
  );
}

function drawMatrix(
  ctx: CanvasRenderingContext2D,
  cells: HeatCell[],
  mode: HeatColorMode,
  originX: number,
  originY: number,
) {
  const scale = heatScale(cells, mode);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 9px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < COLS; i++) {
    const x = originX + GUTTER + i * (CELL + GAP) + CELL / 2;
    ctx.fillText(String(i + 1), x, originY + 8);
  }
  cells.forEach((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = originX + GUTTER + col * (CELL + GAP);
    const y = originY + 16 + row * (CELL + GAP);
    if (col === 0) {
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(item.n), originX + GUTTER - 6, y + CELL / 2);
    }
    ctx.fillStyle = heatFill(item, mode, scale.min, scale.max);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, CELL, CELL, 1);
    } else {
      ctx.rect(x, y, CELL, CELL);
    }
    ctx.fill();
    ctx.fillStyle = "#fafafa";
    ctx.font = "700 10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(pad2(item.n), x + CELL / 2, y + CELL / 2);
  });
  return scale;
}

export async function saveHeatGridPng(
  book: HeatBook,
  mode: HeatColorMode,
  title: string,
): Promise<void> {
  const white = matrixSize(book.whites.length);
  const extra =
    book.extras.length > 0 ? matrixSize(book.extras.length) : null;
  const width = PAD * 2 + Math.max(white.width, extra?.width ?? 0);
  const height =
    PAD * 2 +
    HEAD +
    white.height +
    CBAR +
    (extra ? 22 + extra.height : 0);
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the heat grid");
  ctx.scale(2, 2);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fafafa";
  ctx.font = "700 13px Inter, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, PAD, PAD + 12);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 10px Inter, Segoe UI, sans-serif";
  ctx.fillText(
    `n = ${book.draws} · ${book.since} to ${book.asOf} · Entertainment`,
    PAD,
    PAD + 28,
  );

  const whiteScale = drawMatrix(ctx, book.whites, mode, PAD, PAD + HEAD);
  drawColorBar(
    ctx,
    PAD + GUTTER,
    PAD + HEAD + white.height + 10,
    white.width - GUTTER,
    whiteScale.min,
    whiteScale.max,
    mode,
  );

  if (extra && book.extras.length > 0) {
    const top = PAD + HEAD + white.height + CBAR + 8;
    ctx.textAlign = "left";
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 10px Inter, Segoe UI, sans-serif";
    ctx.fillText(book.extraLabel, PAD, top);
    drawMatrix(ctx, book.extras, mode, PAD, top + 6);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (next) resolve(next);
      else reject(new Error("Could not encode PNG"));
    }, "image/png");
  });
  downloadBlob(blob, `jackpotdesk-heat-${book.asOf}.png`);
}
