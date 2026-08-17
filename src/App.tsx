import { useEffect, useMemo, useState } from "react";
import type { GameId, Ticket } from "./types";
import { AdSlot } from "./components/AdSlot";
import { Faq } from "./components/Faq";
import { GameSwitch } from "./components/GameSwitch";
import { WhyMethod } from "./components/WhyMethod";
import { comboKey } from "./lib/picks";
import { usePool } from "./lib/usePool";
import { fetchRecentWinners } from "./lib/winners";
import { PoolView } from "./views/PoolView";
import { TicketsView } from "./views/TicketsView";
import { WeekView } from "./views/WeekView";

type Tab = "week" | "tickets" | "pool";

export default function App() {
  const poolApi = usePool();
  const [tab, setTab] = useState<Tab>("week");
  const [advertised, setAdvertised] = useState("400M");
  const [cash, setCash] = useState("184M");
  const [sold, setSold] = useState("120M");
  const [federal, setFederal] = useState("37");
  const [state, setState] = useState("5");
  const [humanShare, setHumanShare] = useState("20");
  const [past, setPast] = useState<Set<string>>(new Set());
  const [asOf, setAsOf] = useState<string | null>(null);
  const [winnerError, setWinnerError] = useState<string | null>(null);

  const game = poolApi.pool.game;

  useEffect(() => {
    let cancelled = false;
    setWinnerError(null);
    fetchRecentWinners(game)
      .then((result) => {
        if (cancelled) return;
        setPast(result.keys);
        setAsOf(result.asOf);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPast(new Set());
        setAsOf(null);
        setWinnerError(err instanceof Error ? err.message : "Winner feed failed");
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

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

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-row">
          <div>
            <h1 className="brand">JackpotDesk</h1>
            <p className="tag">
              Same hit odds as Quick Pick. Better ticket if you actually win.
              A line on whether this drawing is even worth the $2.
            </p>
          </div>
          <GameSwitch game={game} onGame={onGame} />
        </div>
      </header>

      <nav className="tabs" aria-label="Primary">
        <button
          type="button"
          className={tab === "week" ? "on" : ""}
          onClick={() => setTab("week")}
        >
          This week
        </button>
        <button
          type="button"
          className={tab === "tickets" ? "on" : ""}
          onClick={() => setTab("tickets")}
        >
          Tickets
        </button>
        <button
          type="button"
          className={tab === "pool" ? "on" : ""}
          onClick={() => setTab("pool")}
        >
          Pool
        </button>
      </nav>

      <AdSlot slot="top" format="leaderboard" />

      <WhyMethod />

      <main>

      {tab === "week" ? (
        <WeekView
          game={game}
          advertised={advertised}
          cash={cash}
          sold={sold}
          federal={federal}
          state={state}
          humanShare={humanShare}
          onAdvertised={setAdvertised}
          onCash={setCash}
          onSold={setSold}
          onFederal={setFederal}
          onState={setState}
          onHumanShare={setHumanShare}
        />
      ) : null}

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
          setName={poolApi.setName}
          addMember={poolApi.addMember}
          updateMember={poolApi.updateMember}
          removeMember={poolApi.removeMember}
          removeTicket={poolApi.removeTicket}
          mintTickets={poolApi.mintTickets}
          reset={poolApi.reset}
        />
      ) : null}
      </main>

      <AdSlot slot="mid" format="rectangle" />
      <Faq />
      <AdSlot slot="footer" format="leaderboard" />

      <footer className="colophon">
        <p>
          JackpotDesk does not improve your chance of winning. Every legal
          combination is equal. The benefit is fewer jackpot splits and a clear
          pass on bad drawings. Not financial, tax, or gambling advice. Confirm
          cash value and tax with official sources before anyone spends money.
        </p>
        <p>
          <a href="/privacy.html">Privacy</a>
          {" · "}
          <a href="#faq">FAQ</a>
          {" · "}
          <a href="https://jackpotdesk.com/">jackpotdesk.com</a>
        </p>
      </footer>
    </div>
  );
}
