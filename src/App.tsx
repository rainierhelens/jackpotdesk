import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import type { DeskId, GameId, Ticket, WaGameId } from "./types";
import { BackToTop } from "./components/BackToTop";
import { Faq } from "./components/Faq";
import { Footer } from "./components/Footer";
import { LazyTabFallback } from "./components/LazyTabFallback";
import { MarketPicker } from "./components/MarketPicker";
import { MarketTicker } from "./components/MarketTicker";
import { WhyMethod } from "./components/WhyMethod";
import { parseMoney } from "./lib/ev";
import { trackTab } from "./lib/analytics";
import {
  amountField,
  estimateTicketsSold,
  fetchMarket,
} from "./lib/market";
import { comboKey } from "./lib/picks";
import { loadPref, savePref } from "./lib/prefs";
import { GAMES } from "./lib/prizes";
import { WA_GAME_ORDER } from "./lib/waGames";
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
const MapView = lazy(() =>
  import("./views/MapView").then((m) => ({ default: m.MapView })),
);
const PoolView = lazy(() =>
  import("./views/PoolView").then((m) => ({ default: m.PoolView })),
);
const WeekView = lazy(() =>
  import("./views/WeekView").then((m) => ({ default: m.WeekView })),
);
const TicketsView = lazy(() =>
  import("./views/TicketsView").then((m) => ({ default: m.TicketsView })),
);
const WaTicketsView = lazy(() =>
  import("./views/WaTicketsView").then((m) => ({ default: m.WaTicketsView })),
);
const BoardView = lazy(() =>
  import("./views/BoardView").then((m) => ({ default: m.BoardView })),
);
import { WriteView } from "./views/WriteView";
import { RecapView } from "./views/RecapView";
import { isRecapPath, recapPath } from "./lib/recapRoute";
import logo from "./images/jackpotdesklogo.png";
import iconWeek from "./images/this-week.png";
import iconMap from "./images/map.png";
import iconTickets from "./images/tickets.png";
import iconPool from "./images/pool.png";
import iconWhy from "./images/why-this.png";

type Tab =
  | "week"
  | "map"
  | "board"
  | "tickets"
  | "pool"
  | "why"
  | "write"
  | "recap";

const TABS: Tab[] = [
  "board",
  "recap",
  "tickets",
  "week",
  "map",
  "pool",
  "why",
  "write",
];
const NATIONAL_IDS: GameId[] = ["powerball", "megamillions"];

/** Deep-link params parsed once at startup: ?tab=&desk=&game=&wa= */
function urlState() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tab");
  const tab =
    raw === "heat" || raw === "tip"
      ? null
      : (raw as Tab | null);
  const desk = params.get("desk") as DeskId | null;
  const game = params.get("game") as GameId | null;
  const wa = params.get("wa") as WaGameId | null;
  return {
    tab: isRecapPath(window.location.pathname)
      ? "recap"
      : tab && TABS.includes(tab)
        ? tab
        : null,
    desk: desk === "national" || desk === "washington" ? desk : null,
    game: game && NATIONAL_IDS.includes(game) ? game : null,
    wa: wa && WA_GAME_ORDER.includes(wa) ? wa : null,
  };
}

const boot = urlState();

export default function App() {
  const poolApi = usePool();
  const replacePool = poolApi.replacePool;
  const [tab, setTab] = useState<Tab>(boot.tab ?? "board");
  const [desk, setDesk] = useState<DeskId>(
    boot.desk ?? loadPref<DeskId>("desk", "national"),
  );
  const [waGame, setWaGame] = useState<WaGameId>(() => {
    const stored = loadPref<WaGameId>("waGame", "hit5");
    // Stale prefs may hold retired games (pick3, keno).
    return boot.wa ?? (WA_GAME_ORDER.includes(stored) ? stored : "hit5");
  });
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
  const setGame = poolApi.setGame;

  useEffect(() => {
    if (boot.game) setGame(boot.game);
    // Apply the deep-linked national game once at startup.
  }, [setGame]);

  useEffect(() => {
    savePref("desk", desk);
    savePref("waGame", waGame);
    const params = new URLSearchParams();
    if (tab !== "board" && tab !== "recap") params.set("tab", tab);
    if (desk !== "national") params.set("desk", desk);
    if (game !== "powerball") params.set("game", game);
    if (waGame !== "hit5") params.set("wa", waGame);
    const search = params.toString();
    const path = tab === "recap" ? recapPath(window.location.pathname) : "/";
    const url =
      tab === "recap"
        ? path
        : `${path}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [tab, desk, game, waGame]);

  useEffect(() => {
    trackTab(tab);
  }, [tab]);

  useEffect(() => {
    document.documentElement.classList.add("has-recap-tab");
    if (isRecapPath(window.location.pathname)) setTab("recap");
    return () => document.documentElement.classList.remove("has-recap-tab");
  }, []);

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

  function goToDesk() {
    setTab("board");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToTickets() {
    setTab("tickets");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onGame(next: GameId) {
    poolApi.setGame(next);
    goToDesk();
  }

  function onWaGame(next: WaGameId) {
    setWaGame(next);
    goToTickets();
  }

  function onTickNational(next: GameId) {
    setDesk("national");
    onGame(next);
  }

  function onTickWashington(next: WaGameId) {
    setDesk("washington");
    onWaGame(next);
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
      <div className={tab === "board" ? "chrome is-desk" : "chrome"}>
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
                <span className="brand-name">JackpotDesk</span>
              </a>
            </h1>
            <p className="tag">
              The Ladder ranks every scanned board against measured history.
              Same hit odds as Quick Pick.
            </p>
          </div>
          <div className="masthead-tools">
            <MarketPicker
              desk={desk}
              game={game}
              waGame={waGame}
              onNational={onTickNational}
              onWashington={onTickWashington}
            />
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
          <button
            type="button"
            className={tab === "board" ? "on" : ""}
            aria-current={tab === "board" ? "page" : undefined}
            onClick={() => setTab("board")}
          >
            <img src={iconTickets} alt="" className="tab-icon wide" />
            Desk
          </button>
          <button
            type="button"
            className={tab === "recap" ? "on" : ""}
            aria-current={tab === "recap" ? "page" : undefined}
            onClick={() => setTab("recap")}
          >
            <span className="tab-icon tab-icon-recap" aria-hidden="true" />
            Recap
          </button>
          <button
            type="button"
            className={tab === "tickets" ? "on" : ""}
            aria-current={tab === "tickets" ? "page" : undefined}
            onClick={() => setTab("tickets")}
          >
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
          <button
            type="button"
            className={tab === "write" ? "on" : ""}
            aria-current={tab === "write" ? "page" : undefined}
            onClick={() => setTab("write")}
          >
            <span className="tab-full">Write the desk</span>
            <span className="tab-short">Write</span>
          </button>
        </nav>
      </div>

      {tab !== "recap" ? (
        <MarketTicker
          desk={desk}
          game={game}
          waGame={waGame}
          latestDate={latest?.date ?? null}
          onNational={onTickNational}
          onWashington={onTickWashington}
        />
      ) : null}

      <main>
      <Suspense fallback={<LazyTabFallback />}>
      {tab === "recap" ? (
        <RecapView pathname={window.location.pathname} />
      ) : null}

      {desk === "washington" &&
      tab !== "map" &&
      tab !== "board" &&
      tab !== "tickets" &&
      tab !== "write" &&
      tab !== "recap" ? (
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
            setTab("board");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      {tab === "map" ? (
        <MapView game={game} preferWa={desk === "washington"} />
      ) : null}

      {tab === "board" ? (
        <BoardView
          game={game}
          draws={draws}
          asOf={asOf}
          winnerError={winnerError}
          past={past}
          exclude={exclude}
          nextDrawDate={nextDrawDate}
          desk={desk}
          waGame={waGame}
          onGame={setGame}
          onDesk={setDesk}
          onWaGame={setWaGame}
          onAddToPool={onAddToPool}
        />
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

      {tab === "write" ? (
        <WriteView />
      ) : null}
      </Suspense>
      </main>

      <Footer
        onDeskTab={(next) => {
          setTab(next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <BackToTop />
    </div>
  );
}
