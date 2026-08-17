import { US_TILES } from "../lib/usTiles";
import {
  heatFill,
  heatValue,
  scaleT,
  type HeatMetric,
  type StateHeat,
} from "../lib/jackpotMap";

const CELL = 34;
const GAP = 4;
const SIZE = CELL - GAP;

type Props = {
  heat: Map<string, StateHeat>;
  metric: HeatMetric;
  selected: string | null;
  onSelect: (state: string | null) => void;
};

export function UsaCartogram({ heat, metric, selected, onSelect }: Props) {
  const max = Math.max(
    0,
    ...US_TILES.map((tile) => heatValue(heat.get(tile.id), metric)),
  );
  const width = 12 * CELL;
  const height = 8 * CELL;

  return (
    <svg
      className="cartogram"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="United States jackpot heat map by state"
    >
      {US_TILES.map((tile) => {
        const row = heat.get(tile.id);
        const value = heatValue(row, metric);
        const t = scaleT(value, max, metric);
        const x = tile.col * CELL + GAP / 2;
        const y = tile.row * CELL + GAP / 2;
        const on = selected === tile.id;
        const label =
          value <= 0
            ? `${tile.name}: none in this window`
            : metric === "tickets"
              ? `${tile.name}: ${value} jackpot ticket${value === 1 ? "" : "s"}`
              : `${tile.name}: advertised share`;
        return (
          <g key={tile.id}>
            <title>{label}</title>
            <rect
              x={x}
              y={y}
              width={SIZE}
              height={SIZE}
              rx="6"
              fill={heatFill(t)}
              stroke={on ? "#fafafa" : value > 0 ? "#ffffff24" : "#ffffff10"}
              strokeWidth={on ? 2 : 1}
              className="cartogram-cell"
              tabIndex={0}
              role="button"
              aria-pressed={on}
              aria-label={label}
              onClick={() => onSelect(on ? null : tile.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(on ? null : tile.id);
                }
              }}
            />
            <text
              x={x + SIZE / 2}
              y={y + SIZE / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="cartogram-abbr"
              fill={t > 0.35 ? "#052e16" : "#a1a1aa"}
              pointerEvents="none"
            >
              {tile.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
