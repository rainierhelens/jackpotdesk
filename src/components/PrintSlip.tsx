import { Playslip } from "./Playslip";
import { formatTicket } from "../lib/picks";
import { GAMES } from "../lib/prizes";
import type { GameId, Ticket } from "../types";

type Props = {
  game: GameId;
  tickets: Ticket[];
  title?: string;
};

export function PrintSlip({ game, tickets, title }: Props) {
  const spec = GAMES[game];
  if (tickets.length === 0) return null;

  return (
    <section className="print-sheet" aria-hidden="true">
      <header>
        <p>JackpotDesk · {spec.label}</p>
        <h1>{title || "Playslip"}</h1>
        <p>
          Mark these boards at the counter. {tickets.length} play
          {tickets.length === 1 ? "" : "s"} · {spec.ticketCost} each. Same hit
          odds as Quick Pick.
        </p>
      </header>
      <ol>
        {tickets.map((ticket, i) => (
          <li key={ticket.id}>
            <p>
              Play {i + 1}: {formatTicket(ticket, spec.extraLabel)}
            </p>
            <Playslip
              whites={ticket.whites}
              whiteMax={spec.whiteMax}
              extra={ticket.extra}
              extraMax={spec.extraMax}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
