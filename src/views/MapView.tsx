import { useMemo, useState } from "react";
import { UsaCartogram } from "../components/UsaCartogram";
import { formatCompact } from "../lib/ev";
import {
  filterWins,
  formatDrawDate,
  gameShort,
  heatByState,
  heatValue,
  JACKPOT_AS_OF,
  JACKPOT_WINS,
  ticketShare,
  type GameFilter,
  type HeatMetric,
  type RangeId,
} from "../lib/jackpotMap";
import { STATE_NAME } from "../lib/usTiles";
import { GAMES } from "../lib/prizes";
import type { GameId } from "../types";

type Props = { game: GameId };

export function MapView({ game }: Props) {
  const [games, setGames] = useState<GameFilter>("both");
  const [range, setRange] = useState<RangeId>("5y");
  const [metric, setMetric] = useState<HeatMetric>("tickets");
  const [selected, setSelected] = useState<string | null>(null);

  const wins = useMemo(
    () => filterWins(JACKPOT_WINS, games, range),
    [games, range],
  );
  const heat = useMemo(() => heatByState(wins), [wins]);
  const list = selected ? wins.filter((w) => w.state === selected) : wins;
  const focus = selected ? heat.get(selected) : null;
  const tickets = wins.length;
  const dollars = wins.reduce((sum, w) => sum + ticketShare(w), 0);
  const statesHit = heat.size;
  const latest = wins[0] ?? null;

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <p className="kicker">Jackpot map · through {formatDrawDate(JACKPOT_AS_OF)}</p>
          <h2>Where the big ones hit</h2>
        </div>
      </header>

      <div className="benefit">
        <div>
          <strong>What this is</strong>
          <p>
            Public Powerball and Mega Millions <em>jackpot</em> tickets, mapped
            by the state where the ticket was sold. Not a live feed of $4
            winners, not store-level, not a prediction of the next hit.
          </p>
        </div>
      </div>

      <p className="lede">
        Lotteries do not publish a national map of every prize. Jackpot tickets
        are news, so those locations are public. Color is either ticket count or
        advertised annuity share (split jackpots are divided). {GAMES[game].label}{" "}
        is selected in the header; this tab can still show both games.
      </p>

      <div className="map-toolbar">
        <div className="segment" role="group" aria-label="Games">
          <button
            type="button"
            className={games === "both" ? "on" : ""}
            onClick={() => setGames("both")}
          >
            Both
          </button>
          <button
            type="button"
            className={games === "powerball" ? "on" : ""}
            onClick={() => setGames("powerball")}
          >
            Powerball
          </button>
          <button
            type="button"
            className={games === "megamillions" ? "on" : ""}
            onClick={() => setGames("megamillions")}
          >
            Mega Millions
          </button>
        </div>
        <div className="segment" role="group" aria-label="Window">
          <button
            type="button"
            className={range === "2y" ? "on" : ""}
            onClick={() => setRange("2y")}
          >
            2 years
          </button>
          <button
            type="button"
            className={range === "5y" ? "on" : ""}
            onClick={() => setRange("5y")}
          >
            5 years
          </button>
          <button
            type="button"
            className={range === "all" ? "on" : ""}
            onClick={() => setRange("all")}
          >
            All
          </button>
        </div>
        <div className="segment" role="group" aria-label="Heat">
          <button
            type="button"
            className={metric === "tickets" ? "on" : ""}
            onClick={() => setMetric("tickets")}
          >
            Tickets
          </button>
          <button
            type="button"
            className={metric === "dollars" ? "on" : ""}
            onClick={() => setMetric("dollars")}
          >
            Dollars
          </button>
        </div>
      </div>

      <div className="map-stats">
        <article>
          <p>Jackpot tickets</p>
          <strong>{tickets}</strong>
        </article>
        <article>
          <p>States / territories</p>
          <strong>{statesHit}</strong>
        </article>
        <article>
          <p>Advertised share</p>
          <strong>${formatCompact(dollars)}</strong>
        </article>
        <article>
          <p>Latest in window</p>
          <strong>
            {latest
              ? `${latest.state} · ${formatDrawDate(latest.date)}`
              : "—"}
          </strong>
        </article>
      </div>

      <div className="map-layout">
        <div className="map-board">
          <UsaCartogram
            heat={heat}
            metric={metric}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="map-legend" aria-hidden="true">
            <span>None</span>
            <i />
            <span>{metric === "tickets" ? "More tickets" : "More $"}</span>
          </div>
          {selected ? (
            <button
              type="button"
              className="map-clear"
              onClick={() => setSelected(null)}
            >
              Show all states
            </button>
          ) : (
            <p className="fine">Click a state for the dated list.</p>
          )}
        </div>

        <div className="map-feed">
          <header>
            <p className="kicker">
              {selected
                ? STATE_NAME[selected] ?? selected
                : "Recent jackpots"}
            </p>
            {focus ? (
              <p className="fine">
                {focus.tickets} ticket{focus.tickets === 1 ? "" : "s"} · $
                {formatCompact(heatValue(focus, "dollars"))} advertised share
                {focus.lastDate ? ` · last ${formatDrawDate(focus.lastDate)}` : ""}
              </p>
            ) : (
              <p className="fine">Newest first. City is where the ticket sold.</p>
            )}
          </header>
          <ol>
            {list.slice(0, 40).map((win, i) => (
              <li key={`${win.game}-${win.date}-${win.state}-${win.city}-${i}`}>
                <button
                  type="button"
                  className="map-hit"
                  onClick={() => setSelected(win.state)}
                >
                  <span className="map-hit-top">
                    <b>{gameShort(win.game)}</b>
                    <time dateTime={win.date}>{formatDrawDate(win.date)}</time>
                  </span>
                  <span className="map-hit-amt">${formatCompact(win.advertised)}</span>
                  <span className="map-hit-place">
                    {win.city ? `${win.city}, ` : ""}
                    {win.state}
                    {win.shares > 1 ? ` · split ${win.shares} ways` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {list.length === 0 ? (
            <p className="fine">No jackpot tickets in this window.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
