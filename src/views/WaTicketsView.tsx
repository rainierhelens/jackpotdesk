import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "../components/Ball";
import { FoilCard } from "../components/FoilCard";
import { PackFx, PackShell } from "../components/PackFx";
import { Playslip } from "../components/Playslip";
import { WaSlip } from "../components/WaSlip";
import { WaValue } from "../components/WaValue";
import { usePrefersReducedMotion } from "../lib/motion";
import { playPackOpen } from "../lib/sfx";
import {
  useWaDraws,
  waDrawsFor,
  waLatest,
  waPastKeys,
} from "../lib/waDraws";
import { waAvoid, waFrequency } from "../lib/waFrequency";
import { WA_GAMES } from "../lib/waGames";
import {
  DEFAULT_WA_FILTERS,
  formatWaPlay,
  generateWaPlays,
  waSlipCost,
  type WaPlay,
} from "../lib/waPicks";
import type { Pick3Way, WaFilters, WaGameId } from "../types";

type Props = {
  game: WaGameId;
};

const NO_NUMBERS: number[] = [];

function daysLabel(days: number): string {
  if (days <= 0) return "last draw";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function WaTicketsView({ game }: Props) {
  const spec = WA_GAMES[game];
  const { book, feed } = useWaDraws();
  const prizes = book.prizes;
  const [count, setCount] = useState(spec.pairSize ? "6" : "5");
  const [spotCount, setSpotCount] = useState(spec.whiteCount);
  const [stake, setStake] = useState(spec.minStake ?? 1);
  const [pick3Way, setPick3Way] = useState<Pick3Way>("straight");
  const [filters, setFilters] = useState<WaFilters>(DEFAULT_WA_FILTERS);
  const [tickets, setTickets] = useState<WaPlay[]>([]);
  const [rejected, setRejected] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [deal, setDeal] = useState(0);
  const [burst, setBurst] = useState(0);
  const [minting, setMinting] = useState(false);
  const [prizeDirty, setPrizeDirty] = useState(false);
  const [cashpot, setCashpot] = useState(String(prizes.hit5.cashpot));
  const [advertised, setAdvertised] = useState(String(prizes.lotto.advertised));
  const [cash, setCash] = useState(String(prizes.lotto.cash));
  const mintTimer = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  const whiteCount =
    spec.minCount != null
      ? Math.min(
          spec.maxCount ?? spec.whiteCount,
          Math.max(spec.minCount, spotCount),
        )
      : spec.whiteCount;

  const draws = useMemo(() => waDrawsFor(spec.id, book), [spec.id, book]);
  const latest = useMemo(() => waLatest(spec.id, book), [spec.id, book]);
  const lastNumbers = latest?.numbers ?? NO_NUMBERS;
  const past = useMemo(() => {
    if (spec.kind !== "digits") return waPastKeys(spec.id, false, book);
    const keys = new Set<string>();
    for (const draw of waDrawsFor(spec.id, book)) {
      keys.add(
        pick3Way === "box"
          ? [...draw.numbers].sort((a, b) => a - b).join("")
          : draw.numbers.join(""),
      );
    }
    return keys;
  }, [spec.id, spec.kind, pick3Way, book]);
  const minN = spec.kind === "digits" ? 0 : 1;
  const stats = useMemo(
    () => waFrequency(draws, minN, spec.kind === "digits" ? 9 : spec.whiteMax),
    [draws, minN, spec.kind, spec.whiteMax],
  );
  const avoid = useMemo(() => {
    if (spec.kind === "digits") {
      return waAvoid(
        { ...filters, hot: false, cold: false },
        stats,
        filters.lastDraw ? lastNumbers : [],
      );
    }
    return waAvoid(filters, stats, lastNumbers);
  }, [filters, stats, lastNumbers, spec.kind]);

  const asOf = book.asOf;
  const showBirthday = spec.kind === "matrix" && spec.whiteMax > 31 && spec.id !== "hit5";
  const showHighBall = spec.id === "hit5";
  const showMatrixPatterns = spec.kind !== "digits" && spec.kind !== "cashpop";

  useEffect(() => {
    setSpotCount(spec.whiteCount);
    setStake(spec.minStake ?? 1);
    setCount(spec.pairSize ? "6" : spec.kind === "cashpop" ? "3" : "5");
    setTickets([]);
    setMinting(false);
    window.clearTimeout(mintTimer.current);
  }, [spec.id, spec.whiteCount, spec.pairSize, spec.kind, spec.minStake]);

  useEffect(() => {
    if (prizeDirty) return;
    setCashpot(String(prizes.hit5.cashpot));
    setAdvertised(String(prizes.lotto.advertised));
    setCash(String(prizes.lotto.cash));
  }, [prizes, prizeDirty]);

  useEffect(() => () => window.clearTimeout(mintTimer.current), []);

  function toggle(key: keyof WaFilters) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function dealTickets(result: {
    tickets: WaPlay[];
    rejected: number;
    attempts: number;
  }) {
    setTickets(result.tickets);
    setRejected(result.rejected);
    setAttempts(result.attempts);
    setDeal((d) => d + 1);
  }

  function generate() {
    const raw = Math.min(50, Math.max(1, Number(count) || 1));
    const n =
      spec.kind === "cashpop"
        ? raw
        : spec.pairSize
          ? raw + (raw % spec.pairSize)
          : raw;
    const result = generateWaPlays(
      spec,
      whiteCount,
      n,
      spec.id === "match4" ? { ...filters, birthday: false, highBall: false } : filters,
      past,
      avoid,
      pick3Way,
    );
    window.clearTimeout(mintTimer.current);
    if (reducedMotion) {
      setMinting(false);
      dealTickets(result);
      return;
    }
    setBurst((b) => b + 1);
    playPackOpen(spec.id);
    setMinting(true);
    setTickets([]);
    mintTimer.current = window.setTimeout(() => {
      dealTickets(result);
      setMinting(false);
    }, 1080);
  }

  function copyAll() {
    const text = tickets
      .map((t) => formatWaPlay(t.numbers, spec.kind))
      .join("\n");
    void navigator.clipboard.writeText(text);
  }

  const filterNote =
    spec.kind === "digits"
      ? "Fade area codes, dates, doubles, and last night. Straight odds stay 1 in 1,000."
      : spec.kind === "cashpop"
        ? "Fade 1, 7, 11, 13, 15 and last night’s POP. Same 1-in-15 hit odds per number."
        : "Fade crowded public tickets. Same hit odds as Quick Pick.";

  return (
    <section className={`panel gen-panel is-wa is-${spec.id}`}>
      <WaValue
        game={spec.id}
        asOf={asOf}
        feed={feed}
        cashpot={cashpot}
        advertised={advertised}
        cash={cash}
        onCashpot={(v) => {
          setPrizeDirty(true);
          setCashpot(v);
        }}
        onAdvertised={(v) => {
          setPrizeDirty(true);
          setAdvertised(v);
        }}
        onCash={(v) => {
          setPrizeDirty(true);
          setCash(v);
        }}
      />

      <header className="gen-bar">
        <div>
          <p className="kicker">Washington · {spec.label}</p>
          <h2>Build the slip</h2>
        </div>
        <div className="actions">
          {spec.minCount != null ? (
            <label className="inline">
              {spec.kind === "keno" ? "Spots" : "POPs"}
              <input
                className="narrow"
                value={spotCount}
                onChange={(e) =>
                  setSpotCount(Number(e.target.value) || spec.whiteCount)
                }
                inputMode="numeric"
              />
            </label>
          ) : null}
          {spec.minStake != null ? (
            <label className="inline">
              Stake $
              <input
                className="narrow"
                value={stake}
                onChange={(e) => {
                  const v = Number(e.target.value) || 1;
                  setStake(
                    Math.min(spec.maxStake ?? 20, Math.max(spec.minStake ?? 1, v)),
                  );
                }}
                inputMode="numeric"
              />
            </label>
          ) : null}
          {spec.kind === "digits" ? (
            <label className="inline">
              Play
              <select
                value={pick3Way}
                onChange={(e) => setPick3Way(e.target.value as Pick3Way)}
              >
                <option value="straight">Straight</option>
                <option value="box">Box</option>
              </select>
            </label>
          ) : null}
          <label className="inline">
            {spec.pairSize ? "Plays" : spec.kind === "cashpop" ? "Tickets" : "Boards"}
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
        {spec.note} Same hit odds as Quick Pick.{" "}
        <a href="/lottery-lab.html">AI cannot beat Quick Pick</a>.
      </p>

      <div className="gen-layout">
        <div className="gen-left">
          <div
            className={`gen-arena is-${spec.id}${minting ? " is-minting" : ""}`}
          >
            <PackFx game={spec.id} burst={burst} />
            {minting ? (
              <div className="foil-mint">
                <PackShell game={spec.id} label={spec.label} opening />
              </div>
            ) : tickets.length > 0 ? (
              <div key={deal} className="foil-mint">
                <FoilCard shader game={spec.id} className="foil-hero">
                  <WaSlip
                    spec={spec}
                    tickets={tickets}
                    stake={stake}
                    pick3Way={pick3Way}
                  />
                </FoilCard>
              </div>
            ) : (
              <div className="foil-mint">
                <PackShell
                  game={spec.id}
                  label={spec.label}
                  onOpen={generate}
                />
              </div>
            )}
          </div>

          {tickets.length > 0 && !minting ? (
            <>
              <p className="fine gen-kept">
                Kept {tickets.length} after {attempts.toLocaleString("en-US")}{" "}
                draws ({rejected} crowded or duplicate skipped)
                {spec.pairSize
                  ? ` · ${Math.ceil(tickets.length / spec.pairSize)} dollars at the counter`
                  : ` · $${waSlipCost(spec, tickets, stake).toFixed(0)}`}
                .
              </p>
              <div className="actions gen-actions">
                <button type="button" onClick={copyAll}>
                  Copy numbers
                </button>
                <button type="button" onClick={() => window.print()}>
                  Print
                </button>
              </div>
              {tickets[0] && spec.kind !== "digits" ? (
                <Playslip
                  whites={tickets[0].numbers}
                  whiteMax={spec.whiteMax}
                />
              ) : null}
            </>
          ) : null}
        </div>

        <aside className="gen-side">
          <p className="fine">
            {filterNote} Hot/cold from {draws.length} official drawings
            {latest ? ` through ${latest.date}` : ""} ({feed} {asOf}).
          </p>
          {lastNumbers.length > 0 ? (
            <div className="temp-board">
              <article className="temp-card">
                <h3>Last draw</h3>
                <p className="fine">People replay these.</p>
                <div className={`ticket-row${lastNumbers.length > 10 ? " dense" : ""}`}>
                  {lastNumbers.map((n, i) => (
                    <Ball key={`last-${n}-${i}`} value={n} />
                  ))}
                </div>
              </article>
              {stats && spec.kind !== "digits" ? (
                <>
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
                </>
              ) : null}
            </div>
          ) : null}

          <div className="filters">
            {spec.kind !== "digits" ? (
              <label>
                <input
                  type="checkbox"
                  checked={filters.uniqueSlip}
                  onChange={() => toggle("uniqueSlip")}
                />
                {spec.pairSize
                  ? "No shared numbers on each $1 pair"
                  : "No repeated numbers on this slip"}
              </label>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={filters.lastDraw}
                onChange={() => toggle("lastDraw")}
                disabled={!lastNumbers.length}
              />
              Last drawing
            </label>
            {showHighBall ? (
              <label>
                <input
                  type="checkbox"
                  checked={filters.highBall}
                  onChange={() => toggle("highBall")}
                />
                All five in 1–31 (no 32–42)
              </label>
            ) : null}
            {showBirthday ? (
              <label>
                <input
                  type="checkbox"
                  checked={filters.birthday}
                  onChange={() => toggle("birthday")}
                />
                All numbers in 1–31
              </label>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={filters.sequence}
                onChange={() => toggle("sequence")}
              />
              {spec.kind === "digits"
                ? "Triples / straight runs"
                : spec.kind === "keno"
                  ? "Consecutive clusters"
                  : "Straight runs / 4+ consecutives"}
            </label>
            {spec.kind === "digits" ? (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.doubles}
                    onChange={() => toggle("doubles")}
                  />
                  Doubles (any two the same)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.areaCodes}
                    onChange={() => toggle("areaCodes")}
                  />
                  WA area codes (206 / 253 / 360 / 425 / 509 / 564)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.dates}
                    onChange={() => toggle("dates")}
                  />
                  Dates and years
                </label>
              </>
            ) : null}
            {showMatrixPatterns ? (
              <>
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
                  {spec.kind === "keno"
                    ? "One column on the 80-card"
                    : "Playslip row / column / diagonal"}
                </label>
              </>
            ) : null}
            {spec.kind === "keno" ? (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.decade}
                    onChange={() => toggle("decade")}
                  />
                  One decade / one row
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.lowHalf}
                    onChange={() => toggle("lowHalf")}
                  />
                  All in 1–40
                </label>
              </>
            ) : null}
            {spec.kind === "cashpop" ? (
              <label>
                <input
                  type="checkbox"
                  checked={filters.luckyPops}
                  onChange={() => toggle("luckyPops")}
                />
                Lucky POPs (1, 7, 11, 13, 15)
              </label>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={filters.previous}
                onChange={() => toggle("previous")}
              />
              Recent official winners
            </label>
            {spec.kind !== "digits" ? (
              <>
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
              </>
            ) : null}
          </div>
          <p className="fine temp-note">
            Past results do not predict the next drawing. We skip crowded public
            tickets so a hit is less likely to be shared, not so you hit more
            often. Source: Washington’s Lottery past drawings, {feed} {asOf}.
          </p>
        </aside>
      </div>
      {tickets.length > 0 && !minting ? (
        <section className="print-sheet" aria-hidden="true">
          <header>
            <p>JackpotDesk · Washington · {spec.label}</p>
            <h1>Counter slip</h1>
            <p>
              Mark these boards at the counter. {tickets.length} play
              {tickets.length === 1 ? "" : "s"}
              {spec.kind === "digits" ? ` · ${pick3Way}` : ""} · $
              {waSlipCost(spec, tickets, stake).toFixed(2)}. Same hit odds as
              Quick Pick.
            </p>
          </header>
          <ol>
            {tickets.map((ticket, i) => (
              <li key={ticket.id}>
                <p>
                  Play {i + 1}: {formatWaPlay(ticket.numbers, spec.kind)}
                </p>
                {spec.kind !== "digits" ? (
                  <Playslip
                    whites={ticket.numbers}
                    whiteMax={spec.whiteMax}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
