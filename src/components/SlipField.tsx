import { useEffect, useMemo, useRef } from "react";
import { numberField } from "../lib/frequency";
import { pad2 } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import type { GameId } from "../types";
import type { OfficialDraw } from "../lib/winners";

type Props = {
  game: GameId;
  draws: OfficialDraw[];
};

type Rgba = [number, number, number, number];

const COLS = 10;

function colOf(n: number): number {
  return (n - 1) % COLS;
}

function rowOf(n: number): number {
  return Math.floor((n - 1) / COLS);
}

function gapColor(days: number, kind: "hot" | "cold" | "overdue" | "plain"): Rgba {
  if (kind === "overdue") return [109, 40, 217, 0.2];
  if (kind === "hot") return [194, 65, 12, 0.18];
  if (kind === "cold") return [29, 78, 216, 0.16];
  if (days < 7) return [194, 65, 12, 0.11];
  if (days < 30) return [241, 253, 14, 0.07];
  if (days < 90) return [63, 63, 70, 0.1];
  if (days < 180) return [29, 78, 216, 0.1];
  return [30, 41, 94, 0.12];
}

function fillRgba(
  ctx: CanvasRenderingContext2D,
  color: Rgba,
  alpha = color[3],
) {
  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

export function SlipField({ game, draws }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spec = GAMES[game];
  const field = useMemo(
    () => numberField(draws, spec.whiteMax),
    [draws, spec.whiteMax],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const surface: HTMLCanvasElement = canvas;
    const gfx: CanvasRenderingContext2D = ctx;

    const cellByN = new Map((field?.cells ?? []).map((c) => [c.n, c]));
    const hot = new Set(field?.hot ?? []);
    const cold = new Set(field?.cold ?? []);
    const overdueN = field?.overdue?.n ?? null;
    let cancelled = false;

    function paint() {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      surface.width = Math.floor(width * dpr);
      surface.height = Math.floor(height * dpr);
      surface.style.width = `${width}px`;
      surface.style.height = `${height}px`;
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gfx.clearRect(0, 0, width, height);

      const gridW = Math.min(560, width * 0.78);
      const gap = width < 720 ? 3 : 5;
      const cell = (gridW - gap * (COLS - 1)) / COLS;
      const ox = (width - gridW) / 2;
      const oy = Math.max(88, height * 0.16);
      const r = Math.min(8, cell * 0.22);

      gfx.font = `700 ${Math.max(9, cell * 0.36)}px "Geist Mono", ui-monospace, monospace`;
      gfx.textAlign = "center";
      gfx.textBaseline = "middle";

      for (let n = 1; n <= spec.whiteMax; n++) {
        const col = colOf(n);
        const row = rowOf(n);
        const x = ox + col * (cell + gap);
        const y = oy + row * (cell + gap);
        const data = cellByN.get(n);
        const kind = n === overdueN
          ? "overdue"
          : hot.has(n)
            ? "hot"
            : cold.has(n)
              ? "cold"
              : "plain";
        const color = gapColor(data?.days ?? 40, kind);
        gfx.beginPath();
        if (typeof gfx.roundRect === "function") {
          gfx.roundRect(x, y, cell, cell, r);
        } else {
          gfx.rect(x, y, cell, cell);
        }
        fillRgba(gfx, color);
        gfx.fill();
        fillRgba(gfx, [250, 250, 250, 0.14], kind === "plain" ? 0.1 : 0.2);
        gfx.fillText(pad2(n), x + cell / 2, y + cell / 2 + 0.5);
      }
    }

    paint();
    void document.fonts?.ready?.then(paint);
    window.addEventListener("resize", paint);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", paint);
    };
  }, [field, spec.whiteMax]);

  return (
    <div className="slip-field" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
