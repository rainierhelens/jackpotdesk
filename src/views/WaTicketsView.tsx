import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "../components/Ball";
import { WaCrowdIndex } from "../components/CrowdIndex";
import { FoilCard } from "../components/FoilCard";
import { NumberPool, type PoolFade } from "../components/NumberPool";
import { PackFx, PackShell } from "../components/PackFx";
import { Playslip } from "../components/Playslip";
import { WaSlip } from "../components/WaSlip";
import { FeedMark } from "../components/FeedMark";
import { WaValue } from "../components/WaValue";
import { usePrefersReducedMotion } from "../lib/motion";
import { buildPatternModel, patternPickTickets } from "../lib/patternLab";
import { PatternLadder } from "../components/PatternLadder";
import { PatternReport } from "../components/PatternReport";
import {
  deskPickWaPlays,
  waCrowdReading,
  waPopularityModel,
} from "../lib/popularity";
import { loadPref, savePref } from "../lib/prefs";
import { playPackOpen } from "../lib/sfx";
import { usePoolReport } from "../lib/usePoolReport";
import { saveWaSlipImage } from "../lib/slipImage";
import {
  useWaDraws,
  waDrawsFor,
  waLatest,
  waPastKeys,
} from "../lib/waDraws";
import { waAvoid, waFrequency } from "../lib/waFrequency";
import { CASH_POP_CROWDED, WA_GAMES } from "../lib/waGames";
import {
  DEFAULT_WA_FILTERS,
  formatWaPlay,
  generateWaPlays,
  waSlipCost,
  type WaPlay,
} from "../lib/waPicks";
import type { WaFilters, WaGameId } from "../types";

type MintMode = "quick" | "desk" | "pattern" | "ladder";

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
  const [mode, setMode] = useState<MintMode>(() =>
    loadPref<MintMode>("mintMode", "ladder"),
  );
  const [dealtMode, setDealtMode] = useState<MintMode>("quick");
  const [filters, setFilters] = useState<WaFilters>(() => ({
    ...DEFAULT_WA_FILTERS,
    ...loadPref<Partial<WaFilters>>("filters.wa", {}),
  }));
  const [fadesOpen, setFadesOpen] = useState(() =>
    loadPref("fold.fades", true),
  );
  const [crowdOpen, setCrowdOpen] = useState(() =>
    loadPref("fold.crowd", false),
  );
  const [tickets, setTickets] = useState<WaPlay[]>([]);
  const [rejected, setRejected] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [deal, setDeal] = useState(0);
  const [burst, setBurst] = useState(0);
  const [minting, setMinting] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const past = useMemo(() => waPastKeys(spec.id, book), [spec.id, book]);
  const stats = useMemo(
    () => waFrequency(draws, 1, spec.whiteMax),
    [draws, spec.whiteMax],
  );
  const avoid = useMemo(
    () => waAvoid(filters, stats, lastNumbers),
    [filters, stats, lastNumbers],
  );
  const patternModel = useMemo(
    () =>
      buildPatternModel(
        draws.map((d) => ({ numbers: d.numbers })),
        spec.whiteMax,
      ),
    [draws, spec.whiteMax],
  );

  const effectiveFilters = useMemo(() => {
    if (spec.id === "match4") {
      return { ...filters, birthday: false, highBall: false };
    }
    // Every 1–15 POP has hit in past drawings, so this fade would empty the game.
    if (spec.kind === "cashpop") return { ...filters, previous: false };
    return filters;
  }, [spec.id, spec.kind, filters]);
  const poolRequest = useMemo(
    () => ({
      kind: "wa" as const,
      spec,
      whiteCount,
      filters: effectiveFilters,
      past,
      avoid,
    }),
    [spec, whiteCount, effectiveFilters, past, avoid],
  );
  const poolReport = usePoolReport(poolRequest);

  useEffect(() => {
    savePref("filters.wa", filters);
  }, [filters]);
  const poolFades = useMemo<PoolFade[]>(() => {
    const fades: PoolFade[] = [];
    if (filters.lastDraw && lastNumbers.length > 0) {
      fades.push({
        key: "last",
        label: "Last drawing",
        tone: "last",
        numbers: lastNumbers,
      });
    }
    if (stats) {
      if (filters.hot) {
        fades.push({
          key: "hot",
          label: "Hot (recently drawn)",
          tone: "hot",
          numbers: stats.hot,
        });
      }
      if (filters.cold) {
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
    }
    if (spec.kind === "cashpop" && filters.luckyPops) {
      fades.push({
        key: "luckyPops",
        label: "Lucky POPs",
        tone: "crowd",
        numbers: CASH_POP_CROWDED,
      });
    }
    return fades;
  }, [filters, stats, lastNumbers, spec.kind]);
  const poolNoun = spec.kind === "cashpop" ? "POP picks" : "boards";
  const poolOdds =
    spec.kind === "matrix"
      ? `1 in ${spec.jackpotOdds.toLocaleString("en-US")} for the top prize`
      : null;

  const asOf = book.asOf;
  const showBirthday = spec.kind === "matrix" && spec.whiteMax > 31 && spec.id !== "hit5";
  const showHighBall = spec.id === "hit5";
  const showMatrixPatterns = spec.kind !== "cashpop";

  const visibleFadeKeys: (keyof WaFilters)[] = [
    "uniqueSlip",
    "lastDraw",
    ...(showHighBall ? (["highBall"] as const) : []),
    ...(showBirthday ? (["birthday"] as const) : []),
    "sequence",
    ...(showMatrixPatterns ? (["multiples", "visual"] as const) : []),
    ...(spec.kind === "cashpop" ? (["luckyPops"] as const) : []),
    ...(spec.kind !== "cashpop" ? (["previous"] as const) : []),
    "hot",
    "cold",
  ];
  const fadesOn = visibleFadeKeys.filter((key) => filters[key]).length;

  useEffect(() => {
    setSpotCount(spec.whiteCount);
    setCount(spec.pairSize ? "6" : spec.kind === "cashpop" ? "3" : "5");
    setTickets([]);
    setMinting(false);
    window.clearTimeout(mintTimer.current);
  }, [spec.id, spec.whiteCount, spec.pairSize, spec.kind]);

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

  function pickMode(next: MintMode) {
    setMode(next);
    savePref("mintMode", next);
  }

  function generate() {
    const raw = Math.min(50, Math.max(1, Number(count) || 1));
    const n =
      spec.kind === "cashpop"
        ? raw
        : spec.pairSize
          ? raw + (raw % spec.pairSize)
          : raw;
    let result: { tickets: WaPlay[]; attempts: number; rejected: number };
    let dealt: MintMode = "quick";
    if (mode === "pattern" && patternModel) {
      const lab = patternPickTickets(
        patternModel,
        whiteCount,
        n,
        spec.pairSize ?? 1,
      );
      result = {
        tickets: lab.tickets.map((t) => ({ id: t.id, numbers: t.numbers })),
        attempts: lab.scanned,
        rejected: 0,
      };
      dealt = "pattern";
    } else {
      const desk =
        mode === "desk"
          ? deskPickWaPlays(spec, whiteCount, n, effectiveFilters, past, avoid)
          : null;
      if (desk) {
        result = { tickets: desk.tickets, attempts: desk.scanned, rejected: 0 };
        dealt = "desk";
      } else {
        result = generateWaPlays(
          spec,
          whiteCount,
          n,
          effectiveFilters,
          past,
          avoid,
        );
      }
    }
    setDealtMode(dealt);
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
    const text = tickets.map((t) => formatWaPlay(t.numbers)).join("\n");
    void navigator.clipboard.writeText(text);
  }

  async function saveImage() {
    if (saving || tickets.length === 0) return;
    setSaving(true);
    try {
      await saveWaSlipImage({
        game: spec.id,
        tickets,
        drawLabel: latest?.date ?? asOf,
      });
    } catch {
      // Share cancel is handled inside saveWaSlipImage.
    } finally {
      setSaving(false);
    }
  }

  const filterNote =
    spec.kind === "cashpop"
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
          <h2>{mode === "ladder" ? "The Ladder" : "Build the slip"}</h2>
        </div>
        <div className="actions">
          {waPopularityModel(spec.id) || patternModel ? (
            <div className="mode-switch" role="group" aria-label="Mint mode">
              {patternModel ? (
                <button
                  type="button"
                  className={mode === "ladder" ? "is-on" : ""}
                  onClick={() => pickMode("ladder")}
                >
                  Ladder
                </button>
              ) : null}
              {patternModel ? (
                <button
                  type="button"
                  className={mode === "pattern" ? "is-on" : ""}
                  onClick={() => pickMode("pattern")}
                >
                  Pattern lab
                </button>
              ) : null}
              {waPopularityModel(spec.id) ? (
                <button
                  type="button"
                  className={mode === "desk" ? "is-on" : ""}
                  onClick={() => pickMode("desk")}
                >
                  Desk pick
                </button>
              ) : null}
              <button
                type="button"
                className={mode === "quick" ? "is-on" : ""}
                onClick={() => pickMode("quick")}
              >
                Quick mint
              </button>
            </div>
          ) : null}
          {mode !== "ladder" ? (
            <>
              {spec.minCount != null ? (
                <label className="inline">
                  POPs
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
            </>
          ) : null}
        </div>
      </header>
      <p className="gen-tag">
        {mode === "ladder"
          ? "The ladder ranks the scanned field by pattern score, best first — a scored replay of the past, not a forecast. Every board keeps identical hit odds. "
          : mode === "pattern"
            ? "Pattern lab leans into historical frequencies, pairs, and winning shapes — statistical pattern exploration for entertainment. Past frequency does not change future odds; same hit odds as Quick Pick. "
            : mode === "desk"
              ? "Desk pick mines the measured pick rates for the least-crowded boards in the game — same hit odds, smallest expected split if you hit. "
              : `${spec.note} Same hit odds as Quick Pick. `}
        <a href="/lottery-lab.html">AI cannot beat Quick Pick</a>.
      </p>

      <div className={`gen-layout${mode === "ladder" ? " is-ladder" : ""}`}>
        <div className="gen-left">
          {mode === "ladder" && patternModel ? (
            <PatternLadder
              model={patternModel}
              size={whiteCount}
              source="Washington’s Lottery"
              renderTile={(entry) => (
                <FoilCard game={spec.id}>
                  <WaSlip
                    spec={spec}
                    tickets={[
                      { id: `ladder-${entry.rank}`, numbers: entry.numbers },
                    ]}
                  />
                </FoilCard>
              )}
              crowd={(entry) => waCrowdReading(spec.id, entry.numbers)}
            />
          ) : (
            <>
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
                  <WaSlip spec={spec} tickets={tickets} />
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
                {dealtMode === "pattern"
                  ? `Pattern lab · scored ${attempts.toLocaleString("en-US")} candidates, kept the ${tickets.length} highest-weighted`
                  : dealtMode === "desk"
                    ? `Desk pick · scanned ${attempts.toLocaleString("en-US")} boards that cleared the fades and kept the ${tickets.length} least-crowded`
                    : `Kept ${tickets.length} after ${attempts.toLocaleString("en-US")} draws (${rejected} crowded or duplicate skipped)`}
                {spec.pairSize
                  ? ` · ${Math.ceil(tickets.length / spec.pairSize)} dollars at the counter`
                  : ` · $${waSlipCost(spec, tickets).toFixed(0)}`}
                .
              </p>
              <div className="actions gen-actions">
                <button type="button" onClick={copyAll}>
                  Copy numbers
                </button>
                <button type="button" onClick={() => window.print()}>
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => void saveImage()}
                  disabled={saving}
                  title="On iPhone, choose Save Image to add it to Photos"
                >
                  {saving ? "Saving…" : "Save image"}
                </button>
              </div>
              {dealtMode === "pattern" ? (
                <PatternReport
                  model={patternModel}
                  tickets={tickets}
                  labelFor={
                    spec.kind === "cashpop"
                      ? (i) => `POP ${i + 1}`
                      : undefined
                  }
                  source="Washington’s Lottery"
                />
              ) : null}
              <WaCrowdIndex spec={spec} tickets={tickets} />
              {tickets[0] ? (
                <Playslip
                  whites={tickets[0].numbers}
                  whiteMax={spec.whiteMax}
                />
              ) : null}
            </>
          ) : null}
            </>
          )}
        </div>

        <aside className="gen-side">
          {poolReport ? (
            <NumberPool
              min={1}
              max={spec.whiteMax}
              report={poolReport}
              fades={poolFades}
              noun={poolNoun}
              oddsText={poolOdds}
              heat={waPopularityModel(spec.id)?.white ?? null}
              heatSource="Washington winner counts"
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
                {fadesOn} of {visibleFadeKeys.length} on
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
                  {spec.pairSize
                    ? "No shared numbers on each $1 pair"
                    : "No repeated numbers on this slip"}
                </label>
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
                  Straight runs / 4+ consecutives
                </label>
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
                      Playslip row / column / diagonal
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
                {spec.kind !== "cashpop" ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.previous}
                      onChange={() => toggle("previous")}
                    />
                    Recent official winners
                  </label>
                ) : null}
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
                Past results do not predict the next drawing. We skip crowded
                public tickets so a hit is less likely to be shared, not so you
                hit more often. Source: Washington’s Lottery past drawings,{" "}
                <FeedMark feed={feed} /> {asOf}.
              </p>
            </div>
          </details>

          {lastNumbers.length > 0 ? (
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
                <span className="fold-meta">
                  {stats ? "last · hot · cold · overdue" : "last draw"}
                </span>
              </summary>
              <div className="fold-body">
                <p className="fine">
                  {filterNote} Hot/cold from {draws.length} official drawings
                  {latest ? ` through ${latest.date}` : ""} (
                  <FeedMark feed={feed} /> {asOf}).
                </p>
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
              {stats ? (
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
              </div>
            </details>
          ) : null}
        </aside>
      </div>
      {tickets.length > 0 && !minting ? (
        <section className="print-sheet" aria-hidden="true">
          <header>
            <p>JackpotDesk · Washington · {spec.label}</p>
            <h1>Counter slip</h1>
            <p>
              Mark these boards at the counter. {tickets.length} play
              {tickets.length === 1 ? "" : "s"} · $
              {waSlipCost(spec, tickets).toFixed(2)}. Same hit odds as Quick
              Pick.
            </p>
          </header>
          <ol>
            {tickets.map((ticket, i) => (
              <li key={ticket.id}>
                <p>
                  Play {i + 1}: {formatWaPlay(ticket.numbers)}
                </p>
                <Playslip whites={ticket.numbers} whiteMax={spec.whiteMax} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
