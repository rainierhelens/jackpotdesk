import { pad2 } from "../lib/picks";
import type { HeatDrawRow, HeatSpec } from "../lib/lotteryHeat";

type Props = {
  spec: HeatSpec;
  rows: HeatDrawRow[];
  onToggleWhite: (n: number) => void;
};

export function HeatDrawMap({ spec, rows, onToggleWhite }: Props) {
  const nums = Array.from({ length: spec.whiteMax }, (_, i) => i + 1);
  const first = rows[rows.length - 1]?.date;
  const last = rows[0]?.date;

  return (
    <figure className="heat-poster is-wide">
      <figcaption className="heat-poster-head">
        <strong>Draw raster</strong>
        <span>
          {rows.length} recent draws
          {first && last ? ` · ${first} to ${last}` : ""}
        </span>
      </figcaption>
      <p className="fine heat-poster-lede">
        Each row is one official draw. A lit cell means that number came up.
        Not a forecast.
      </p>
      <div className="heat-drawmap" role="table" aria-label="Draw map">
        <div className="heat-drawmap-head">
          <span className="heat-drawmap-date">Date</span>
          <span
            className="heat-drawmap-cells"
            style={{ gridTemplateColumns: `repeat(${spec.whiteMax}, minmax(7px, 1fr))` }}
          >
            {nums.map((n) => (
              <span key={n}>{n % 10 === 0 || n === 1 ? n : ""}</span>
            ))}
          </span>
          {spec.extraMax > 0 ? (
            <span className="heat-drawmap-extra">{spec.extraLabel}</span>
          ) : null}
        </div>
        {rows.map((row) => {
          const hit = new Set(row.whites);
          return (
            <div key={row.date} className="heat-drawmap-row">
              <span className="heat-drawmap-date">{row.date}</span>
              <span
                className="heat-drawmap-cells"
                style={{ gridTemplateColumns: `repeat(${spec.whiteMax}, minmax(7px, 1fr))` }}
              >
                {nums.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`heat-draw-cell${hit.has(n) ? " is-on" : ""}`}
                    aria-label={`${row.date} ${pad2(n)}${hit.has(n) ? " drawn" : ""}`}
                    onClick={() => onToggleWhite(n)}
                  />
                ))}
              </span>
              {spec.extraMax > 0 ? (
                <span className="heat-drawmap-extra">
                  {row.extra != null ? pad2(row.extra) : "··"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="heat-cbar is-binary" aria-hidden="true">
        <span className="heat-legend-chip is-off">Off</span>
        <span className="heat-legend-chip is-on">Drawn</span>
      </div>
    </figure>
  );
}
