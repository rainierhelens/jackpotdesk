import { useState } from "react";
import { Ball } from "../components/Ball";
import { Playslip } from "../components/Playslip";
import { PrintSlip } from "../components/PrintSlip";
import { DEFAULT_FILTERS, formatTicket, generateTickets } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import type { Filters, GameId, Ticket } from "../types";

type Props = {
  game: GameId;
  past: Set<string>;
  asOf: string | null;
  winnerError: string | null;
  exclude: Set<string>;
  onAddToPool: (tickets: Ticket[]) => void;
};

export function TicketsView({
  game,
  past,
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

  function toggle(key: keyof Filters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function generate() {
    const n = Math.min(50, Math.max(1, Number(count) || 1));
    const result = generateTickets(spec, n, filters, past, exclude);
    setTickets(result.tickets);
    setRejected(result.rejected);
    setAttempts(result.attempts);
  }

  function copyAll() {
    const text = tickets
      .map((t) => formatTicket(t, spec.extraLabel))
      .join("\n");
    void navigator.clipboard.writeText(text);
  }

  return (
    <section className="panel">
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
        sequences, playslip lines, or the last 40 official {spec.label} winners
        are thrown out and redrawn. This does not change jackpot odds.
      </p>

      {winnerError ? (
        <p className="warn">{winnerError}. Previous-winner filter is skipped until the feed loads.</p>
      ) : (
        <p className="fine">
          Official white-ball sets loaded{asOf ? ` through ${asOf}` : ""}: {past.size}.
          Source: NY Open Data.
        </p>
      )}

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
      </div>

      {tickets.length > 0 ? (
        <>
          <p className="fine">
            Kept {tickets.length} after {attempts.toLocaleString("en-US")} draws
            ({rejected} crowded or duplicate skipped).
          </p>
          <ol className="ticket-list">
            {tickets.map((ticket, i) => (
              <li key={ticket.id}>
                <div className="ticket-row">
                  <span className="idx">{i + 1}</span>
                  {ticket.whites.map((n) => (
                    <Ball key={`${ticket.id}-${n}`} value={n} />
                  ))}
                  <Ball value={ticket.extra} extra />
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
