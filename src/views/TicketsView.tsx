import { useMemo, useState } from "react";
import { Ball } from "../components/Ball";
import { Playslip } from "../components/Playslip";
import { PrintSlip } from "../components/PrintSlip";
import artSlip from "../images/Build-The-Slip.jpg";
import { avoidWhites, frequencyStats } from "../lib/frequency";
import { DEFAULT_FILTERS, formatTicket, generateTickets } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import type { Filters, GameId, Ticket } from "../types";
import {
  FORMAT_START,
  RECENT_WINNER_LIMIT,
  type OfficialDraw,
} from "../lib/winners";

type Props = {
  game: GameId;
  past: Set<string>;
  draws: OfficialDraw[];
  asOf: string | null;
  winnerError: string | null;
  exclude: Set<string>;
  onAddToPool: (tickets: Ticket[]) => void;
};

function daysLabel(days: number): string {
  if (days <= 0) return "last draw";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function TicketsView({
  game,
  past,
  draws,
  asOf,
  winnerError,
  exclude,
  onAddToPool,
}: Props) {
  const spec = GAMES[game];
  const [count, setCount] = useState("5");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rejected, setRejected] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [deal, setDeal] = useState(0);

  const stats = useMemo(
    () => frequencyStats(draws, spec.whiteMax),
    [draws, spec.whiteMax],
  );
  const avoid = useMemo(
    () => avoidWhites(filters, stats),
    [filters, stats],
  );

  function toggle(key: keyof Filters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function generate() {
    const n = Math.min(50, Math.max(1, Number(count) || 1));
    const result = generateTickets(spec, n, filters, past, exclude, avoid);
    setTickets(result.tickets);
    setRejected(result.rejected);
    setAttempts(result.attempts);
    setDeal((d) => d + 1);
  }

  function copyAll() {
    const text = tickets
      .map((t) => formatTicket(t, spec.extraLabel))
      .join("\n");
    void navigator.clipboard.writeText(text);
  }

  return (
    <section className="panel">
      <div className="panel-wash" aria-hidden="true">
        <img src={artSlip} alt="" />
      </div>
      <header className="panel-head">
        <div>
          <p className="kicker">
            Unique tickets · {spec.label} · 5 from 1–{spec.whiteMax} +{" "}
            {spec.extraLabel} 1–{spec.extraMax} · {spec.ticketCost} a play
          </p>
          <h2>Build the slip</h2>
        </div>
        <div className="actions">
          <label className="inline">
            Count
            <input
              className="narrow"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button type="button" className="primary" onClick={generate}>
            Generate
          </button>
        </div>
      </header>

      <div className="benefit">
        <div>
          <strong>Benefit</strong>
          <p>
            If this slip hits the jackpot, you are less likely to split it with
            birthday players and pattern tickets. The chance it hits is identical
            to Quick Pick.
          </p>
        </div>
      </div>

      <p className="lede">
        Each set is a uniform random draw. Tickets that look like birthdays,
        sequences, playslip lines, the last {RECENT_WINNER_LIMIT} official{" "}
        {spec.label} winners, or that use this matrix’s recently drawn, longest
        gap, or overdue whites are thrown out and redrawn. This does not change
        jackpot odds.
      </p>

      {winnerError ? (
        <p className="warn">
          {winnerError}. Previous-winner and hot/cold filters are skipped until
          the feed loads.
        </p>
      ) : (
        <p className="fine">
          Recent-winner filter: last {past.size} official white sets
          {asOf ? ` through ${asOf}` : ""}. Hot/cold from{" "}
          {stats
            ? `${stats.window.toLocaleString("en-US")} current-format drawings since ${FORMAT_START[game]}`
            : "the current matrix"}
          . Source: NY Open Data.
        </p>
      )}

      {stats ? (
        <div className="temp-board">
          <article className="temp-card">
            <h3>Hot</h3>
            <p className="fine">
              Smallest gaps — drawn most recently. The public chases these.
            </p>
            <div className="ticket-row">
              {stats.hot.map((n) => (
                <Ball key={`hot-${n}`} value={n} tone="hot" />
              ))}
            </div>
          </article>
          <article className="temp-card">
            <h3>Cold</h3>
            <p className="fine">
              Largest gaps — missing the longest. Still random, just less
              fashionable.
            </p>
            <div className="ticket-row">
              {stats.cold.map((n) => (
                <Ball key={`cold-${n}`} value={n} tone="cold" />
              ))}
            </div>
          </article>
          <article className="temp-card">
            <h3>Most overdue</h3>
            <p className="fine">
              Above-median frequency, missing 30+ days. Common, then quiet.
            </p>
            <div className="ticket-row">
              {stats.overdue ? (
                <>
                  <Ball value={stats.overdue.n} tone="overdue" />
                  <span className="temp-meta">
                    {daysLabel(stats.overdue.days)}
                  </span>
                </>
              ) : (
                <span className="fine">—</span>
              )}
            </div>
          </article>
          <p className="fine temp-note">
            Past results do not predict the next drawing. We skip these whites so
            you are less likely to share a hit, not so you hit more often.
          </p>
        </div>
      ) : null}

      <div className="filters">
        <label>
          <input
            type="checkbox"
            checked={filters.birthday}
            onChange={() => toggle("birthday")}
          />
          All five whites in 1–31
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.sequence}
            onChange={() => toggle("sequence")}
          />
          Straight runs / 4+ consecutives
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.multiples}
            onChange={() => toggle("multiples")}
          />
          Multiples patterns
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.visual}
            onChange={() => toggle("visual")}
          />
          Playslip row / column / diagonal
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.previous}
            onChange={() => toggle("previous")}
          />
          Recent official winners
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.hot}
            onChange={() => toggle("hot")}
            disabled={!stats}
          />
          Recently drawn (hot)
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.cold}
            onChange={() => toggle("cold")}
            disabled={!stats}
          />
          Long gaps and overdue
        </label>
      </div>

      {tickets.length > 0 ? (
        <>
          <p className="fine">
            Kept {tickets.length} after {attempts.toLocaleString("en-US")} draws
            ({rejected} crowded or duplicate skipped).
          </p>
          <ol key={deal} className="ticket-list drop-in">
            {tickets.map((ticket, i) => (
              <li key={ticket.id}>
                <div className="ticket-row">
                  <span className="idx">{i + 1}</span>
                  {ticket.whites.map((n, bi) => (
                    <Ball
                      key={`${ticket.id}-${n}`}
                      value={n}
                      drop
                      delay={`${i * 0.08 + bi * 0.045}s`}
                    />
                  ))}
                  <Ball
                    value={ticket.extra}
                    extra
                    drop
                    delay={`${i * 0.08 + 0.28}s`}
                  />
                </div>
                {i === 0 ? (
                  <Playslip
                    whites={ticket.whites}
                    whiteMax={spec.whiteMax}
                    extra={ticket.extra}
                    extraMax={spec.extraMax}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <div className="actions">
            <button type="button" onClick={copyAll}>
              Copy numbers
            </button>
            <button type="button" onClick={() => window.print()}>
              Print playslip
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => onAddToPool(tickets)}
            >
              Add to pool
            </button>
          </div>
          <PrintSlip game={game} tickets={tickets} title="Counter slip" />
        </>
      ) : null}
    </section>
  );
}
