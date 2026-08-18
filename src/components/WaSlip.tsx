import { pad2 } from "../lib/picks";
import { barcodeWidths, playCode } from "../lib/slipImage";
import type { WaGameSpec } from "../lib/waGames";
import { waSlipCost, type WaPlay } from "../lib/waPicks";

type Props = {
  spec: WaGameSpec;
  tickets: WaPlay[];
  waiting?: boolean;
  stake?: number;
  pick3Way?: "straight" | "box";
};

export function WaSlip({
  spec,
  tickets,
  waiting = false,
  stake = 1,
  pick3Way = "straight",
}: Props) {
  const seed = tickets.map((t) => t.id).join("") || spec.id;
  const serial = `JD-WA-${seed.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const total = waSlipCost(spec, tickets, stake);
  const extra =
    spec.id === "lotto"
      ? ` · ${Math.ceil(tickets.length / 2)} dollar${tickets.length > 2 ? "s" : ""} at the counter`
      : spec.id === "keno"
        ? ` · $${stake} a board`
        : spec.id === "cashpop"
          ? " · $5 a POP"
          : spec.id === "pick3"
            ? ` · ${pick3Way}`
            : "";

  return (
    <article className={`lotto-slip is-wa is-${spec.id}`}>
      <header className="lotto-head">
        <p className="game-mark wa-mark">{spec.label.toUpperCase()}</p>
        <p className="lotto-draw">WA LOTTERY</p>
      </header>

      {waiting ? (
        <p className="lotto-wait">Minting unique boards…</p>
      ) : (
        <ol className="lotto-boards">
          {tickets.map((ticket, i) => (
            <li key={ticket.id}>
              <span className="lotto-code">{playCode(i)}</span>
              <span className="lotto-whites">
                {ticket.numbers.map((n, idx) => (
                  <span key={`${ticket.id}-${idx}`}>
                    {spec.kind === "digits" ? String(n) : pad2(n)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="lotto-price">
        ${total.toFixed(2)} <span>EP</span>
        {extra}
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
