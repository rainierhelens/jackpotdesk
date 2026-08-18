import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LADDER_DEPTH,
  patternLadder,
  type LadderEntry,
  type PatternModel,
} from "../lib/patternLab";
import type { CrowdReading } from "../lib/popularity";

const PAGE = 5;

function crowdTone(index: number): string {
  if (index <= 0.9) return "is-green";
  if (index >= 1.1) return "is-red";
  return "is-flat";
}

/**
 * The ladder: every scanned board in strict pattern-score order, served
 * one rank at a time as an infinite scroll. Rank is a score of the past,
 * not a probability of the future — the header says so before rank #1.
 */
export function PatternLadder({
  model,
  size,
  source,
  renderTile,
  crowd,
}: {
  model: PatternModel;
  size: number;
  /** e.g. "NY Open Data" or "Washington’s Lottery". */
  source: string;
  renderTile: (entry: LadderEntry) => ReactNode;
  crowd?: (entry: LadderEntry) => CrowdReading | null;
}) {
  const ladder = useMemo(() => patternLadder(model, size), [model, size]);
  const [shown, setShown] = useState(PAGE);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShown(PAGE);
  }, [ladder]);

  // Re-observing after each page keeps the feed flowing when the sentinel
  // is still inside the margin (observers only fire on crossings).
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (hits) => {
        if (hits.some((h) => h.isIntersecting)) {
          setShown((s) => Math.min(ladder.entries.length, s + PAGE));
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ladder.entries.length, shown]);

  const atEnd = shown >= ladder.entries.length;

  return (
    <section className="ladder-feed" aria-label="Pattern ladder">
      <div className="crowd-topbar ladder-topbar">
        <h3>The ladder</h3>
        <span className="crowd-mode">
          TOP {ladder.entries.length} OF{" "}
          {ladder.scanned.toLocaleString("en-US")} SCANNED · 50 PTS = RANDOM
        </span>
      </div>
      <p className="fine ladder-lead">
        Every board below is ranked by pattern score against{" "}
        {model.draws.toLocaleString("en-US")} past drawings ({source}) — number
        frequency, common pairs, recent heat, and winning shapes. Rank #1 is
        the strongest match to the past, <b>not</b> the board most likely to
        be drawn next. No such board exists: every combination keeps identical
        odds. The ladder re-ranks only when new official draws land.
      </p>
      <div className="ladder-rows">
        {ladder.entries.slice(0, shown).map((entry) => {
          const reading = crowd ? crowd(entry) : null;
          return (
            <article className="ladder-row" key={entry.rank}>
              <div className="ladder-tile">
                <span
                  className={`ladder-rank${entry.rank <= 3 ? " is-podium" : ""}`}
                >
                  #{entry.rank}
                </span>
                {renderTile(entry)}
              </div>
              <div className="ladder-data">
                <div className="ladder-chips">
                  <span className="crowd-chip is-gold">{entry.points} PTS</span>
                  {reading ? (
                    <span
                      className={`crowd-chip ${crowdTone(reading.index)}`}
                      title={`Expected co-winner index — less crowded than ${reading.beats}% of boards`}
                    >
                      {reading.index.toFixed(2)}× CROWD
                    </span>
                  ) : null}
                </div>
                <p className="ladder-why">{entry.why}</p>
                <dl className="ladder-parts">
                  <div>
                    <dt>Frequency</dt>
                    <dd>{entry.parts.freq.toFixed(2)}×</dd>
                  </div>
                  <div>
                    <dt>Heat</dt>
                    <dd>{entry.parts.hot.toFixed(2)}×</dd>
                  </div>
                  <div>
                    <dt>Pairs</dt>
                    <dd>{entry.parts.pair.toFixed(2)}×</dd>
                  </div>
                  <div>
                    <dt>Shape</dt>
                    <dd>{entry.parts.shape.toFixed(2)}×</dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
      {atEnd ? (
        <div className="ladder-end">
          <p>
            End of the free ladder — the top {LADDER_DEPTH} of{" "}
            {ladder.scanned.toLocaleString("en-US")} scanned boards. The full
            field is reserved for a future desk tier.
          </p>
          <p className="fine">
            1.00× on every stat is the average random ticket. Patterns
            describe the past; they do not predict the next drawing.
            Entertainment, not prediction.
          </p>
        </div>
      ) : (
        <div className="ladder-sentinel" ref={endRef} aria-hidden="true">
          <span>Loading rank #{shown + 1}…</span>
        </div>
      )}
    </section>
  );
}
