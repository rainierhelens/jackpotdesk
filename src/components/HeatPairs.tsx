import { useState } from "react";
import { pad2 } from "../lib/picks";
import { heatFill, type HeatPairCell, type HeatSpec } from "../lib/lotteryHeat";

type Props = {
  spec: HeatSpec;
  expected: number;
  cells: HeatPairCell[];
  onPickPair: (a: number, b: number) => void;
};

export function HeatPairs({ spec, expected, cells, onPickPair }: Props) {
  const [tip, setTip] = useState<HeatPairCell | null>(null);
  const byKey = new Map(cells.map((cell) => [`${cell.a}-${cell.b}`, cell]));
  const max = Math.max(1, ...cells.map((cell) => cell.count));

  return (
    <figure className="heat-poster is-wide">
      <figcaption className="heat-poster-head">
        <strong>White-ball pairs</strong>
        <span>Upper triangle · expected {expected.toFixed(2)} if uniform</span>
      </figcaption>
      <p className="fine heat-poster-lede">
        How often two whites were drawn together in this window. Entertainment.
        Not a forecast.
      </p>
      <div
        className="heat-pairs"
        style={{ gridTemplateColumns: `repeat(${spec.whiteMax}, minmax(7px, 1fr))` }}
        role="img"
        aria-label="Pair co-occurrence matrix"
      >
        {Array.from({ length: spec.whiteMax }, (_, row) =>
          Array.from({ length: spec.whiteMax }, (_, col) => {
            const a = row + 1;
            const b = col + 1;
            if (b <= a) {
              return (
                <span
                  key={`${a}-${b}`}
                  className="heat-pair is-blank"
                  aria-hidden="true"
                />
              );
            }
            const cell = byKey.get(`${a}-${b}`) ?? {
              a,
              b,
              count: 0,
              expected,
            };
            const dummy = {
              n: b,
              count: cell.count,
              share: 0,
              lastDrawn: null,
              gapDays: 0,
              expected,
              deviation: cell.count - expected,
            };
            return (
              <button
                key={`${a}-${b}`}
                type="button"
                className="heat-pair"
                style={{
                  background: heatFill(dummy, "frequency", 0, max),
                }}
                aria-label={`${pad2(a)} and ${pad2(b)}, ${cell.count} times`}
                onMouseEnter={() => setTip(cell)}
                onFocus={() => setTip(cell)}
                onClick={() => onPickPair(a, b)}
              />
            );
          }),
        )}
      </div>
      <div className="heat-cbar" aria-hidden="true">
        <div className="heat-cbar-scale">
          <span className="heat-swatch" />
          <div className="heat-cbar-ticks">
            <span>0</span>
            <span>{Math.round(max / 2)}</span>
            <span>{max}</span>
          </div>
        </div>
        <em>pair count</em>
      </div>
      {tip ? (
        <dl className="heat-readout" role="status">
          <div>
            <dt>Pair</dt>
            <dd>
              {pad2(tip.a)} + {pad2(tip.b)}
            </dd>
          </div>
          <div>
            <dt>Count</dt>
            <dd>{tip.count}</dd>
          </div>
          <div>
            <dt>Field</dt>
            <dd>
              {tip.count - tip.expected >= 0 ? "+" : ""}
              {(tip.count - tip.expected).toFixed(2)} vs {tip.expected.toFixed(2)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="heat-tip" role="status">
          Hover a cell. Click to add both numbers to the slip.
        </p>
      )}
    </figure>
  );
}
