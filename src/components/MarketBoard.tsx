import type { ReactNode } from "react";
import { DrawCountdown } from "./DrawCountdown";
import { FlashNum } from "./Flash";
import { moneyExact, type EvResult } from "../lib/ev";
import { GAMES } from "../lib/prizes";
import type { GameId } from "../types";

type Props = {
  game: GameId;
  result: EvResult;
  feedDate?: string | null;
  latestDate?: string | null;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function pctText(pct: number): string {
  if (pct > 0 && pct < 0.01) return "<0.01%";
  return `${pct.toFixed(pct >= 10 ? 1 : 2)}%`;
}

function EvChip({ value }: { value: number }) {
  return (
    <FlashNum value={value}>
      <span className={value >= 0 ? "term-chip plus" : "term-chip minus"}>
        {value >= 0 ? "+" : "−"}
        {moneyExact.format(Math.abs(value))}
      </span>
    </FlashNum>
  );
}

function Row({
  market,
  yes,
  no,
  detail,
  bar,
  tone = "green",
}: {
  market: string;
  yes: number;
  no: number;
  detail: ReactNode;
  bar?: number;
  tone?: "green" | "orange";
}) {
  const fill = clampPct(bar ?? yes);
  return (
    <tr className={`term-row tone-${tone}`}>
      <td className="term-market">
        <span
          className="term-bar"
          style={{ width: `${Math.max(fill, fill > 0 ? 0.5 : 0)}%` }}
          aria-hidden="true"
        />
        <span className="term-market-name">{market}</span>
      </td>
      <td className="term-num">
        <FlashNum value={yes}>{pctText(clampPct(yes))}</FlashNum>
      </td>
      <td className="term-num dim">{pctText(clampPct(no))}</td>
      <td className="term-num">{detail}</td>
    </tr>
  );
}

export function MarketBoard({ game, result, feedDate, latestDate }: Props) {
  const spec = GAMES[game];
  const hitPct = 100 / spec.jackpotOdds;
  const uniqueSolo = clampPct(Math.exp(-result.unique.lambda) * 100);
  const crowdedSolo = clampPct(Math.exp(-result.crowded.lambda) * 100);
  const cost = spec.ticketCost;
  const jackpotSlice = Math.max(0, result.unique.jackpotEv);
  const lowerSlice = Math.max(0, result.lowerEv);
  const keep = Math.max(0, cost - jackpotSlice - lowerSlice);
  const jPct = (jackpotSlice / cost) * 100;
  const lPct = (lowerSlice / cost) * 100;
  const kPct = (keep / cost) * 100;
  const costText = moneyExact.format(cost);

  return (
    <section className="markets term-board" aria-label="Implied probability board">
      <div className="term-head">
        <div>
          <p className="kicker">Live board</p>
          <h3>Implied odds for this drawing</h3>
        </div>
        {feedDate !== undefined ? (
          <DrawCountdown
            game={game}
            feedDate={feedDate ?? null}
            latestDate={latestDate ?? null}
            compact
          />
        ) : null}
      </div>
      <p className="fine">
        Same idea as Fanatics Markets: the number is a likelihood, not a pick.
        70% means 70-in-100. These update as you change jackpot, tax, and
        tickets sold.
      </p>

      <div className="term-scroll">
        <table className="term-table">
          <thead>
            <tr>
              <th>Market</th>
              <th className="term-num">Yes</th>
              <th className="term-num">No</th>
              <th className="term-num">Detail</th>
            </tr>
          </thead>
          <tbody>
            <Row
              market="Your ticket hits the jackpot"
              yes={hitPct}
              no={100 - hitPct}
              detail={<>1 in {spec.jackpotOdds.toLocaleString("en-US")}</>}
            />
            <Row
              market="Sole winner if it hits · unique slip"
              yes={uniqueSolo}
              no={100 - uniqueSolo}
              detail={<>λ {result.unique.lambda.toFixed(2)}</>}
            />
            <Row
              market="Sole winner if it hits · birthday slip"
              yes={crowdedSolo}
              no={100 - crowdedSolo}
              detail={<>λ {result.crowded.lambda.toFixed(2)}</>}
              tone="orange"
            />
            <Row
              market={`This ${costText} is plus-EV · unique slip`}
              yes={result.unique.netEv >= 0 ? 100 : 0}
              no={result.unique.netEv >= 0 ? 0 : 100}
              detail={<EvChip value={result.unique.netEv} />}
            />
            <Row
              market={`This ${costText} is plus-EV · birthday slip`}
              yes={result.crowded.netEv >= 0 ? 100 : 0}
              no={result.crowded.netEv >= 0 ? 0 : 100}
              detail={<EvChip value={result.crowded.netEv} />}
              tone="orange"
            />
            <Row
              market="Share of the pot you keep if you hit · unique slip"
              yes={result.unique.shareFactor * 100}
              no={100 - result.unique.shareFactor * 100}
              detail={
                <>jackpot EV {moneyExact.format(result.unique.jackpotEv)}</>
              }
            />
            <Row
              market="Share of the pot you keep if you hit · birthday slip"
              yes={result.crowded.shareFactor * 100}
              no={100 - result.crowded.shareFactor * 100}
              detail={
                <>jackpot EV {moneyExact.format(result.crowded.jackpotEv)}</>
              }
              tone="orange"
            />
          </tbody>
        </table>
      </div>

      <article className="market-card stack-card">
        <h4>Where the {costText} goes, in expectation</h4>
        <div
          className="stack-bar"
          title={`Expected split of a ${costText} ticket`}
        >
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
