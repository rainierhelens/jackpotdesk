import { pad2 } from "../lib/picks";
import {
  heatFill,
  heatInk,
  heatNorm,
  heatScale,
  type HeatBook,
  type HeatCell,
  type HeatColorMode,
} from "../lib/lotteryHeat";

type Props = {
  book: HeatBook;
  mode: HeatColorMode;
  selectedWhites: number[];
  selectedExtra: number | null;
  active: HeatCell | null;
  activeIsExtra?: boolean;
  onActive: (cell: HeatCell | null, kind: "white" | "extra") => void;
  onToggleWhite: (n: number) => void;
  onToggleExtra: (n: number) => void;
};

const COLS = 10;

function gapMark(days: number): string {
  if (days <= 0) return "last";
  return `${days}d`;
}

function Cell({
  cell,
  fill,
  t,
  selected,
  marked,
  dimmed,
  kind,
  extraLabel,
  onActive,
  onToggle,
}: {
  cell: HeatCell;
  fill: string;
  t: number;
  selected: boolean;
  marked: boolean;
  dimmed: boolean;
  kind: "white" | "extra";
  extraLabel: string;
  onActive: (cell: HeatCell | null, kind: "white" | "extra") => void;
  onToggle: () => void;
}) {
  const label =
    kind === "extra"
      ? `${extraLabel} ${pad2(cell.n)}`
      : `Number ${pad2(cell.n)}`;
  const showMark = selected || marked;
  return (
    <button
      type="button"
      className={`heat-cell${selected ? " is-on" : ""}${marked ? " is-marked" : ""}${dimmed ? " is-dim" : ""}${kind === "extra" ? " is-extra" : ""}`}
      style={{
        background: fill,
        color: heatInk(fill),
        ["--heat" as string]: t.toFixed(3),
      }}
      aria-pressed={selected}
      title={
        dimmed
          ? `${label}. Replaces the last number on the slip.`
          : selected
            ? `${label}. On the slip. Click to drop.`
            : undefined
      }
      aria-label={`${label}. ${cell.count} draws. ${gapMark(cell.gapDays)} gap.`}
      onMouseEnter={() => onActive(cell, kind)}
      onFocus={() => onActive(cell, kind)}
      onMouseLeave={() => onActive(null, kind)}
      onClick={onToggle}
    >
      {pad2(cell.n)}
      {showMark ? <span className="heat-cell-mark">{gapMark(cell.gapDays)}</span> : null}
    </button>
  );
}

function Matrix({
  cells,
  mode,
  min,
  max,
  selected,
  marked,
  dimUnused,
  kind,
  extraLabel,
  onActive,
  onToggle,
}: {
  cells: HeatCell[];
  mode: HeatColorMode;
  min: number;
  max: number;
  selected: (n: number) => boolean;
  marked: (n: number) => boolean;
  dimUnused: boolean;
  kind: "white" | "extra";
  extraLabel: string;
  onActive: (cell: HeatCell | null, kind: "white" | "extra") => void;
  onToggle: (n: number) => void;
}) {
  const rows = Math.ceil(cells.length / COLS);
  return (
    <div className="heat-matrix">
      <div className="heat-matrix-row is-axis" aria-hidden="true">
        <span className="heat-y-tick" />
        <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: COLS }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, r) => {
        const slice = cells.slice(r * COLS, r * COLS + COLS);
        return (
          <div key={r} className="heat-matrix-row">
            <span className="heat-y-tick">{r * COLS + 1}</span>
            <div
              className="heat-grid"
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {slice.map((cell) => (
                <Cell
                  key={`${kind}-${cell.n}`}
                  cell={cell}
                  fill={heatFill(cell, mode, min, max)}
                  t={heatNorm(cell, mode, min, max)}
                  selected={selected(cell.n)}
                  marked={marked(cell.n)}
                  dimmed={dimUnused && !selected(cell.n)}
                  kind={kind}
                  extraLabel={extraLabel}
                  onActive={onActive}
                  onToggle={() => onToggle(cell.n)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ColorBar({
  mode,
  min,
  max,
}: {
  mode: HeatColorMode;
  min: number;
  max: number;
}) {
  const mid = (min + max) / 2;
  const fmt = (n: number) =>
    mode === "deviation" ? n.toFixed(1) : String(Math.round(n));
  return (
    <div className="heat-cbar" aria-hidden="true">
      <div className="heat-cbar-scale">
        <span className="heat-swatch" />
        <div className="heat-cbar-ticks">
          <span>{fmt(min)}</span>
          <span>{fmt(mid)}</span>
          <span>{fmt(max)}</span>
        </div>
      </div>
      <em>{mode === "frequency" ? "count" : "vs chance"}</em>
    </div>
  );
}

export function HeatGrid({
  book,
  mode,
  selectedWhites,
  selectedExtra,
  active,
  activeIsExtra = false,
  onActive,
  onToggleWhite,
  onToggleExtra,
}: Props) {
  const whiteScale = heatScale(book.whites, mode);
  const extraScale = heatScale(book.extras, mode);
  const picked = new Set(selectedWhites);
  const whiteFull = selectedWhites.length >= book.pick;

  return (
    <figure className="heat-poster">
      <figcaption className="heat-poster-head">
        <strong>
          {mode === "frequency" ? "White-ball frequency" : "White-ball vs chance"}
        </strong>
        <span>
          n = {book.draws.toLocaleString("en-US")}
          {" · "}
          {book.since} to {book.asOf}
        </span>
      </figcaption>
      <Matrix
        cells={book.whites}
        mode={mode}
        min={whiteScale.min}
        max={whiteScale.max}
        selected={(n) => picked.has(n)}
        marked={(n) => Boolean(active) && !activeIsExtra && active?.n === n}
        dimUnused={whiteFull}
        kind="white"
        extraLabel={book.extraLabel}
        onActive={onActive}
        onToggle={onToggleWhite}
      />
      <ColorBar mode={mode} min={whiteScale.min} max={whiteScale.max} />
      {book.extras.length > 0 ? (
        <>
          <p className="heat-row-label">{book.extraLabel}</p>
          <Matrix
            cells={book.extras}
            mode={mode}
            min={extraScale.min}
            max={extraScale.max}
            selected={(n) => selectedExtra === n}
            marked={(n) => Boolean(active) && activeIsExtra && active?.n === n}
            dimUnused={false}
            kind="extra"
            extraLabel={book.extraLabel}
            onActive={onActive}
            onToggle={onToggleExtra}
          />
        </>
      ) : null}
      <HeatTip
        book={book}
        cell={active}
        extra={activeIsExtra}
        whiteFull={whiteFull}
      />
    </figure>
  );
}

function HeatTip({
  book,
  cell,
  extra,
  whiteFull,
}: {
  book: HeatBook;
  cell: HeatCell | null;
  extra: boolean;
  whiteFull: boolean;
}) {
  if (!cell) {
    return (
      <p className="heat-tip" role="status">
        {whiteFull
          ? "Board is full. A new pick replaces the last number. Tap a ball on the slip to drop it."
          : "Hover a cell. Count, share of draws, last drawn, gap, and deviation from a uniform field."}
      </p>
    );
  }
  const pct = cell.share * 100;
  const pctText =
    pct === 0 ? "0%" : pct < 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
  const gap =
    cell.gapDays <= 0
      ? "last draw"
      : `${cell.gapDays} day${cell.gapDays === 1 ? "" : "s"}`;
  const vs =
    cell.deviation === 0
      ? "at chance"
      : `${cell.deviation > 0 ? "+" : ""}${cell.deviation.toFixed(1)} vs chance`;
  return (
    <dl className="heat-readout" role="status">
      <div>
        <dt>Number</dt>
        <dd>{pad2(cell.n)}</dd>
      </div>
      <div>
        <dt>Count</dt>
        <dd>
          {cell.count}
          <em> / {extra ? book.extraDraws : book.draws}</em>
        </dd>
      </div>
      <div>
        <dt>Share</dt>
        <dd>{pctText}</dd>
      </div>
      <div>
        <dt>Last</dt>
        <dd>{cell.lastDrawn ?? "none"}</dd>
      </div>
      <div>
        <dt>Gap</dt>
        <dd>{gap}</dd>
      </div>
      <div>
        <dt>Field</dt>
        <dd>{vs}</dd>
      </div>
    </dl>
  );
}
