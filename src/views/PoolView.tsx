import { useMemo, useRef, useState } from "react";
import { Ball } from "../components/Ball";
import { PrintSlip } from "../components/PrintSlip";
import { money, moneyExact, parseMoney } from "../lib/ev";
import { avoidWhites, frequencyStats } from "../lib/frequency";
import { DEFAULT_FILTERS, formatTicket } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import { scorePool } from "../lib/settle";
import {
  downloadPoolJson,
  parsePoolJson,
  poolShareUrl,
} from "../lib/sharePool";
import type { Filters, Pool } from "../types";
import type { OfficialDraw } from "../lib/winners";

type Props = {
  pool: Pool;
  past: Set<string>;
  draws: OfficialDraw[];
  latest: OfficialDraw | null;
  jackpotCash: number;
  shareNotice: string | null;
  setName: (name: string) => void;
  addMember: () => void;
  updateMember: (id: string, patch: Partial<Pool["members"][number]>) => void;
  removeMember: (id: string) => void;
  removeTicket: (id: string) => void;
  mintTickets: (
    count: number,
    filters: Filters,
    past: Set<string>,
    avoid?: Set<number>,
  ) => { added: number; rejected: number };
  replacePool: (pool: Pool) => void;
  reset: () => void;
};

export function PoolView({
  pool,
  past,
  draws,
  latest,
  jackpotCash,
  shareNotice,
  setName,
  addMember,
  updateMember,
  removeMember,
  removeTicket,
  mintTickets,
  replacePool,
  reset,
}: Props) {
  const spec = GAMES[pool.game];
  const fileRef = useRef<HTMLInputElement>(null);
  const [mintCount, setMintCount] = useState("10");
  const [win, setWin] = useState("");
  const [mintNote, setMintNote] = useState("");
  const [shareNote, setShareNote] = useState("");

  const totals = useMemo(() => {
    const shares = pool.members.reduce((s, m) => s + Math.max(0, m.shares), 0);
    const paidShares = pool.members
      .filter((m) => m.paid)
      .reduce((s, m) => s + Math.max(0, m.shares), 0);
    const cost = pool.tickets.length * spec.ticketCost;
    const costPerShare = shares > 0 ? cost / shares : 0;
    return { shares, paidShares, cost, costPerShare };
  }, [pool.members, pool.tickets.length, spec.ticketCost]);

  const scored = useMemo(
    () =>
      latest && pool.tickets.length > 0
        ? scorePool(pool.tickets, latest, pool.game, jackpotCash)
        : [],
    [latest, pool.tickets, pool.game, jackpotCash],
  );
  const settledTotal = scored.reduce((s, row) => s + row.prize, 0);
  const override = parseMoney(win);
  const prizeTotal = override > 0 ? override : settledTotal;
  const splitBase = totals.paidShares > 0 ? totals.paidShares : totals.shares;

  const avoid = useMemo(
    () =>
      avoidWhites(
        DEFAULT_FILTERS,
        frequencyStats(draws, spec.whiteMax),
        latest?.whites ?? [],
      ),
    [draws, spec.whiteMax, latest],
  );

  function mint() {
    const n = Math.min(100, Math.max(1, Number(mintCount) || 1));
    const result = mintTickets(n, DEFAULT_FILTERS, past, avoid);
    setMintNote(
      result.added === n
        ? `Added ${result.added} unique tickets.`
        : `Added ${result.added} of ${n} (${result.rejected} skipped as crowded or duplicate).`,
    );
  }

  async function copyLink() {
    const { url, tooLong } = poolShareUrl(pool);
    if (tooLong) {
      setShareNote("This pool is too big for a link. Download the JSON file instead.");
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareNote("Link copied. Anyone who opens it loads this board in their browser.");
  }

  function onImportFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parsePoolJson(JSON.parse(String(reader.result)));
        if (!parsed) {
          setShareNote("That file is not a JackpotDesk pool.");
          return;
        }
        replacePool(parsed);
        setShareNote(`Loaded “${parsed.name || "pool"}” from file.`);
      } catch {
        setShareNote("Could not read that JSON file.");
      }
    };
    reader.readAsText(file);
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
        Members, shares, and tickets live here. Bookkeeping stays in this
        browser unless you copy a link or export JSON for the rest of the group.
      </p>

      {shareNotice ? <p className="fine">{shareNotice}</p> : null}

      <div className="actions">
        <button type="button" onClick={() => void copyLink()}>
          Copy share link
        </button>
        <button type="button" onClick={() => downloadPoolJson(pool)}>
          Download JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          className="file-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            onImportFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {shareNote ? <p className="fine">{shareNote}</p> : null}

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
      <div className="ledger-wrap">
      <table className="ledger members-ledger">
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
                <td data-label="Shares">
                  <input
                    className="narrow"
                    value={String(m.shares)}
                    onChange={(e) =>
                      updateMember(m.id, {
                        shares: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    inputMode="numeric"
                  />
                </td>
                <td data-label="Paid">
                  <input
                    type="checkbox"
                    checked={m.paid}
                    onChange={(e) => updateMember(m.id, { paid: e.target.checked })}
                  />
                </td>
                <td className="num" data-label="Owes">
                  {m.paid ? "—" : moneyExact.format(owes)}
                </td>
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
      </div>
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
            inputMode="numeric"
          />
        </label>
        <button type="button" className="primary" onClick={mint}>
          Unique tickets into pool
        </button>
        {pool.tickets.length > 0 ? (
          <button type="button" onClick={() => window.print()}>
            Print playslip
          </button>
        ) : null}
      </div>
      {mintNote ? <p className="fine">{mintNote}</p> : null}

      {pool.tickets.length === 0 ? (
        <p className="fine">No tickets yet. Mint here or generate on the Tickets tab and add them.</p>
      ) : (
        <ol className="ticket-list compact">
          {pool.tickets.map((ticket, i) => {
            const row = scored[i];
            return (
              <li key={ticket.id}>
                <div className="ticket-row">
                  <span className="idx">{i + 1}</span>
                  {ticket.whites.map((n) => (
                    <Ball
                      key={`${ticket.id}-${n}`}
                      value={n}
                      hit={row?.hitWhites.has(n)}
                    />
                  ))}
                  <Ball value={ticket.extra} extra hit={row?.extraHit} />
                  {row ? (
                    <span className={row.prize > 0 ? "settle-hit" : "settle-miss"}>
                      {row.tier
                        ? `${row.tier.label} · ${row.tier.isJackpot ? "jackpot cash" : money.format(row.prize)}`
                        : "No prize"}
                    </span>
                  ) : null}
                  <button type="button" onClick={() => removeTicket(ticket.id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <h3>Settle last draw</h3>
      {latest ? (
        <p className="fine">
          Scoring against {latest.date}. Jackpot cash used for a 5+extra hit:{" "}
          {jackpotCash > 0 ? money.format(jackpotCash) : "enter cash on This week"}.
          Multipliers (Power Play / Megaplier) are not applied.
        </p>
      ) : (
        <p className="fine">Official numbers have not loaded yet.</p>
      )}
      {scored.length > 0 ? (
        <p className="fine">
          Pool prize from the last draw: {money.format(settledTotal)}
          {settledTotal === 0 ? " — no winning tiers." : "."}
        </p>
      ) : null}

      <label>
        Prize override
        <input
          value={win}
          onChange={(e) => setWin(e.target.value)}
          placeholder="Leave blank to use settled total"
        />
      </label>
      {prizeTotal > 0 && splitBase > 0 ? (
        <div className="ledger-wrap">
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
              const counted =
                totals.paidShares > 0 ? (m.paid ? m.shares : 0) : m.shares;
              const payout = (counted / splitBase) * prizeTotal;
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
        </div>
      ) : (
        <p className="fine">
          Splits use paid shares when anyone has paid. Last-draw prizes fill this
          automatically. Override with 50k or 1.2B if you need to.
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

      <PrintSlip
        game={pool.game}
        tickets={pool.tickets}
        title={pool.name || "Pool slip"}
      />
    </section>
  );
}
