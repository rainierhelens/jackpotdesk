import { useMemo, useState } from "react";
import { Ball } from "../components/Ball";
import { money, moneyExact, parseMoney } from "../lib/ev";
import { DEFAULT_FILTERS, formatTicket } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import type { Filters, Pool } from "../types";

type Props = {
  pool: Pool;
  past: Set<string>;
  setName: (name: string) => void;
  addMember: () => void;
  updateMember: (id: string, patch: Partial<Pool["members"][number]>) => void;
  removeMember: (id: string) => void;
  removeTicket: (id: string) => void;
  mintTickets: (
    count: number,
    filters: Filters,
    past: Set<string>,
  ) => { added: number; rejected: number };
  reset: () => void;
};

export function PoolView({
  pool,
  past,
  setName,
  addMember,
  updateMember,
  removeMember,
  removeTicket,
  mintTickets,
  reset,
}: Props) {
  const spec = GAMES[pool.game];
  const [mintCount, setMintCount] = useState("10");
  const [win, setWin] = useState("");
  const [mintNote, setMintNote] = useState("");

  const totals = useMemo(() => {
    const shares = pool.members.reduce((s, m) => s + Math.max(0, m.shares), 0);
    const paidShares = pool.members
      .filter((m) => m.paid)
      .reduce((s, m) => s + Math.max(0, m.shares), 0);
    const cost = pool.tickets.length * spec.ticketCost;
    const costPerShare = shares > 0 ? cost / shares : 0;
    return { shares, paidShares, cost, costPerShare };
  }, [pool.members, pool.tickets.length, spec.ticketCost]);

  const winAmount = parseMoney(win);
  const splitBase = totals.paidShares > 0 ? totals.paidShares : totals.shares;

  function mint() {
    const n = Math.min(100, Math.max(1, Number(mintCount) || 1));
    const result = mintTickets(n, DEFAULT_FILTERS, past);
    setMintNote(
      result.added === n
        ? `Added ${result.added} unique tickets.`
        : `Added ${result.added} of ${n} (${result.rejected} skipped as crowded or duplicate).`,
    );
  }

  const agreement = [
    `${pool.name || "This pool"} is playing ${spec.label}.`,
    `We are buying ${pool.tickets.length} ticket(s) at ${moneyExact.format(spec.ticketCost)} each (${moneyExact.format(totals.cost)} total).`,
    `Any prize is split in proportion to paid shares. Unpaid shares collect nothing.`,
    `If nobody has marked paid, we split by listed shares instead.`,
  ].join(" ");

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <p className="kicker">Syndicate · {spec.label}</p>
          <h2>The board</h2>
        </div>
        <button type="button" className="danger" onClick={reset}>
          Reset pool
        </button>
      </header>

      <div className="benefit">
        <div>
          <strong>Benefit</strong>
          <p>
            More tickets as a group, unique numbers so you do not overlap, and a
            split rule written down before anyone plays. Odds per dollar do not
            improve — fights after a hit do.
          </p>
        </div>
      </div>

      <p className="lede">
        Members, shares, and the actual tickets live here. Bookkeeping stays in
        this browser. Print or copy the agreement before anyone plays.
      </p>

      <label>
        Pool name
        <input value={pool.name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="stats-row">
        <div>
          <strong>{pool.members.length}</strong>
          <span>members</span>
        </div>
        <div>
          <strong>{totals.shares}</strong>
          <span>shares</span>
        </div>
        <div>
          <strong>{pool.tickets.length}</strong>
          <span>tickets</span>
        </div>
        <div>
          <strong>{moneyExact.format(totals.cost)}</strong>
          <span>buy-in</span>
        </div>
        <div>
          <strong>{moneyExact.format(totals.costPerShare)}</strong>
          <span>per share</span>
        </div>
      </div>

      <h3>Members</h3>
      <table className="ledger">
        <thead>
          <tr>
            <th>Name</th>
            <th>Shares</th>
            <th>Paid</th>
            <th>Owes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pool.members.map((m) => {
            const owes = Math.max(0, m.shares) * totals.costPerShare;
            return (
              <tr key={m.id}>
                <td>
                  <input
                    value={m.name}
                    placeholder="Name"
                    onChange={(e) => updateMember(m.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="narrow"
                    value={String(m.shares)}
                    onChange={(e) =>
                      updateMember(m.id, {
                        shares: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={m.paid}
                    onChange={(e) => updateMember(m.id, { paid: e.target.checked })}
                  />
                </td>
                <td className="num">{m.paid ? "—" : moneyExact.format(owes)}</td>
                <td>
                  <button type="button" onClick={() => removeMember(m.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" onClick={addMember}>
        Add member
      </button>

      <h3>Tickets</h3>
      <div className="actions">
        <label className="inline">
          Mint
          <input
            className="narrow"
            value={mintCount}
            onChange={(e) => setMintCount(e.target.value)}
          />
        </label>
        <button type="button" className="primary" onClick={mint}>
          Unique tickets into pool
        </button>
      </div>
      {mintNote ? <p className="fine">{mintNote}</p> : null}

      {pool.tickets.length === 0 ? (
        <p className="fine">No tickets yet. Mint here or generate on the Tickets tab and add them.</p>
      ) : (
        <ol className="ticket-list compact">
          {pool.tickets.map((ticket, i) => (
            <li key={ticket.id}>
              <div className="ticket-row">
                <span className="idx">{i + 1}</span>
                {ticket.whites.map((n) => (
                  <Ball key={`${ticket.id}-${n}`} value={n} />
                ))}
                <Ball value={ticket.extra} extra />
                <button type="button" onClick={() => removeTicket(ticket.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <h3>If we hit something</h3>
      <label>
        Prize amount
        <input
          value={win}
          onChange={(e) => setWin(e.target.value)}
          placeholder="50,000"
        />
      </label>
      {winAmount > 0 && splitBase > 0 ? (
        <table className="ledger">
          <thead>
            <tr>
              <th>Member</th>
              <th>Shares counted</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {pool.members.map((m) => {
              const counted = (totals.paidShares > 0 ? (m.paid ? m.shares : 0) : m.shares);
              const payout = (counted / splitBase) * winAmount;
              return (
                <tr key={m.id}>
                  <td>{m.name || "Unnamed"}</td>
                  <td className="num">{counted}</td>
                  <td className="num">{money.format(payout)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="fine">
          Splits use paid shares when anyone has paid. Enter 50k or 1.2B.
        </p>
      )}

      <blockquote className="agreement">
        <p>{agreement}</p>
        <button
          type="button"
          onClick={() => {
            const numbers = pool.tickets
              .map((t) => formatTicket(t, spec.extraLabel))
              .join("\n");
            void navigator.clipboard.writeText(`${agreement}\n\n${numbers}`);
          }}
        >
          Copy agreement + tickets
        </button>
      </blockquote>
    </section>
  );
}
