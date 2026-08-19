import { useEffect, useRef, useState } from "react";
import type { PoolReport, PoolStage } from "../lib/comboPool";
import { useTickFlash } from "../lib/flash";
import { usePrefersReducedMotion } from "../lib/motion";

export type PoolFadeTone = "last" | "hot" | "cold" | "overdue" | "crowd";

export type PoolFade = {
  key: string;
  label: string;
  tone: PoolFadeTone;
  numbers: number[];
};

type Props = {
  min: number;
  max: number;
  report: PoolReport;
  fades: PoolFade[];
  noun: string;
  oddsText: string | null;
  note?: string | null;
  /** Popularity weight per number (index 0 = number `min`); 1 = random rate. */
  heat?: number[] | null;
  /** Where the heat weights come from, e.g. "California winner counts". */
  heatSource?: string;
  /** Whites currently on the slip. Only used when `onToggleWhite` is set. */
  selected?: number[];
  /** When set, chips add or remove a white on the shared slip. */
  onToggleWhite?: (n: number) => void;
  extraMax?: number;
  extraLabel?: string;
  selectedExtra?: number | null;
  onToggleExtra?: (n: number) => void;
  /** Popularity weight per extra (index 0 = 1). */
  extraHeat?: number[] | null;
};

/** Warm removal ramp: cuts read warm, the surviving pool reads green. */
const STAGE_HUES = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#fb7185",
  "#c084fc",
  "#f472b6",
  "#38bdf8",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  return fmt(n);
}

function pctLabel(share: number): string {
  const pct = share * 100;
  if (pct === 0) return "0%";
  if (pct < 0.01) return "<0.01%";
  if (pct < 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

/** Tween a stat toward its target so toggles read like a live tick. */
function useAnimatedNumber(target: number, animate: boolean): number {
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    if (!animate) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    const duration = 520;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = Math.round(from + (target - from) * eased);
      shown.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);

  return value;
}

function stageHue(index: number): string {
  return STAGE_HUES[index % STAGE_HUES.length];
}

/** Underline tint for pick-rate heat: red = over-picked, green = ignored. */
function heatColor(weight: number): string {
  const t = Math.max(-1, Math.min(1, (weight - 1) / 0.18));
  const alpha = Math.min(0.95, Math.abs(t)) * 0.9;
  return t >= 0
    ? `rgba(239, 68, 68, ${alpha.toFixed(2)})`
    : `rgba(34, 197, 94, ${alpha.toFixed(2)})`;
}

function heatTitle(weight: number): string {
  const pct = Math.round(Math.abs(weight - 1) * 100);
  if (pct < 2) return "picked about at the random rate";
  return weight > 1
    ? `picked ~${pct}% more than random`
    : `picked ~${pct}% less than random`;
}

function FlowBar({ report }: { report: PoolReport }) {
  const segments: { key: string; width: number; hue: string; title: string }[] =
    [];
  for (let i = 0; i < report.stages.length; i++) {
    const stage = report.stages[i];
    segments.push({
      key: stage.key,
      width: Math.max(stage.share * 100, 0.45),
      hue: stageHue(i),
      title: `${stage.label}: ${fmt(stage.removed)} (${pctLabel(stage.share)})`,
    });
  }
  return (
    <div
      className="pool-flow"
      role="img"
      aria-label={`${pctLabel(report.keptShare)} of the pool survives the fades`}
    >
      {segments.map((seg) => (
        <span
          key={seg.key}
          className="pool-flow-cut"
          style={{ width: `${seg.width}%`, background: seg.hue }}
          title={seg.title}
        />
      ))}
      <span
        className="pool-flow-keep"
        title={`Your pool: ${fmt(report.survivors)} (${pctLabel(report.keptShare)})`}
      />
    </div>
  );
}

function StageLadder({
  stages,
  approx,
}: {
  stages: PoolStage[];
  approx: string;
}) {
  const maxRemoved = Math.max(...stages.map((s) => s.removed), 1);
  return (
    <div className="pool-stages">
      {stages.map((stage, i) => (
        <div className="pool-stage" key={stage.key}>
          <span className="pool-stage-label">
            <i className="pool-dot" style={{ background: stageHue(i) }} />
            {stage.label}
          </span>
          <span className="pool-stage-bar">
            <span
              style={{
                width: `${Math.max((stage.removed / maxRemoved) * 100, 1)}%`,
                background: stageHue(i),
              }}
            />
          </span>
          <span className="pool-stage-num">
            {approx}
            {fmt(stage.removed)}
          </span>
          <span className="pool-stage-pct">{pctLabel(stage.share)}</span>
        </div>
      ))}
      <p
        className="fine pool-stage-note"
        title="Stage bars are scaled against the largest fade so small fades stay visible. The % column is the true share of the whole space."
      >
        Bars are relative. % is the true share.
      </p>
    </div>
  );
}

export function NumberPool({
  min,
  max,
  report,
  fades,
  noun,
  oddsText,
  note,
  heat,
  heatSource,
  selected,
  onToggleWhite,
  extraMax = 0,
  extraLabel = "",
  selectedExtra = null,
  onToggleExtra,
  extraHeat,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const survivors = useAnimatedNumber(report.survivors, !reducedMotion);
  const removed = useAnimatedNumber(
    report.total - report.survivors,
    !reducedMotion,
  );
  const flash = useTickFlash(report.survivors);

  const fadeByNumber = new Map<number, PoolFade>();
  for (const fade of fades) {
    for (const n of fade.numbers) {
      if (!fadeByNumber.has(n)) fadeByNumber.set(n, fade);
    }
  }
  const cells: number[] = [];
  for (let n = min; n <= max; n++) cells.push(n);
  const pad = max > 9;
  const approx = report.exact ? "" : "≈";
  const activeFades = fades.filter((f) => f.numbers.length > 0);
  const fadesOn = report.stages.length;

  return (
    <section className="pool-panel">
      <div className="pool-topbar">
        <h3>Number pool</h3>
        <span className={`pool-mode${report.exact ? " is-exact" : ""}`}>
          {report.exact
            ? "EXACT · FULL COUNT"
            : `ESTIMATE · ${fmtCompact(report.samples)} DRAWS`}
        </span>
      </div>

      <div className="pool-stats">
        <div className={`pool-stat is-keep${flash ? ` flash-${flash}` : ""}`}>
          <span className="pool-stat-label">Pool depth</span>
          <span className="pool-stat-value">
            {approx}
            {fmt(survivors)}
          </span>
          <span className="pool-stat-sub">
            of {fmt(report.total)} {noun}
          </span>
        </div>
        <div className="pool-stat">
          <span className="pool-stat-label">Faded</span>
          <span className="pool-stat-value is-cut">
            {approx}
            {fmt(removed)}
          </span>
          <span className="pool-stat-sub">
            {fadesOn} fade{fadesOn === 1 ? "" : "s"} caught something
          </span>
        </div>
        <div className="pool-stat">
          <span className="pool-stat-label">Kept</span>
          <span
            className={`pool-stat-value ${
              report.keptShare > 0 ? "is-green" : "is-cut"
            }`}
          >
            {pctLabel(report.keptShare)}
          </span>
          <span className="pool-stat-sub">of the whole space</span>
        </div>
        <div className="pool-stat">
          <span className="pool-stat-label">Hit odds</span>
          <span className="pool-stat-value">UNCHANGED</span>
          <span className="pool-stat-sub">
            {oddsText ?? "same as any quick pick"}
          </span>
        </div>
      </div>

      <FlowBar report={report} />

      {report.stages.length > 0 ? (
        <StageLadder stages={report.stages} approx={approx} />
      ) : (
        <p className="fine pool-stage-note">
          No fades are on. The pool is the whole space.
        </p>
      )}

      <div className={`pool-grid${cells.length > 50 ? " dense" : ""}`}>
        {cells.map((n) => {
          const fade = fadeByNumber.get(n);
          const weight = heat?.[n - min];
          const on = selected?.includes(n) ?? false;
          const titleParts = [
            fade ? `Faded: ${fade.label}` : null,
            weight ? heatTitle(weight) : null,
          ].filter(Boolean);
          const className = `pool-cell${fade ? ` is-faded tone-${fade.tone}` : ""}${weight ? " has-heat" : ""}${on ? " is-on" : ""}`;
          const style = weight
            ? ({ "--heat": heatColor(weight) } as React.CSSProperties)
            : undefined;
          const label = pad ? String(n).padStart(2, "0") : String(n);
          if (onToggleWhite) {
            return (
              <button
                key={n}
                type="button"
                className={className}
                style={style}
                title={titleParts.length ? titleParts.join(" · ") : undefined}
                aria-pressed={on}
                aria-label={`Number ${label}${on ? ", on the slip" : ""}`}
                onClick={() => onToggleWhite(n)}
              >
                {label}
              </button>
            );
          }
          return (
            <span
              key={n}
              className={className}
              style={style}
              title={titleParts.length ? titleParts.join(" · ") : undefined}
            >
              {label}
            </span>
          );
        })}
      </div>

      {extraMax > 0 && onToggleExtra ? (
        <>
          <p className="pool-row-label">{extraLabel || "Extra"}</p>
          <div
            className={`pool-grid${extraMax > 50 ? " dense" : ""}`}
          >
            {Array.from({ length: extraMax }, (_, i) => {
              const n = i + 1;
              const weight = extraHeat?.[i];
              const on = selectedExtra === n;
              const title = weight ? heatTitle(weight) : undefined;
              const className = `pool-cell${weight ? " has-heat" : ""}${on ? " is-on" : ""} is-extra`;
              const style = weight
                ? ({ "--heat": heatColor(weight) } as React.CSSProperties)
                : undefined;
              const label = pad ? String(n).padStart(2, "0") : String(n);
              return (
                <button
                  key={`extra-${n}`}
                  type="button"
                  className={className}
                  style={style}
                  title={title}
                  aria-pressed={on}
                  aria-label={`${extraLabel || "Extra"} ${label}${on ? ", on the slip" : ""}`}
                  onClick={() => onToggleExtra(n)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {activeFades.length > 0 ? (
        <p className="pool-legend">
          {activeFades.map((fade) => (
            <span key={fade.key} className={`pool-chip tone-${fade.tone}`}>
              {fade.label} ({fade.numbers.length})
            </span>
          ))}
        </p>
      ) : null}

      <details className="gen-fold is-hint" open>
        <summary>
          <span className="fold-title">About this pool</span>
          <span className="fold-meta">Hit odds unchanged</span>
        </summary>
        <div className="fold-body">
          {heat ? (
            <p className="fine pool-heat-note">
              <span className="pool-heat-swatch is-red" /> over-picked ·{" "}
              <span className="pool-heat-swatch is-green" /> under-picked. Pick
              rates fit from {heatSource ?? "official winner counts"},
              refreshed daily.
            </p>
          ) : null}
          <p className="fine pool-note">
            {report.exact
              ? `Counted across all ${fmt(report.total)} possible ${noun}.`
              : `Estimated from ${fmt(report.samples)} random draws; counts wiggle a little each refresh.`}{" "}
            Every {noun.replace(/s$/, "")} left in the pool has exactly the
            same chance of being drawn. Fading crowds changes who you might
            split with, not whether you hit.
            {note ? ` ${note}` : ""}
          </p>
        </div>
      </details>
    </section>
  );
}
