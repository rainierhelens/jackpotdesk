import {
  explainTicket,
  scoreTicket,
  type PatternModel,
} from "../lib/patternLab";

type PatternPlay = {
  id: string;
  numbers: number[];
  extra?: number | null;
};

function pointsTone(points: number): string {
  if (points >= 58) return "is-gold";
  if (points <= 45) return "is-flat";
  return "is-green";
}

/**
 * Per-ticket pattern scores and plain-language why-lines. Purely
 * descriptive of past drawings — the footer says so out loud.
 */
export function PatternReport({
  model,
  tickets,
  labelFor,
  source,
}: {
  model: PatternModel | null;
  tickets: PatternPlay[];
  /** Board label, e.g. B1 or POP 1. */
  labelFor?: (index: number) => string;
  /** e.g. "NY Open Data" or "Washington’s Lottery". */
  source: string;
}) {
  if (!model || tickets.length === 0) return null;
  const rows = tickets.map((t, i) => {
    const extra = t.extra ?? null;
    return {
      id: t.id,
      label: labelFor ? labelFor(i) : `B${i + 1}`,
      nums: t.numbers.map((n) => String(n).padStart(2, "0")).join(" "),
      extra: extra != null ? String(extra).padStart(2, "0") : null,
      points: scoreTicket(model, t.numbers, extra).points,
      why: explainTicket(model, t.numbers, extra),
    };
  });
  return (
    <section
      className="crowd-panel pattern-panel"
      aria-label="Pattern lab report"
    >
      <div className="crowd-topbar">
        <h3>Pattern report</h3>
        <span className="crowd-mode">
          {model.draws.toLocaleString("en-US")} DRAWS · 50 PTS = RANDOM
        </span>
      </div>
      <div className="crowd-rows">
        {rows.map(({ id, label, nums, extra, points, why }) => (
          <div className="crowd-row" key={id}>
            <span className="crowd-board">{label}</span>
            <span className="crowd-nums">
              {nums}
              {extra ? <b> {extra}</b> : null}
            </span>
            <span className={`crowd-chip ${pointsTone(points)}`}>
              {points} PTS
            </span>
            <span className="pattern-why">{why}</span>
          </div>
        ))}
      </div>
      <p className="fine crowd-note">
        Scores weigh number frequency, common pairs, recent heat, and the
        odd/even, high/low, and sum shapes of {model.draws.toLocaleString("en-US")}{" "}
        past drawings ({source}). These patterns describe the past only —
        every combination is exactly as likely as any other. Entertainment,
        not prediction.
      </p>
    </section>
  );
}
