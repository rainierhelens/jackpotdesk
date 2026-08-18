import { useEffect, useMemo, useState } from "react";
import { FeedMark } from "../components/FeedMark";
import { MapFilters, RangeSlider } from "../components/RangeSlider";
import { UsaCartogram } from "../components/UsaCartogram";
import { WaBoard } from "../components/WaBoard";
import { formatCompact } from "../lib/ev";
import {
  advertisedSpan,
  dataYearSpan,
  filterWins,
  formatDrawDate,
  gameShort,
  heatByState,
  heatValue,
  snapJackpot,
  ticketShare,
  winYear,
  yearsByState,
  yearsInWins,
  yearTint,
  type GameFilter,
  type HeatMetric,
  type JackpotWin,
} from "../lib/jackpotMap";
import { STATE_NAME } from "../lib/usTiles";
import {
  filterWaStores,
  pinFill,
  storeYear,
  waGameLabel,
  waGameShort,
  waJackpots,
  waJackpotYearSpan,
  waWinsSpan,
  waYearSpan,
  yearsInStores,
  WA_AS_OF,
  WA_REGIONS,
  type WaRegion,
  type WaTicketFilter,
} from "../lib/waBoard";
import { GAMES } from "../lib/prizes";
import { useJackpotWins } from "../lib/useJackpotWins";
import type { GameId } from "../types";

type Props = { game: GameId; preferWa?: boolean };
type Board = "us" | "wa";

export function MapView({ game, preferWa = false }: Props) {
  const [board, setBoard] = useState<Board>(preferWa ? "wa" : "us");
  const [games, setGames] = useState<GameFilter>("both");
  const [metric, setMetric] = useState<HeatMetric>("tickets");
  const [selected, setSelected] = useState<string | null>(null);

  const { book, feed } = useJackpotWins();

  useEffect(() => {
    setBoard(preferWa ? "wa" : "us");
    setSelected(null);
  }, [preferWa]);

  return (
    <section className="panel">
      <div className="map-toolbar">
        <div className="segment" role="group" aria-label="Board">
          <button
            type="button"
            className={board === "us" ? "on" : ""}
            aria-pressed={board === "us"}
            onClick={() => {
              setBoard("us");
              setSelected(null);
            }}
          >
            US jackpots
          </button>
          <button
            type="button"
            className={board === "wa" ? "on" : ""}
            aria-pressed={board === "wa"}
            onClick={() => {
              setBoard("wa");
              setSelected(null);
            }}
          >
            Washington
          </button>
        </div>
      </div>
      {board === "wa" ? (
        <WaMap wins={book.wins} feed={feed} />
      ) : (
        <UsMap
          game={game}
          games={games}
          metric={metric}
          selected={selected}
          allWins={book.wins}
          asOf={book.asOf}
          feed={feed}
          onGames={setGames}
          onMetric={setMetric}
          onSelected={setSelected}
        />
      )}
    </section>
  );
}

function UsMap({
  game,
  games,
  metric,
  selected,
  allWins,
  asOf,
  feed,
  onGames,
  onMetric,
  onSelected,
}: {
  game: GameId;
  games: GameFilter;
  metric: HeatMetric;
  selected: string | null;
  allWins: JackpotWin[];
  asOf: string;
  feed: "live" | "baked";
  onGames: (games: GameFilter) => void;
  onMetric: (metric: HeatMetric) => void;
  onSelected: (state: string | null) => void;
}) {
  const yearMax = dataYearSpan(allWins, asOf);
  const [yearsShown, setYearsShown] = useState(Math.min(5, yearMax));
  const windowed = useMemo(
    () => filterWins(allWins, games, yearsShown, undefined, asOf),
    [allWins, games, yearsShown, asOf],
  );
  const span = useMemo(() => {
    const raw = advertisedSpan(windowed);
    if (raw.max <= 0) return { min: 0, max: 0 };
    return {
      min: snapJackpot(raw.min, "down"),
      max: Math.max(snapJackpot(raw.max, "up"), snapJackpot(raw.min, "down")),
    };
  }, [windowed]);
  const [minAmt, setMinAmt] = useState(span.min);
  const [maxAmt, setMaxAmt] = useState(span.max);

  useEffect(() => {
    setMinAmt(span.min);
    setMaxAmt(span.max);
  }, [span.min, span.max]);

  const wins = useMemo(
    () =>
      windowed.filter(
        (w) => w.advertised >= minAmt && w.advertised <= maxAmt,
      ),
    [windowed, minAmt, maxAmt],
  );
  const heat = useMemo(() => heatByState(wins), [wins]);
  const yearMarks = useMemo(() => yearsByState(wins), [wins]);
  const yearList = useMemo(() => yearsInWins(wins), [wins]);
  const list = selected ? wins.filter((w) => w.state === selected) : wins;
  const focus = selected ? heat.get(selected) : null;
  const tickets = wins.length;
  const dollars = wins.reduce((sum, w) => sum + ticketShare(w), 0);
  const statesHit = heat.size;
  const latest = wins[0] ?? null;
  const yearLabel = yearsShown >= yearMax ? "All" : `${yearsShown}y`;

  return (
    <>
      <header className="panel-head">
        <div>
          <p className="kicker">Jackpot map · through {formatDrawDate(asOf)}</p>
          <h2>Where the big ones hit</h2>
          <p className="fine">
            <FeedMark feed={feed} /> · public jackpot tickets by sale state, not
            every prize.
          </p>
        </div>
      </header>

      <div className="benefit">
        <div>
          <strong>What this is</strong>
          <p>
            Public Powerball and Mega Millions <em>jackpot</em> tickets, mapped
            by the state where the ticket was sold. Not a live feed of $4
            winners, not store-level, not a prediction of the next hit. New
            jackpot locations land here when the public lists update.
          </p>
        </div>
      </div>

      <p className="lede">
        Lotteries do not publish a national map of every prize. Jackpot tickets
        are news, so those locations are public. Color is either ticket count or
        advertised annuity share (split jackpots are divided). Stripes on each
        state are the years that hit. {GAMES[game].label} is selected in the
        header; this tab can still show both games.
      </p>

      <div className="map-toolbar">
        <div className="segment" role="group" aria-label="Games">
          <button
            type="button"
            className={games === "both" ? "on" : ""}
            aria-pressed={games === "both"}
            onClick={() => onGames("both")}
          >
            Both
          </button>
          <button
            type="button"
            className={games === "powerball" ? "on" : ""}
            aria-pressed={games === "powerball"}
            onClick={() => onGames("powerball")}
          >
            Powerball
          </button>
          <button
            type="button"
            className={games === "megamillions" ? "on" : ""}
            aria-pressed={games === "megamillions"}
            onClick={() => onGames("megamillions")}
          >
            Mega Millions
          </button>
        </div>
        <div className="segment" role="group" aria-label="Heat">
          <button
            type="button"
            className={metric === "tickets" ? "on" : ""}
            aria-pressed={metric === "tickets"}
            onClick={() => onMetric("tickets")}
          >
            Tickets
          </button>
          <button
            type="button"
            className={metric === "dollars" ? "on" : ""}
            aria-pressed={metric === "dollars"}
            onClick={() => onMetric("dollars")}
          >
            Dollars
          </button>
        </div>
      </div>

      <MapFilters>
        <RangeSlider
          label="Min jackpot"
          min={span.min}
          max={span.max}
          step={5_000_000}
          value={Math.min(minAmt, maxAmt)}
          display={`$${formatCompact(minAmt)}`}
          disabled={span.max <= span.min}
          onChange={(next) => setMinAmt(Math.min(next, maxAmt))}
        />
        <RangeSlider
          label="Max jackpot"
          min={span.min}
          max={span.max}
          step={5_000_000}
          value={Math.max(maxAmt, minAmt)}
          display={`$${formatCompact(maxAmt)}`}
          disabled={span.max <= span.min}
          onChange={(next) => setMaxAmt(Math.max(next, minAmt))}
        />
        <RangeSlider
          label="Years"
          min={1}
          max={yearMax}
          step={1}
          value={yearsShown}
          display={yearLabel}
          onChange={setYearsShown}
        />
      </MapFilters>

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
              : "None"}
          </strong>
        </article>
      </div>

      <div className="map-layout">
        <div className="map-board">
          <UsaCartogram
            heat={heat}
            yearsByState={yearMarks}
            metric={metric}
            selected={selected}
            onSelect={onSelected}
          />
          <div className="map-legend" aria-hidden="true">
            <span>None</span>
            <i />
            <span>{metric === "tickets" ? "More tickets" : "More $"}</span>
          </div>
          {yearList.length > 0 ? (
            <ul className="year-legend">
              {yearList.map((year) => (
                <li key={year} className="year-chip">
                  <i style={{ background: yearTint(year) }} />
                  {year}
                </li>
              ))}
            </ul>
          ) : null}
          {selected ? (
            <button
              type="button"
              className="map-clear"
              onClick={() => onSelected(null)}
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
                  style={{ ["--year" as string]: yearTint(winYear(win.date)) }}
                  onClick={() => onSelected(win.state)}
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
    </>
  );
}

function WaMap({
  wins,
  feed,
}: {
  wins: JackpotWin[];
  feed: "live" | "baked";
}) {
  const [region, setRegion] = useState<WaRegion | "all">("all");
  const [tickets, setTickets] = useState<WaTicketFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const retailerYears = waYearSpan();
  const jackpotYears =
    tickets === "all" ? retailerYears : waJackpotYearSpan(tickets, wins);
  const yearMax = jackpotYears;
  const [yearsShown, setYearsShown] = useState(retailerYears);

  useEffect(() => {
    setYearsShown(yearMax);
    setSelected(null);
  }, [tickets, yearMax]);

  const regional = useMemo(
    () =>
      tickets === "all"
        ? filterWaStores(region, yearsShown)
        : waJackpots(tickets, yearsShown, wins),
    [region, yearsShown, tickets, wins],
  );
  const span = useMemo(() => waWinsSpan(regional), [regional]);
  const [minWins, setMinWins] = useState(span.min);
  const [maxWins, setMaxWins] = useState(span.max);

  useEffect(() => {
    setMinWins(span.min);
    setMaxWins(span.max);
  }, [span.min, span.max]);

  const stores = useMemo(
    () =>
      tickets === "all"
        ? regional.filter((s) => s.wins >= minWins && s.wins <= maxWins)
        : regional,
    [regional, minWins, maxWins, tickets],
  );
  const jackpotMode = tickets !== "all";
  const localJackpot = tickets === "hit5" || tickets === "lotto";
  const focus = stores.find((s) => s.id === selected) ?? null;
  const totalWins = stores.reduce((sum, s) => sum + s.wins, 0);
  const top = stores[0] ?? null;
  const yearLabel = yearsShown >= yearMax ? "All" : `${yearsShown}y`;
  const yearList = yearsInStores(stores);
  const yearStat =
    yearList.length === 0
      ? "None"
      : yearList.length === 1
        ? String(yearList[0])
        : `${yearList[0]}–${yearList[yearList.length - 1]}`;
  const heading =
    tickets === "hit5"
      ? "Hit 5 cashpots"
      : tickets === "lotto"
        ? "Lotto jackpots"
        : jackpotMode
          ? "Jackpot tickets in Washington"
          : "Where $1,000+ tickets sold";

  return (
    <>
      <header className="panel-head">
        <div>
          <p className="kicker">
            Washington board · {localJackpot ? "published cashpots" : `2023–${WA_AS_OF}`}
          </p>
          <h2>{heading}</h2>
          {jackpotMode && !localJackpot ? (
            <p className="fine">
              <FeedMark feed={feed} /> · Powerball / Mega Millions jackpot
              tickets sold in Washington, by city.
            </p>
          ) : null}
        </div>
      </header>

      <div className="benefit">
        <div>
          <strong>What this is</strong>
          <p>
            Washington’s Lottery annual top-10 list per region: stores that sold
            the most tickets worth $1,000 or more, all games mixed. The Lottery
            does not publish that list by game. Powerball / Mega Millions here
            are jackpot tickets sold in Washington, by city. Hit 5 and Lotto
            are published cashpot / jackpot tickets with a named store. Busy
            stores sell more tickets. The $1,000+ mix list is not live. This is
            not a lucky machine and not a forecast.
          </p>
        </div>
      </div>

      <p className="lede">
        {localJackpot
          ? `Published ${tickets === "hit5" ? "Hit 5 cashpot" : "Lotto jackpot"} tickets with a named retailer. Not every drawing. Driving there does not raise hit odds.`
          : jackpotMode
          ? `Jackpot tickets sold in Washington. City is public; the $1,000+ press list is not broken out by game.`
          : `Prototype. Street map with the 2023–${WA_AS_OF} press-list stores. All games mixed. No $4 prizes. Pin opens Google Maps for directions. Busy stores sell more tickets. Driving there does not raise hit odds.`}
      </p>

      <div className="map-toolbar">
        <div className="segment is-wrap" role="group" aria-label="Ticket type">
          <button
            type="button"
            className={tickets === "all" ? "on" : ""}
            aria-pressed={tickets === "all"}
            onClick={() => setTickets("all")}
          >
            All $1k+
          </button>
          <button
            type="button"
            className={tickets === "powerball" ? "on" : ""}
            aria-pressed={tickets === "powerball"}
            onClick={() => setTickets("powerball")}
          >
            Powerball
          </button>
          <button
            type="button"
            className={tickets === "megamillions" ? "on" : ""}
            aria-pressed={tickets === "megamillions"}
            onClick={() => setTickets("megamillions")}
          >
            Mega Millions
          </button>
          <button
            type="button"
            className={tickets === "hit5" ? "on" : ""}
            aria-pressed={tickets === "hit5"}
            onClick={() => setTickets("hit5")}
          >
            Hit 5
          </button>
          <button
            type="button"
            className={tickets === "lotto" ? "on" : ""}
            aria-pressed={tickets === "lotto"}
            onClick={() => setTickets("lotto")}
          >
            Lotto
          </button>
        </div>
        {jackpotMode ? null : (
          <label className="inline">
            Region
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value as WaRegion | "all");
                setSelected(null);
              }}
            >
              <option value="all">All regions</option>
              {WA_REGIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <MapFilters className={jackpotMode ? "is-slim" : undefined}>
        {jackpotMode ? null : (
          <>
            <RangeSlider
              label="Min tickets"
              min={span.min}
              max={span.max}
              step={1}
              value={Math.min(minWins, maxWins)}
              display={`${minWins}`}
              disabled={span.max <= span.min}
              onChange={(next) => setMinWins(Math.min(next, maxWins))}
            />
            <RangeSlider
              label="Max tickets"
              min={span.min}
              max={span.max}
              step={1}
              value={Math.max(maxWins, minWins)}
              display={`${maxWins}`}
              disabled={span.max <= span.min}
              onChange={(next) => setMaxWins(Math.max(next, minWins))}
            />
          </>
        )}
        <RangeSlider
          label="Years"
          min={1}
          max={yearMax}
          step={1}
          value={Math.min(yearsShown, yearMax)}
          display={yearLabel}
          onChange={setYearsShown}
        />
      </MapFilters>

      <div className="map-stats">
        <article>
          <p>
            {jackpotMode
              ? localJackpot
                ? "Published tickets"
                : "Jackpot tickets"
              : "Stores on this list"}
          </p>
          <strong>{stores.length}</strong>
        </article>
        <article>
          <p>{jackpotMode ? "Advertised" : "$1,000+ tickets"}</p>
          <strong>
            {jackpotMode
              ? `$${formatCompact(stores.reduce((sum, s) => sum + (s.advertised ?? 0), 0))}`
              : totalWins}
          </strong>
        </article>
        <article>
          <p>{jackpotMode ? "Latest" : "Top on this list"}</p>
          <strong>
            {jackpotMode
              ? top?.date
                ? formatDrawDate(top.date)
                : "None"
              : top
                ? `${top.wins}`
                : "None"}
          </strong>
        </article>
        <article>
          <p>Years</p>
          <strong>{yearStat}</strong>
        </article>
      </div>

      <div className="map-layout">
        <div className="map-board">
          <WaBoard stores={stores} selected={selected} onSelect={setSelected} />
          {yearList.length > 0 && !jackpotMode ? (
            <ul className="year-legend">
              {yearList.map((year) => (
                <li key={year} className="year-chip">
                  <i style={{ background: yearTint(year) }} />
                  {year}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="fine">
            {jackpotMode
              ? localJackpot
                ? "Pins are the store that sold the published cashpot or jackpot ticket."
                : "Pins are the city where the jackpot ticket sold, not a store."
              : "Bigger pin sold more $1,000+ tickets that year."}
          </p>
          {selected ? (
            <button
              type="button"
              className="map-clear"
              onClick={() => setSelected(null)}
            >
              {jackpotMode ? "Show all tickets" : "Show all stores"}
            </button>
          ) : (
            <p className="fine">
              {jackpotMode
                ? "Click a pin or a row."
                : "Click a pin or a row. Size is count, not luck."}
            </p>
          )}
        </div>

        <div className="map-feed">
          <header>
            <p className="kicker">
              {focus
                ? focus.city
                : jackpotMode
                  ? tickets === "hit5" || tickets === "lotto"
                    ? waGameLabel(tickets)
                    : tickets === "powerball"
                    ? "Powerball jackpots"
                    : "Mega Millions jackpots"
                  : region === "all"
                    ? "All regions"
                    : region}
            </p>
            <p className="fine">
              {focus
                ? jackpotMode
                  ? `${focus.name}${focus.date ? ` · ${formatDrawDate(focus.date)}` : ""}`
                  : `${focus.wins} tickets of $1,000 or more in ${storeYear(focus)}`
                : jackpotMode
                  ? localJackpot
                    ? "Newest first. Store is where the ticket sold."
                    : "Newest first. City is where the ticket sold."
                  : "Sorted by count. Address is where the ticket sold."}
            </p>
          </header>
          <ol>
            {stores.map((store) => (
              <li key={store.id}>
                <button
                  type="button"
                  className={`map-hit${selected === store.id ? " on" : ""}`}
                  style={{
                    ["--year" as string]: pinFill(store),
                  }}
                  onClick={() =>
                    setSelected(selected === store.id ? null : store.id)
                  }
                >
                  <span className="map-hit-top">
                    <b>
                      {jackpotMode
                        ? waGameShort(store.game ?? "powerball")
                        : store.wins}
                    </b>
                    <span>
                      {jackpotMode
                        ? store.date
                          ? formatDrawDate(store.date)
                          : storeYear(store)
                        : `${storeYear(store)} · ${store.region}`}
                    </span>
                  </span>
                  <span className="map-hit-amt">
                    {jackpotMode
                      ? `$${formatCompact(store.advertised ?? 0)}`
                      : store.name}
                  </span>
                  <span className="map-hit-place">
                    {jackpotMode
                      ? localJackpot
                        ? `${store.name} · ${store.city}`
                        : store.city
                      : `${store.address}, ${store.city}`}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
