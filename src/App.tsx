import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { GameId, Ticket } from "./types";
import { DrawCountdown } from "./components/DrawCountdown";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { GameSwitch } from "./components/GameSwitch";
import { InstallHint } from "./components/InstallHint";
import { WhyMethod } from "./components/WhyMethod";
import { parseMoney } from "./lib/ev";
import {
  amountField,
  estimateTicketsSold,
  fetchMarket,
} from "./lib/market";
import { comboKey } from "./lib/picks";
import { GAMES } from "./lib/prizes";
import {
  clearPoolHash,
  readPoolFromLocation,
} from "./lib/sharePool";
import { loadPool } from "./lib/storage";
import { usePool } from "./lib/usePool";
import {
  fetchOfficialDraws,
  type OfficialDraw,
} from "./lib/winners";
import { MapView } from "./views/MapView";
import { PoolView } from "./views/PoolView";
import { TicketsView } from "./views/TicketsView";
import { WeekView } from "./views/WeekView";
import logo from "./images/jackpotdesklogo.png";
import iconWeek from "./images/this-week.png";
import iconMap from "./images/map.png";
import iconTickets from "./images/tickets.png";
import iconPool from "./images/pool.png";
import iconWhy from "./images/why-this.png";

type Tab = "week" | "map" | "tickets" | "pool" | "why";

export default function App() {
  const poolApi = usePool();
  const replacePool = poolApi.replacePool;
  const [tab, setTab] = useState<Tab>("week");
  const [advertised, setAdvertised] = useState("");
  const [cash, setCash] = useState("");
  const [sold, setSold] = useState("");
  const [federal, setFederal] = useState("37");
  const [state, setState] = useState("5");
  const [stateId, setStateId] = useState("custom");
  const [humanShare, setHumanShare] = useState("20");
  const [past, setPast] = useState<Set<string>>(new Set());
  const [asOf, setAsOf] = useState<string | null>(null);
  const [latest, setLatest] = useState<OfficialDraw | null>(null);
  const [winnerError, setWinnerError] = useState<string | null>(null);
  const [marketNote, setMarketNote] = useState<string | null>("Loading jackpot…");
  const [marketError, setMarketError] = useState<string | null>(null);
  const [nextDrawDate, setNextDrawDate] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const game = poolApi.pool.game;

  useEffect(() => {
    const shared = readPoolFromLocation();
    if (!shared) return;
    const existing = loadPool();
    const busy = Boolean(
      existing && (existing.members.length > 0 || existing.tickets.length > 0),
    );
    if (
      busy &&
      !window.confirm(
        "This link has a shared pool. Replace the pool stored in this browser?",
      )
    ) {
      clearPoolHash();
      return;
    }
    replacePool(shared);
    clearPoolHash();
    setShareNotice("Loaded a shared pool from the link. It now lives in this browser.");
    setTab("pool");
  }, [replacePool]);

  useEffect(() => {
    let cancelled = false;
    setWinnerError(null);
    fetchOfficialDraws(game)
      .then((result) => {
        if (cancelled) return;
        setPast(result.keys);
        setAsOf(result.asOf);
        setLatest(result.latest);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPast(new Set());
        setAsOf(null);
        setLatest(null);
        setWinnerError(err instanceof Error ? err.message : "Winner feed failed");
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    let cancelled = false;
    setMarketError(null);
    setMarketNote("Loading advertised jackpot…");
    setNextDrawDate(null);
    fetchMarket(game)
      .then((quote) => {
        if (cancelled) return;
        setAdvertised(amountField(quote.advertised));
        setCash(amountField(quote.cash));
        setSold(
          amountField(
            estimateTicketsSold(quote.advertised, GAMES[game].ticketCost),
          ),
        );
        setNextDrawDate(quote.nextDraw);
        const next = quote.nextDraw ? ` · next draw ${quote.nextDraw}` : "";
        setMarketNote(
          `Loaded from ${quote.source}${next}. Tickets sold is an estimate. Edit any field.`,
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMarketNote(null);
        setMarketError(
          err instanceof Error
            ? err.message
            : "Could not load advertised jackpot",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    if (tab !== "why" || window.location.hash !== "#faq") return;
    document.getElementById("faq")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [tab]);

  const exclude = useMemo(
    () => new Set(poolApi.pool.tickets.map((t) => comboKey(t.whites))),
    [poolApi.pool.tickets],
  );

  function onGame(next: GameId) {
    poolApi.setGame(next);
  }

  function onAddToPool(tickets: Ticket[]) {
    poolApi.addTickets(tickets);
    setTab("pool");
  }

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    window.location.reload();
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-row">
          <div className="masthead-brand">
            <h1 className="brand">
              <a
                className="brand-home"
                href="/"
                aria-label="JackpotDesk home"
                onClick={goHome}
              >
                <img
                  className="brand-logo"
                  src={logo}
                  alt=""
                  width={294}
                  height={41}
                />
              </a>
            </h1>
            <p className="tag">
              Same hit odds as Quick Pick. Better ticket if you actually win.
              A line on whether this drawing is even worth the stake.
            </p>
          </div>
          <div className="masthead-tools">
            <DrawCountdown
              game={game}
              feedDate={nextDrawDate}
              latestDate={latest?.date ?? null}
              compact
            />
            <GameSwitch game={game} onGame={onGame} />
          </div>
        </div>
        <nav className="tabs" aria-label="Primary">
          <button
            type="button"
            className={tab === "week" ? "on" : ""}
            onClick={() => setTab("week")}
          >
            <img src={iconWeek} alt="" className="tab-icon" />
            <span className="tab-full">This week</span>
            <span className="tab-short">Week</span>
          </button>
          <button
            type="button"
            className={tab === "tickets" ? "on" : ""}
            onClick={() => setTab("tickets")}
          >
            <img src={iconTickets} alt="" className="tab-icon wide" />
            Tickets
          </button>
          <button
            type="button"
            className={tab === "map" ? "on" : ""}
            onClick={() => setTab("map")}
          >
            <img src={iconMap} alt="" className="tab-icon wide" />
            Map
          </button>
          <button
            type="button"
            className={tab === "pool" ? "on" : ""}
            onClick={() => setTab("pool")}
          >
            <img src={iconPool} alt="" className="tab-icon wide" />
            Pool
          </button>
          <button
            type="button"
            className={tab === "why" ? "on" : ""}
            onClick={() => setTab("why")}
          >
            <img src={iconWhy} alt="" className="tab-icon" />
            <span className="tab-full">Why this</span>
            <span className="tab-short">Why</span>
          </button>
        </nav>
      </header>

      <InstallHint />

      <main>

      {tab === "week" ? (
        <WeekView
          game={game}
          advertised={advertised}
          cash={cash}
          sold={sold}
          federal={federal}
          state={state}
          stateId={stateId}
          humanShare={humanShare}
          latest={latest}
          nextDrawDate={nextDrawDate}
          marketNote={marketNote}
          marketError={marketError}
          onAdvertised={setAdvertised}
          onCash={setCash}
          onSold={setSold}
          onFederal={setFederal}
          onState={setState}
          onStateId={setStateId}
          onHumanShare={setHumanShare}
        />
      ) : null}

      {tab === "map" ? <MapView game={game} /> : null}

      {tab === "tickets" ? (
        <TicketsView
          key={game}
          game={game}
          past={past}
          asOf={asOf}
          winnerError={winnerError}
          exclude={exclude}
          onAddToPool={onAddToPool}
        />
      ) : null}

      {tab === "pool" ? (
        <PoolView
          pool={poolApi.pool}
          past={past}
          latest={latest}
          jackpotCash={parseMoney(cash)}
          shareNotice={shareNotice}
          setName={poolApi.setName}
          addMember={poolApi.addMember}
          updateMember={poolApi.updateMember}
          removeMember={poolApi.removeMember}
          removeTicket={poolApi.removeTicket}
          mintTickets={poolApi.mintTickets}
          replacePool={replacePool}
          reset={poolApi.reset}
        />
      ) : null}

      {tab === "why" ? (
        <>
          <section className="panel">
            <header className="panel-head">
              <div>
                <p className="kicker">Method</p>
                <h2>Why use this</h2>
              </div>
            </header>
            <WhyMethod />
          </section>
          <Faq />
        </>
      ) : null}
      </main>

      <Footer />
    </div>
  );
}
