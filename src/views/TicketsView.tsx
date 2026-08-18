import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "../components/Ball";
import { FeedMark } from "../components/FeedMark";
import { FoilCard } from "../components/FoilCard";
import { LotteryTicket } from "../components/LotteryTicket";
import { NumberPool, type PoolFade } from "../components/NumberPool";
import { PackFx, PackShell } from "../components/PackFx";
import { Playslip } from "../components/Playslip";
import { PrintSlip } from "../components/PrintSlip";
import { avoidWhites, frequencyStats } from "../lib/frequency";
import { usePrefersReducedMotion } from "../lib/motion";
import { DEFAULT_FILTERS, formatTicket, generateTickets } from "../lib/picks";
import { loadPref, savePref } from "../lib/prefs";
import { usePoolReport } from "../lib/usePoolReport";
import { GAMES } from "../lib/prizes";
import { playPackOpen } from "../lib/sfx";
import { saveSlipImage } from "../lib/slipImage";
import type { Filters, GameId, Ticket } from "../types";
import {
  FORMAT_START,
  RECENT_WINNER_LIMIT,
  type OfficialDraw,
} from "../lib/winners";

type Props = {
  game: GameId;
  past: Set<string>;
  draws: OfficialDraw[];
  asOf: string | null;
  winnerError: string | null;
  exclude: Set<string>;
  nextDrawDate: string | null;
  onAddToPool: (tickets: Ticket[]) => void;
};

function daysLabel(days: number): string {
  if (days <= 0) return "last draw";
  return `${days} day${days === 1 ? "" : "s"}`;
}

function ticketDrawLabel(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  const wk = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
  return `${wk.toUpperCase()} ${m}/${d}/${y.slice(2)}`;
}

export function TicketsView({
  game,
  past,
  draws,
  asOf,
  winnerError,
  exclude,
  nextDrawDate,
  onAddToPool,
}: Props) {
  const spec = GAMES[game];
  const [count, setCount] = useState("5");
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    ...loadPref<Partial<Filters>>("filters.national", {}),
  }));
  const [fadesOpen, setFadesOpen] = useState(() =>
    loadPref("fold.fades", true),
  );
  const [crowdOpen, setCrowdOpen] = useState(() =>
    loadPref("fold.crowd", false),
  );
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [rejected, setRejected] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [deal, setDeal] = useState(0);
  const [burst, setBurst] = useState(0);
  const [minting, setMinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const mintTimer = useRef<number>(0);
  const reducedMotion = usePrefersReducedMotion();

  const lastWhites = draws[0]?.whites;
  const stats = useMemo(
    () => frequencyStats(draws, spec.whiteMax),
    [draws, spec.whiteMax],
  );
  const avoid = useMemo(
    () => avoidWhites(filters, stats, lastWhites ?? []),
    [filters, stats, lastWhites],
  );
  const poolRequest = useMemo(
    () => ({ kind: "national" as const, spec, filters, past, avoid }),
    [spec, filters, past, avoid],
  );
  const poolReport = usePoolReport(poolRequest);

  useEffect(() => {
    savePref("filters.national", filters);
  }, [filters]);
  const poolFades = useMemo<PoolFade[]>(() => {
    const fades: PoolFade[] = [];
    if (filters.lastDraw && lastWhites?.length) {
      fades.push({
        key: "last",
        label: "Last drawing",
        tone: "last",
        numbers: lastWhites,
      });
    }
    if (stats && filters.hot) {
      fades.push({
        key: "hot",
        label: "Hot (recently drawn)",
        tone: "hot",
        numbers: stats.hot,
      });
    }
    if (stats && filters.cold) {
      fades.push({
        key: "cold",
        label: "Cold (long gaps)",
        tone: "cold",
        numbers: stats.cold,
      });
      if (stats.overdue) {
        fades.push({
          key: "overdue",
          label: "Most overdue",
          tone: "overdue",
          numbers: [stats.overdue.n],
        });
      }
    }
    return fades;
  }, [filters, stats, lastWhites]);

  const fadesTotal = Object.keys(filters).length;
  const fadesOn = Object.values(filters).filter(Boolean).length;

  function toggle(key: keyof Filters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function dealTickets(result: {
    tickets: Ticket[];
    rejected: number;
    attempts: number;
  }) {
    setTickets(result.tickets);
    setRejected(result.rejected);
    setAttempts(result.attempts);
    setDeal((d) => d + 1);
  }

  function generate() {
    const n = Math.min(50, Math.max(1, Number(count) || 1));
    const result = generateTickets(spec, n, filters, past, exclude, avoid);
    window.clearTimeout(mintTimer.current);
    if (reducedMotion) {
      setMinting(false);
      dealTickets(result);
      return;
    }
    setBurst((n) => n + 1);
    playPackOpen(game);
    setMinting(true);
    setTickets([]);
    mintTimer.current = window.setTimeout(() => {
      dealTickets(result);
      setMinting(false);
    }, 1080);
  }

  useEffect(() => () => window.clearTimeout(mintTimer.current), []);

  function copyAll() {
    const text = tickets
      .map((t) => formatTicket(t, spec.extraLabel))
      .join("\n");
    void navigator.clipboard.writeText(text);
  }

  async function saveImage() {
    if (saving || tickets.length === 0) return;
    setSaving(true);
    try {
      await saveSlipImage({
        game,
        tickets,
        drawLabel: ticketDrawLabel(nextDrawDate),
      });
    } catch {
      // Share cancel is handled inside saveSlipImage.
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`panel gen-panel is-${game}`}>
      <header className="gen-bar">
        <div>
          <p className="kicker">{spec.label}</p>
          <h2>Build the slip</h2>
        </div>
        <div className="actions">
          <label className="inline">
            Boards
            <input
              className="narrow"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className={`primary gen-go${minting ? " minting" : ""}`}
            onClick={generate}
            disabled={minting}
            aria-busy={minting}
          >
            {minting ? "Opening…" : "Generate Now"}
          </button>
        </div>
      </header>
      <p className="gen-tag">
        Same hit odds as Quick Pick. Unique boards if you win. {spec.ticketCost}{" "}
        a play.{" "}
        <a href="/lottery-lab.html">AI cannot beat Quick Pick</a>.
      </p>

      <div className="gen-layout">
        <div className="gen-left">
          <div className={`gen-arena is-${game}${minting ? " is-minting" : ""}`}>
            <PackFx game={game} burst={burst} />
            {minting ? (
              <div className="foil-mint">
                <PackShell game={game} opening />
              </div>
            ) : tickets.length > 0 ? (
              <div key={deal} className="foil-mint">
                <FoilCard shader game={game} className="foil-hero">
                  <LotteryTicket
                    game={game}
                    tickets={tickets}
                    drawLabel={ticketDrawLabel(nextDrawDate)}
                  />
                </FoilCard>
              </div>
            ) : (
              <div className="foil-mint">
                <PackShell game={game} onOpen={generate} />
              </div>
            )}
          </div>

          {tickets.length > 0 && !minting ? (
            <>
              <p className="fine gen-kept">
                Kept {tickets.length} after{" "}
                {attempts.toLocaleString("en-US")} draws ({rejected} crowded or
                duplicate skipped).
              </p>
              <div className="actions gen-actions">
                <button type="button" onClick={copyAll}>
                  Copy numbers
                </button>
                <button type="button" onClick={() => window.print()}>
                  Print playslip
                </button>
                <button
                  type="button"
                  onClick={() => void saveImage()}
                  disabled={saving}
                  title="On iPhone, choose Save Image to add it to Photos"
                >
                  {saving ? "Saving…" : "Save image"}
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onAddToPool(tickets)}
                >
                  Add to pool
                </button>
              </div>
              {tickets[0] ? (
                <Playslip
                  whites={tickets[0].whites}
                  whiteMax={spec.whiteMax}
                  extra={tickets[0].extra}
                  extraMax={spec.extraMax}
                />
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="gen-side">
          {winnerError ? (
            <p className="warn">
              {winnerError}. Previous-winner and hot/cold filters are skipped
              until the feed loads.
            </p>
          ) : null}

          {poolReport ? (
            <NumberPool
              min={1}
              max={spec.whiteMax}
              report={poolReport}
              fades={poolFades}
              noun="white-ball boards"
              oddsText={`1 in ${spec.jackpotOdds.toLocaleString("en-US")} for the jackpot`}
              note={`White balls only; no fade touches the ${spec.extraLabel}.`}
            />
          ) : null}

          <details
            className="gen-fold"
            open={fadesOpen}
            onToggle={(e) => {
              const next = e.currentTarget.open;
              setFadesOpen(next);
              savePref("fold.fades", next);
            }}
          >
            <summary>
              <span className="fold-title">Fade criteria</span>
              <span className="fold-meta">
                {fadesOn} of {fadesTotal} on
              </span>
            </summary>
            <div className="fold-body">
              <div className="filters">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.uniqueSlip}
                    onChange={() => toggle("uniqueSlip")}
                  />
                  No repeated whites on this slip
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.lastDraw}
                    onChange={() => toggle("lastDraw")}
                    disabled={!lastWhites?.length}
                  />
                  Last drawing’s whites
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.birthday}
                    onChange={() => toggle("birthday")}
                  />
                  All five whites in 1–31
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.sequence}
                    onChange={() => toggle("sequence")}
                  />
                  Straight runs / 4+ consecutives
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.multiples}
                    onChange={() => toggle("multiples")}
                  />
                  Multiples patterns
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.visual}
                    onChange={() => toggle("visual")}
                  />
                  Playslip row / column / diagonal
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.previous}
                    onChange={() => toggle("previous")}
                  />
                  Recent official winners
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.hot}
                    onChange={() => toggle("hot")}
                    disabled={!stats}
                  />
                  Recently drawn (hot)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.cold}
                    onChange={() => toggle("cold")}
                    disabled={!stats}
                  />
                  Long gaps and overdue
                </label>
              </div>
              <p className="fine temp-note">
                Past results do not predict the next drawing. We skip these so
                you are less likely to share a hit, not so you hit more often.
                Last {RECENT_WINNER_LIMIT} official white sets
                {past.size ? ` (${past.size} loaded)` : ""}.{" "}
                {asOf ? (
                  <>
                    <FeedMark feed="live" /> · NY Open Data.
                  </>
                ) : null}
              </p>
            </div>
          </details>

          {stats ? (
            <details
              className="gen-fold"
              open={crowdOpen}
              onToggle={(e) => {
                const next = e.currentTarget.open;
                setCrowdOpen(next);
                savePref("fold.crowd", next);
              }}
            >
              <summary>
                <span className="fold-title">Crowd board</span>
                <span className="fold-meta">last · hot · cold · overdue</span>
              </summary>
              <div className="fold-body">
                <p className="fine">
                  Hot/cold from {stats.window.toLocaleString("en-US")} drawings
                  since {FORMAT_START[game]}
                  {asOf ? ` through ${asOf}` : ""}.{" "}
                  {asOf ? (
                    <>
                      <FeedMark feed="live" /> · NY Open Data.
                    </>
                  ) : (
                    "Source: NY Open Data."
                  )}
                </p>
                <div className="temp-board">
                  <article className="temp-card">
                    <h3>Last draw</h3>
                <p className="fine">People replay these whites.</p>
                <div className="ticket-row">
                  {lastWhites && lastWhites.length > 0 ? (
                    lastWhites.map((n) => (
                      <Ball key={`last-${n}`} value={n} />
                    ))
                  ) : (
                    <span className="fine">None yet</span>
                  )}
                </div>
              </article>
              <article className="temp-card">
                <h3>Hot</h3>
                <p className="fine">Recently drawn. The public chases these.</p>
                <div className="ticket-row">
                  {stats.hot.map((n) => (
                    <Ball key={`hot-${n}`} value={n} tone="hot" />
                  ))}
                </div>
              </article>
              <article className="temp-card">
                <h3>Cold</h3>
                <p className="fine">Longest gaps. Still random.</p>
                <div className="ticket-row">
                  {stats.cold.map((n) => (
                    <Ball key={`cold-${n}`} value={n} tone="cold" />
                  ))}
                </div>
              </article>
              <article className="temp-card">
                <h3>Most overdue</h3>
                <p className="fine">Above-median frequency, missing 30+ days.</p>
                <div className="ticket-row">
                  {stats.overdue ? (
                    <>
                      <Ball value={stats.overdue.n} tone="overdue" />
                      <span className="temp-meta">
                        {daysLabel(stats.overdue.days)}
                      </span>
                    </>
                  ) : (
                    <span className="fine">None</span>
                  )}
                </div>
              </article>
                </div>
              </div>
            </details>
          ) : null}
        </aside>
      </div>
      {tickets.length > 0 && !minting ? (
        <PrintSlip game={game} tickets={tickets} title="Counter slip" />
      ) : null}
    </section>
  );
}
