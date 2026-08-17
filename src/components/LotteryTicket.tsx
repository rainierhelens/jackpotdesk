import { pad2 } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import { barcodeWidths, playCode } from "../lib/slipImage";
import type { GameId, Ticket } from "../types";

type Props = {
  game: GameId;
  tickets: Ticket[];
  waiting?: boolean;
  drawLabel?: string | null;
};

function PowerballMark() {
  return (
    <p className="game-mark pb-mark">
      P<span className="pb-o" aria-hidden="true" />
      WERBALL
    </p>
  );
}

function MegaMark() {
  return (
    <p className="game-mark mm-mark">
      <span className="mm-stars" aria-hidden="true">
        ★★★
      </span>
      <span className="mm-mega">MEGA</span>
      <span className="mm-millions">MILLIONS</span>
    </p>
  );
}

export function LotteryTicket({
  game,
  tickets,
  waiting = false,
  drawLabel,
}: Props) {
  const spec = GAMES[game];
  const extraShort = game === "powerball" ? "PB" : "MB";
  const seed = tickets.map((t) => t.id).join("") || game;
  const serial = `JD-SAMPLE-${seed.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const total = spec.ticketCost * Math.max(tickets.length, 1);

  return (
    <article className={`lotto-slip is-${game}`}>
      <header className="lotto-head">
        {game === "powerball" ? <PowerballMark /> : <MegaMark />}
        <p className="lotto-draw">
          {drawLabel ? `DRAW ${drawLabel}` : "NEXT DRAW"}
        </p>
      </header>

      {waiting ? (
        <p className="lotto-wait">Minting unique boards…</p>
      ) : (
        <ol className="lotto-boards">
          {tickets.map((ticket, i) => (
            <li key={ticket.id}>
              <span className="lotto-code">{playCode(i)}</span>
              <span className="lotto-whites">
                {ticket.whites.map((n) => (
                  <span key={`${ticket.id}-${n}`}>{pad2(n)}</span>
                ))}
              </span>
              <span className="lotto-extra">
                <em>{extraShort}</em>
                {pad2(ticket.extra)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="lotto-price">
        ${total.toFixed(2)} <span>EP</span>{" "}
        {game === "powerball" ? "POWER PLAY: NO" : "MEGAPLIER: NO"}
      </p>

      <div className="lotto-bar" aria-hidden="true">
        {barcodeWidths(seed).map((w, i) => (
          <i key={i} style={{ width: `${w}px` }} />
        ))}
        <span>SAMPLE</span>
      </div>
      <p className="lotto-serial">{serial}</p>
      <p className="lotto-void">
        JackpotDesk sample · not a valid lottery ticket · buy at a licensed
        retailer
      </p>
    </article>
  );
}
