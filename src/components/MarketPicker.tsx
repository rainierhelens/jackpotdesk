import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { FlashNum } from "./Flash";
import { computeEv, formatCompact, moneyExact } from "../lib/ev";
import { estimateTicketsSold, type MarketQuote } from "../lib/market";
import { GAMES } from "../lib/prizes";
import { NATIONAL_GAMES, useMarketQuotes } from "../lib/useMarketQuotes";
import { useWaDraws } from "../lib/waDraws";
import { WA_GAME_ORDER, WA_GAMES } from "../lib/waGames";
import type { DeskId, GameId, WaGameId } from "../types";

type Props = {
  desk: DeskId;
  game: GameId;
  waGame: WaGameId;
  onNational: (game: GameId) => void;
  onWashington: (game: WaGameId) => void;
};

/** Sketch assumptions matching the This week tab defaults. */
const PICKER_TAX = { federalTax: 0.37, stateTax: 0.05, humanTicketShare: 0.2 };

function netEvFor(game: GameId, quote: MarketQuote): number {
  return computeEv(game, {
    advertisedJackpot: quote.advertised,
    cashJackpot: quote.cash,
    ticketsSold: estimateTicketsSold(quote.advertised, GAMES[game].ticketCost),
    ...PICKER_TAX,
  }).unique.netEv;
}

function Row({
  name,
  value,
  flash,
  sub,
  active,
  onPick,
}: {
  name: string;
  value: string;
  flash?: number;
  sub: ReactNode;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`picker-row${active ? " on" : ""}`}
      onClick={onPick}
    >
      <span className="picker-row-name">{name}</span>
      <span className="picker-row-quote">
        <span className="picker-row-value">
          {flash !== undefined ? (
            <FlashNum value={flash}>{value}</FlashNum>
          ) : (
            value
          )}
        </span>
        <span className="picker-row-sub">{sub}</span>
      </span>
    </button>
  );
}

export function MarketPicker({
  desk,
  game,
  waGame,
  onNational,
  onWashington,
}: Props) {
  const [open, setOpen] = useState(false);
  const quotes = useMarketQuotes();
  const rootRef = useRef<HTMLDivElement>(null);
  const { book, feed } = useWaDraws();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function moveFocus(where: 1 | -1 | "home" | "end") {
    const rows = rootRef.current?.querySelectorAll<HTMLButtonElement>(
      ".picker-row",
    );
    if (!rows || rows.length === 0) return;
    const list = Array.from(rows);
    const idx = list.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (where === "home") next = 0;
    else if (where === "end") next = list.length - 1;
    else if (idx === -1) next = where === 1 ? 0 : list.length - 1;
    else next = Math.min(list.length - 1, Math.max(0, idx + where));
    list[next]?.focus();
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (!open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus("home");
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus("end");
    }
  }

  function pickNational(id: GameId) {
    setOpen(false);
    onNational(id);
  }

  function pickWashington(id: WaGameId) {
    setOpen(false);
    onWashington(id);
  }

  const deskLabel = desk === "national" ? "National" : "Washington";
  const gameLabel =
    desk === "national" ? GAMES[game].label : WA_GAMES[waGame].label;

  const feedDot = (
    <i
      className={`tick-dot ${feed === "live" ? "is-live" : "is-baked"}`}
      title={feed === "live" ? "Live feed" : "Baked fallback"}
    />
  );

  const waQuote: Record<WaGameId, { value: string; flash?: number; sub: string }> = {
    hit5: {
      value: formatCompact(book.prizes.hit5.cashpot),
      flash: book.prizes.hit5.cashpot,
      sub: "CASHPOT · DAILY",
    },
    lotto: {
      value: formatCompact(book.prizes.lotto.advertised),
      flash: book.prizes.lotto.advertised,
      sub: `CASH ${formatCompact(book.prizes.lotto.cash)} · M·W·S`,
    },
    match4: { value: "$10K", sub: "FIXED TOP · DAILY" },
    pick3: { value: "$500", sub: "$1 STRAIGHT · DAILY" },
    keno: { value: "$100K", sub: "10-SPOT MAX · DAILY" },
    cashpop: { value: "$25–500", sub: "PRINTED PER $5 POP" },
  };

  return (
    // Keyboard nav for the open listbox lives on the wrapper.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="picker" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        className={`picker-btn${open ? " open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="picker-desk">{deskLabel}</span>
        <span className="picker-game">{gameLabel}</span>
        <span className="picker-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="picker-menu" role="listbox" aria-label="Choose a market">
          <div className="picker-group">
            <p className="picker-group-label">National</p>
            {NATIONAL_GAMES.map((id) => {
              const quote = quotes[id] ?? null;
              const netEv = quote ? netEvFor(id, quote) : null;
              return (
                <Row
                  key={id}
                  name={GAMES[id].label}
                  value={quote ? formatCompact(quote.advertised) : "——"}
                  flash={quote?.advertised ?? 0}
                  sub={
                    netEv !== null ? (
                      <span className={`tick-ev ${netEv >= 0 ? "plus" : "minus"}`}>
                        {netEv >= 0 ? "+" : ""}
                        {moneyExact.format(netEv)} EV
                      </span>
                    ) : (
                      "EV —"
                    )
                  }
                  active={desk === "national" && game === id}
                  onPick={() => pickNational(id)}
                />
              );
            })}
          </div>
          <div className="picker-group">
            <p className="picker-group-label">Washington {feedDot}</p>
            {WA_GAME_ORDER.map((id) => (
              <Row
                key={id}
                name={WA_GAMES[id].label}
                value={waQuote[id].value}
                flash={waQuote[id].flash}
                sub={waQuote[id].sub}
                active={desk === "washington" && waGame === id}
                onPick={() => pickWashington(id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
