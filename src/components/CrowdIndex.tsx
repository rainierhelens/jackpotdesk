import { crowdReading, popularityModel } from "../lib/popularity";
import type { GameId, Ticket } from "../types";

type Props = {
  game: GameId;
  tickets: Ticket[];
};

function tone(index: number): string {
  if (index <= 0.9) return "is-green";
  if (index >= 1.1) return "is-red";
  return "is-flat";
}

/** Per-board expected co-winner index from the fitted popularity model. */
export function CrowdIndex({ game, tickets }: Props) {
  const model = popularityModel(game);
  if (!model || tickets.length === 0) return null;

  const rows = tickets.map((t, i) => ({
    ticket: t,
    label: `B${i + 1}`,
    reading: crowdReading(game, t.whites, t.extra),
  }));

  return (
    <section className="crowd-panel" aria-label="Co-winner index">
      <div className="crowd-topbar">
        <h3>Co-winner index</h3>
        <span className="crowd-mode">
          CA WINNER COUNTS · {model.draws} DRAWS
        </span>
      </div>
      <div className="crowd-rows">
        {rows.map(({ ticket, label, reading }) =>
          reading ? (
            <div className="crowd-row" key={ticket.id}>
              <span className="crowd-board">{label}</span>
              <span className="crowd-nums">
                {ticket.whites.map((n) => String(n).padStart(2, "0")).join(" ")}
                <b> {String(ticket.extra).padStart(2, "0")}</b>
              </span>
              <span className={`crowd-chip ${tone(reading.index)}`}>
                {reading.index.toFixed(2)}×
              </span>
              <span className="crowd-beats">
                <span
                  className="crowd-beats-bar"
                  style={{ width: `${reading.beats}%` }}
                />
                <span className="crowd-beats-text">
                  less crowded than {reading.beats}% of boards
                </span>
              </span>
            </div>
          ) : null,
        )}
      </div>
      <p className="fine crowd-note">
        1.00× = the average random board’s expected co-winners if it hits.
        Lower is lonelier. Fit from {model.draws} draws of California prize
        counts ({model.from} → {model.to}); refreshes daily. Hit odds are
        identical for every board.
      </p>
    </section>
  );
}
