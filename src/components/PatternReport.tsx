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

/** Toggle + copy for scoring history, then vetoing faded boards. */
export function PatternFadesToggle({
  on,
  onToggle,
  variant = "pattern",
  compact = false,
}: {
  on: boolean;
  onToggle: (next: boolean) => void;
  variant?: "pattern" | "ladder";
  compact?: boolean;
}) {
  const body =
    variant === "ladder"
      ? "Off: the full ranked field, highest pattern score first. Re-ranks only when new official draws land. On: same score, then drop last-draw, hot, cold, and obvious shapes from the fade list. Survivors keep their order and are re-numbered from #1. History is a score, then a veto. Same hit odds either way."
      : "Off: highest-weighted echo of official history. On: same score, then drop last-draw, hot, cold, and obvious shapes from the fade list. History is a score, then a veto. Same hit odds either way.";
  return (
    <div className={`pattern-mix${compact ? " is-compact" : ""}`}>
      <label title={compact ? body : undefined}>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
        />
        Apply fades
      </label>
      {compact ? null : <p className="fine">{body}</p>}
    </div>
  );
}

/**
 * Per-ticket pattern scores and plain-language why-lines. Purely
 * descriptive of past drawings. The footer says so out loud.
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
      <details className="gen-fold is-hint">
        <summary>
          <span className="fold-title">About this score</span>
          <span className="fold-meta">50 pts = random</span>
        </summary>
        <div className="fold-body">
          <p className="fine">
            Scores weigh number frequency, common pairs, recent heat, and the
            odd/even, high/low, and sum shapes of{" "}
            {model.draws.toLocaleString("en-US")} past drawings ({source}).
            These patterns describe the past only. Every combination is
            exactly as likely as any other. Entertainment, not prediction.
          </p>
        </div>
      </details>
    </section>
  );
}
