import {
  crowdReading,
  popularityModel,
  waCrowdReading,
  waPopularityModel,
  type CrowdReading,
} from "../lib/popularity";
import type { WaGameSpec } from "../lib/waGames";
import type { WaPlay } from "../lib/waPicks";
import type { GameId, Ticket } from "../types";

function tone(index: number): string {
  if (index <= 0.9) return "is-green";
  if (index >= 1.1) return "is-red";
  return "is-flat";
}

type Row = {
  id: string;
  label: string;
  nums: string;
  extra: string | null;
  reading: CrowdReading | null;
};

function CrowdPanel({
  rows,
  mode,
  note,
}: {
  rows: Row[];
  mode: string;
  note: string;
}) {
  const shown = rows.filter((r) => r.reading);
  if (shown.length === 0) return null;
  return (
    <section className="crowd-panel" aria-label="Co-winner index">
      <div className="crowd-topbar">
        <h3>Co-winner index</h3>
        <span className="crowd-mode">{mode}</span>
      </div>
      <div className="crowd-rows">
        {shown.map(({ id, label, nums, extra, reading }) => (
          <div className="crowd-row" key={id}>
            <span className="crowd-board">{label}</span>
            <span className="crowd-nums">
              {nums}
              {extra ? <b> {extra}</b> : null}
            </span>
            <span className={`crowd-chip ${tone(reading!.index)}`}>
              {reading!.index.toFixed(2)}×
            </span>
            <span className="crowd-beats">
              <span
                className="crowd-beats-bar"
                style={{ width: `${reading!.beats}%` }}
              />
              <span className="crowd-beats-text">
                less crowded than {reading!.beats}% of boards
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="fine crowd-note">{note}</p>
    </section>
  );
}

/** National slips: per-board expected co-winner index from the fitted model. */
export function CrowdIndex({
  game,
  tickets,
}: {
  game: GameId;
  tickets: Ticket[];
}) {
  const model = popularityModel(game);
  if (!model || tickets.length === 0) return null;
  const rows: Row[] = tickets.map((t, i) => ({
    id: t.id,
    label: `B${i + 1}`,
    nums: t.whites.map((n) => String(n).padStart(2, "0")).join(" "),
    extra: String(t.extra).padStart(2, "0"),
    reading: crowdReading(game, t.whites, t.extra),
  }));
  return (
    <CrowdPanel
      rows={rows}
      mode={`CA WINNER COUNTS · ${model.draws} DRAWS`}
      note={`1.00× = the average random board’s expected co-winners if it hits. Lower is lonelier. Fit from ${model.draws} draws of California prize counts (${model.from} → ${model.to}); refreshes daily. Hit odds are identical for every board.`}
    />
  );
}

/** Washington slips (Hit 5, Lotto, Match 4, Cash Pop). */
export function WaCrowdIndex({
  spec,
  tickets,
}: {
  spec: WaGameSpec;
  tickets: WaPlay[];
}) {
  const model = waPopularityModel(spec.id);
  if (!model || tickets.length === 0) return null;
  const rows: Row[] = tickets.map((t, i) => ({
    id: t.id,
    label: spec.kind === "cashpop" ? `POP ${i + 1}` : `B${i + 1}`,
    nums: t.numbers.map((n) => String(n).padStart(2, "0")).join(" "),
    extra: null,
    reading: waCrowdReading(spec.id, t.numbers),
  }));
  const noun = spec.kind === "cashpop" ? "POP picks" : "boards";
  return (
    <CrowdPanel
      rows={rows}
      mode={`WA WINNER COUNTS · ${model.draws} DRAWS`}
      note={`1.00× = the average random ${noun.replace(/s$/, "")}’s expected co-winners if it hits. Lower is lonelier. Fit from ${model.draws} ${spec.label} drawings (${model.from} → ${model.to}) of Washington winner counts; refreshes daily. Hit odds are identical for every ${noun.replace(/s$/, "")}.`}
    />
  );
}
