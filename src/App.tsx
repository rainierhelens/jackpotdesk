import { useEffect, useMemo, useState, type MouseEvent } from "react";
import type { DeskId, GameId, Ticket, WaGameId } from "./types";
import { DeskSwitch } from "./components/DeskSwitch";
import { DrawCountdown } from "./components/DrawCountdown";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { GameSwitch } from "./components/GameSwitch";
import { WaGameSwitch } from "./components/WaGameSwitch";
import { WhyMethod } from "./components/WhyMethod";
import { parseMoney } from "./lib/ev";
import { trackTab } from "./lib/analytics";
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
import { WaTicketsView } from "./views/WaTicketsView";
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
  const [tab, setTab] = useState<Tab>("tickets");
  const [desk, setDesk] = useState<DeskId>("national");
  const [waGame, setWaGame] = useState<WaGameId>("hit5");
  const [advertised, setAdvertised] = useState("");
  const [cash, setCash] = useState("");
  const [sold, setSold] = useState("");
  const [federal, setFederal] = useState("37");
  const [state, setState] = useState("5");
  const [stateId, setStateId] = useState("custom");
  const [humanShare, setHumanShare] = useState("20");
  const [past, setPast] = useState<Set<string>>(new Set());
  const [draws, setDraws] = useState<OfficialDraw[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [latest, setLatest] = useState<OfficialDraw | null>(null);
  const [winnerError, setWinnerError] = useState<string | null>(null);
  const [marketNote, setMarketNote] = useState<string | null>("Loading jackpot…");
  const [marketError, setMarketError] = useState<string | null>(null);
  const [nextDrawDate, setNextDrawDate] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const game = poolApi.pool.game;

  useEffect(() => {
    trackTab(tab);
  }, [tab]);

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
        setDraws(result.draws);
        setAsOf(result.asOf);
        setLatest(result.latest);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPast(new Set());
        setDraws([]);
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

  function goToTickets() {
    setTab("tickets");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onGame(next: GameId) {
    poolApi.setGame(next);
    goToTickets();
  }

  function onWaGame(next: WaGameId) {
    setWaGame(next);
    goToTickets();
  }

  function onDesk(next: DeskId) {
    setDesk(next);
    goToTickets();
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
              Same hit odds as Quick Pick. Build an uncrowded slip, then decide
              if this drawing is even worth the stake.
            </p>
          </div>
          <div className="masthead-tools">
            <DeskSwitch desk={desk} onDesk={onDesk} />
            {desk === "national" ? (
              <>
                <DrawCountdown
                  game={game}
                  feedDate={nextDrawDate}
                  latestDate={latest?.date ?? null}
                  compact
                />
                <GameSwitch game={game} onGame={onGame} />
              </>
            ) : (
              <WaGameSwitch game={waGame} onGame={onWaGame} />
            )}
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
          <button
            type="button"
            className={tab === "tickets" ? "on" : ""}
            aria-current={tab === "tickets" ? "page" : undefined}
            onClick={() => setTab("tickets")}
          >
            <img src={iconTickets} alt="" className="tab-icon wide" />
            Tickets
          </button>
          <button
            type="button"
            className={tab === "week" ? "on" : ""}
            aria-current={tab === "week" ? "page" : undefined}
            onClick={() => setTab("week")}
          >
            <img src={iconWeek} alt="" className="tab-icon" />
            <span className="tab-full">This week</span>
            <span className="tab-short">Week</span>
          </button>
          <button
            type="button"
            className={tab === "map" ? "on" : ""}
            aria-current={tab === "map" ? "page" : undefined}
            onClick={() => setTab("map")}
          >
            <img src={iconMap} alt="" className="tab-icon wide" />
            Map
          </button>
          <button
            type="button"
            className={tab === "pool" ? "on" : ""}
            aria-current={tab === "pool" ? "page" : undefined}
            onClick={() => setTab("pool")}
          >
            <img src={iconPool} alt="" className="tab-icon wide" />
            Pool
          </button>
          <button
            type="button"
            className={tab === "why" ? "on" : ""}
            aria-current={tab === "why" ? "page" : undefined}
            onClick={() => setTab("why")}
          >
            <img src={iconWhy} alt="" className="tab-icon" />
            <span className="tab-full">Why this</span>
            <span className="tab-short">Why</span>
          </button>
        </nav>

      <main>
      {desk === "washington" && tab !== "tickets" && tab !== "map" ? (
        <p className="lede">
          Washington slips and the Hit 5 / Lotto line are on Tickets. Pool and
          Why still price Powerball / Mega Millions.
        </p>
      ) : null}

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
          onBuildSlip={() => {
            setTab("tickets");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      {tab === "map" ? (
        <MapView game={game} preferWa={desk === "washington"} />
      ) : null}

      {tab === "tickets" ? (
        desk === "washington" ? (
          <WaTicketsView key={waGame} game={waGame} />
        ) : (
          <TicketsView
            key={game}
            game={game}
            past={past}
            draws={draws}
            asOf={asOf}
            winnerError={winnerError}
            exclude={exclude}
            nextDrawDate={nextDrawDate}
            onAddToPool={onAddToPool}
          />
        )
      ) : null}

      {tab === "pool" ? (
        <PoolView
          pool={poolApi.pool}
          past={past}
          draws={draws}
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
