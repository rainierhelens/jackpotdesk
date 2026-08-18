import { useEffect, useState } from "react";
import { FlashNum } from "./Flash";
import { computeEv, formatCompact, moneyExact } from "../lib/ev";
import { estimateTicketsSold, type MarketQuote } from "../lib/market";
import {
  drawUrgency,
  formatRemainCompact,
  resolveDraw,
} from "../lib/nextDraw";
import { GAMES } from "../lib/prizes";
import { NATIONAL_GAMES, useMarketQuotes } from "../lib/useMarketQuotes";
import { useWaDraws } from "../lib/waDraws";
import type { DeskId, GameId, WaGameId } from "../types";

type Props = {
  desk: DeskId;
  game: GameId;
  waGame: WaGameId;
  latestDate: string | null;
  onNational: (game: GameId) => void;
  onWashington: (game: WaGameId) => void;
};

/** Sketch assumptions matching the This week tab defaults. */
const TICKER_TAX = { federalTax: 0.37, stateTax: 0.05, humanTicketShare: 0.2 };

function netEvFor(game: GameId, quote: MarketQuote): number {
  return computeEv(game, {
    advertisedJackpot: quote.advertised,
    cashJackpot: quote.cash,
    ticketsSold: estimateTicketsSold(quote.advertised, GAMES[game].ticketCost),
    ...TICKER_TAX,
  }).unique.netEv;
}

function NationalTick({
  game,
  quote,
  latestDate,
  now,
  active,
  onPick,
}: {
  game: GameId;
  quote: MarketQuote | null;
  latestDate: string | null;
  now: number;
  active: boolean;
  onPick: () => void;
}) {
  const spec = GAMES[game];
  const phase = resolveDraw(game, quote?.nextDraw ?? null, latestDate, now);
  const remain = phase.at.getTime() - now;
  const urgency = drawUrgency(remain, phase.status);
  const clock =
    phase.status === "waiting" ? "DRAWING" : formatRemainCompact(remain);
  const netEv = quote ? netEvFor(game, quote) : null;

  return (
    <button
      type="button"
      className={`tick${active ? " on" : ""}`}
      onClick={onPick}
      title={
        quote
          ? `Cash ${formatCompact(quote.cash)} · net EV per $${spec.ticketCost} ticket (37% fed + 5% state sketch)`
          : "Loading jackpot feed"
      }
    >
      <span className="tick-label">{spec.label}</span>
      <span className="tick-value">
        <FlashNum value={quote?.advertised ?? 0}>
          {quote ? formatCompact(quote.advertised) : "··"}
        </FlashNum>
      </span>
      <span className="tick-sub">
        {netEv !== null ? (
          <span className={`tick-ev ${netEv >= 0 ? "plus" : "minus"}`}>
            {netEv >= 0 ? "+" : ""}
            {moneyExact.format(netEv)} EV
          </span>
        ) : (
          <span className="tick-ev">EV</span>
        )}
        <span className={`tick-clock urgent-${urgency}`}>{clock}</span>
      </span>
    </button>
  );
}

export function MarketTicker({
  desk,
  game,
  waGame,
  latestDate,
  onNational,
  onWashington,
}: Props) {
  const quotes = useMarketQuotes();
  const [now, setNow] = useState(() => Date.now());
  const { book, feed } = useWaDraws();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const feedDot = (
    <i
      className={`tick-dot ${feed === "live" ? "is-live" : "is-baked"}`}
      title={feed === "live" ? "Live feed" : "Baked fallback"}
    />
  );

  return (
    <div className="ticker" role="navigation" aria-label="Market ticker">
      {NATIONAL_GAMES.map((id) => (
        <NationalTick
          key={id}
          game={id}
          quote={quotes[id] ?? null}
          latestDate={game === id ? latestDate : null}
          now={now}
          active={desk === "national" && game === id}
          onPick={() => onNational(id)}
        />
      ))}
      <button
        type="button"
        className={`tick${desk === "washington" && waGame === "hit5" ? " on" : ""}`}
        onClick={() => onWashington("hit5")}
        title={`Washington Hit 5 cashpot · ${book.asOf}`}
      >
        <span className="tick-label">WA Hit 5 {feedDot}</span>
        <span className="tick-value">
          <FlashNum value={book.prizes.hit5.cashpot}>
            {formatCompact(book.prizes.hit5.cashpot)}
          </FlashNum>
        </span>
        <span className="tick-sub">
          <span className="tick-ev">CASHPOT</span>
          <span className="tick-clock">DAILY 8PM PT</span>
        </span>
      </button>
      <button
        type="button"
        className={`tick${desk === "washington" && waGame === "lotto" ? " on" : ""}`}
        onClick={() => onWashington("lotto")}
        title={`Washington Lotto · cash ${formatCompact(book.prizes.lotto.cash)} · ${book.asOf}`}
      >
        <span className="tick-label">WA Lotto {feedDot}</span>
        <span className="tick-value">
          <FlashNum value={book.prizes.lotto.advertised}>
            {formatCompact(book.prizes.lotto.advertised)}
          </FlashNum>
        </span>
        <span className="tick-sub">
          <span className="tick-ev">CASH {formatCompact(book.prizes.lotto.cash)}</span>
          <span className="tick-clock">MON·WED·SAT</span>
        </span>
      </button>
    </div>
  );
}
