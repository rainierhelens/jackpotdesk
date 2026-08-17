import { moneyExact, type EvResult } from "../lib/ev";
import { GAMES } from "../lib/prizes";
import type { GameId } from "../types";

type Props = {
  game: GameId;
  result: EvResult;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function Outcome({
  name,
  pct,
  note,
  tone = "green",
}: {
  name: string;
  pct: number;
  note?: string;
  tone?: "green" | "orange" | "muted";
}) {
  const width = clampPct(pct);
  const shown = pct > 0 && pct < 0.01 ? "<0.01" : pct.toFixed(pct >= 10 ? 0 : 2);
  return (
    <div className={`outcome tone-${tone}`}>
      <span className="outcome-fill" style={{ width: `${Math.max(width, pct > 0 ? 0.4 : 0)}%` }} />
      <span className="outcome-name">{name}</span>
      <span className="outcome-pct">
        {shown}%{note ? <small>{note}</small> : null}
      </span>
    </div>
  );
}

export function MarketBoard({ game, result }: Props) {
  const spec = GAMES[game];
  const hitPct = (100 / spec.jackpotOdds);
  const uniqueSolo = clampPct(Math.exp(-result.unique.lambda) * 100);
  const crowdedSolo = clampPct(Math.exp(-result.crowded.lambda) * 100);
  const plusEv = result.unique.netEv >= 0;
  const cost = spec.ticketCost;
  const jackpotSlice = Math.max(0, result.unique.jackpotEv);
  const lowerSlice = Math.max(0, result.lowerEv);
  const keep = Math.max(0, cost - jackpotSlice - lowerSlice);
  const jPct = (jackpotSlice / cost) * 100;
  const lPct = (lowerSlice / cost) * 100;
  const kPct = (keep / cost) * 100;

  return (
    <section className="markets" aria-label="Implied probability board">
      <p className="kicker">Live board</p>
      <h3>Implied odds for this drawing</h3>
      <p className="fine">
        Same idea as Fanatics Markets: the number is a likelihood, not a pick.
        70% means 70-in-100. These update as you change jackpot, tax, and tickets
        sold.
      </p>

      <div className="market-grid">
        <article className="market-card">
          <h4>Your ticket hits the jackpot</h4>
          <Outcome
            name="Yes"
            pct={hitPct}
            note={`1 in ${spec.jackpotOdds.toLocaleString("en-US")}`}
          />
          <Outcome name="No" pct={100 - hitPct} tone="muted" />
        </article>

        <article className="market-card">
          <h4>You are the only jackpot winner, if it hits</h4>
          <Outcome name="Unique slip" pct={uniqueSolo} />
          <Outcome name="Birthday / public slip" pct={crowdedSolo} tone="orange" />
        </article>

        <article className="market-card">
          <h4>This {moneyExact.format(cost)} is plus-EV after tax</h4>
          <Outcome name="Yes" pct={plusEv ? 100 : 0} />
          <Outcome name="No" pct={plusEv ? 0 : 100} tone="muted" />
        </article>
      </div>

      <article className="market-card stack-card">
        <h4>Where the {moneyExact.format(cost)} goes, in expectation</h4>
        <div className="stack-bar" title={`Expected split of a ${moneyExact.format(cost)} ticket`}>
          <span className="stack-j" style={{ width: `${jPct}%` }} />
          <span className="stack-l" style={{ width: `${lPct}%` }} />
          <span className="stack-k" style={{ width: `${kPct}%` }} />
        </div>
        <ul className="stack-legend">
          <li>
            <i className="dot-j" /> Jackpot slice {jPct.toFixed(0)}%
          </li>
          <li>
            <i className="dot-l" /> Lower prizes {lPct.toFixed(0)}%
          </li>
          <li>
            <i className="dot-k" /> Lottery keeps {kPct.toFixed(0)}%
          </li>
        </ul>
      </article>
    </section>
  );
}
