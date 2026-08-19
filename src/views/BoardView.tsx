import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "../components/Ball";
import { CrowdIndex, WaCrowdIndex } from "../components/CrowdIndex";
import { FeedMark } from "../components/FeedMark";
import { FoilCard } from "../components/FoilCard";
import { PackFx, PackShell } from "../components/PackFx";
import { HeatDrawMap } from "../components/HeatDrawMap";
import { HeatGrid } from "../components/HeatGrid";
import { HeatPairs } from "../components/HeatPairs";
import { LotteryTicket } from "../components/LotteryTicket";
import { NumberPool, type PoolFade } from "../components/NumberPool";
import { PatternLadder } from "../components/PatternLadder";
import { PatternFadesToggle, PatternReport } from "../components/PatternReport";
import { Playslip } from "../components/Playslip";
import { PrintSlip } from "../components/PrintSlip";
import { MapFilters, RangeSlider } from "../components/RangeSlider";
import { WaSlip } from "../components/WaSlip";
import { WaValue } from "../components/WaValue";
import { avoidWhites, frequencyStats } from "../lib/frequency";
import { saveHeatGridPng } from "../lib/heatExport";
import {
  HEAT_SHIFT_PANE,
  heatBookFromDraws,
  heatDrawRows,
  heatPairs,
  mintFromHeat,
  nationalHeatSpec,
  shiftMax,
  sliceHeatDraws,
  sliceShiftDraws,
  ticketFromTray,
  waHeatSpec,
  waToOfficial,
  type HeatCell,
  type HeatColorMode,
  type HeatPreset,
  type HeatViewId,
  type HeatWindow,
} from "../lib/lotteryHeat";
import { usePrefersReducedMotion } from "../lib/motion";
import {
  LADDER_DEPTH,
  buildPatternModel,
  patternLadder,
  patternPickTickets,
} from "../lib/patternLab";
import {
  DEFAULT_FILTERS,
  formatTicket,
  generateTickets,
  newId,
  pad2,
  rejectReasons,
} from "../lib/picks";
import {
  crowdReading,
  deskPickTickets,
  deskPickWaPlays,
  popularityModel,
  waCrowdReading,
  waPopularityModel,
} from "../lib/popularity";
import { loadPref, savePref } from "../lib/prefs";
import { playPackOpen } from "../lib/sfx";
import { GAMES } from "../lib/prizes";
import { saveSlipImage, saveWaSlipImage } from "../lib/slipImage";
import { usePoolReport } from "../lib/usePoolReport";
import { useWaDraws, waDrawsFor, waLatest, waPastKeys } from "../lib/waDraws";
import { waAvoid, waFrequency } from "../lib/waFrequency";
import { CASH_POP_CROWDED, WA_GAME_ORDER, WA_GAMES } from "../lib/waGames";
import {
  DEFAULT_WA_FILTERS,
  formatWaPlay,
  generateWaPlays,
  waRejectReason,
} from "../lib/waPicks";
import type {
  DeskId,
  Filters,
  GameId,
  Ticket,
  WaFilters,
  WaGameId,
} from "../types";
import { FORMAT_START, type OfficialDraw } from "../lib/winners";

type MintMode = "quick" | "desk" | "pattern" | "ladder";

type Generation = {
  tickets: Ticket[];
};

const HISTORY_CAP = 24;
const PACK_OPEN_MS = 1080;

const HEAT_VIEWS: { id: HeatViewId; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "pairs", label: "Pairs" },
  { id: "draws", label: "Draw map" },
];

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

type Props = {
  game: GameId;
  draws: OfficialDraw[];
  asOf: string | null;
  winnerError: string | null;
  past: Set<string>;
  exclude: Set<string>;
  nextDrawDate: string | null;
  desk: DeskId;
  waGame: WaGameId;
  onGame: (game: GameId) => void;
  onDesk: (desk: DeskId) => void;
  onWaGame: (game: WaGameId) => void;
  onAddToPool: (tickets: Ticket[]) => void;
};

export function BoardView({
  game,
  draws,
  asOf,
  winnerError,
  past,
  exclude,
  nextDrawDate,
  desk,
  waGame,
  onGame,
  onDesk,
  onWaGame,
  onAddToPool,
}: Props) {
  const national = desk === "national";
  const spec = national
    ? nationalHeatSpec(GAMES[game])
    : waHeatSpec(WA_GAMES[waGame]);
  const waSpec = WA_GAMES[waGame];
  const { book: waBook, feed: waFeed } = useWaDraws();
  const reduced = usePrefersReducedMotion();
  const waRows = useMemo(
    () => (national ? [] : waDrawsFor(waGame, waBook)),
    [national, waGame, waBook],
  );
  const waOfficial = useMemo(() => waToOfficial(waRows), [waRows]);
  const source = national ? draws : waOfficial;
  const sourceNote = national ? "NY Open Data" : "Washington’s Lottery";
  const oldest = source[source.length - 1]?.date ?? "";
  const newest = source[0]?.date ?? asOf ?? "";

  const [mode, setMode] = useState<MintMode>("ladder");
  const [ladderRank, setLadderRank] = useState(1);
  const [heatWindow, setHeatWindow] = useState<HeatPreset>("all");
  const [from, setFrom] = useState(oldest);
  const [to, setTo] = useState(newest);
  const [lastN, setLastN] = useState(0);
  const [shift, setShift] = useState(0);
  const [colorMode, setColorMode] = useState<HeatColorMode>("frequency");
  const [whites, setWhites] = useState<number[]>([]);
  const [extra, setExtra] = useState<number | null>(null);
  const [minted, setMinted] = useState<Ticket | null>(null);
  const [active, setActive] = useState<HeatCell | null>(null);
  const [activeIsExtra, setActiveIsExtra] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    ...loadPref<Partial<Filters>>("filters.national", {}),
  }));
  const [waFilters, setWaFilters] = useState<WaFilters>(() => ({
    ...DEFAULT_WA_FILTERS,
    ...loadPref<Partial<WaFilters>>("filters.wa", {}),
  }));
  const [fadesOpen, setFadesOpen] = useState(() =>
    loadPref("fold.fades", true),
  );
  const [patternFades, setPatternFades] = useState(() =>
    loadPref("pattern.applyFades", false),
  );
  const [ladderFades, setLadderFades] = useState(() =>
    loadPref("ladder.applyFades", false),
  );
  const [saving, setSaving] = useState(false);
  const [heatView, setHeatView] = useState<HeatViewId>("grid");
  const [playing, setPlaying] = useState(false);
  const [boardCount, setBoardCount] = useState("5");
  const [stack, setStack] = useState<Ticket[]>([]);
  const [crowdOpen, setCrowdOpen] = useState(() =>
    loadPref("fold.crowd", false),
  );
  const [cashpot, setCashpot] = useState(() =>
    String(waBook.prizes.hit5.cashpot),
  );
  const [prizeDirty, setPrizeDirty] = useState(false);
  const [waAdvertised, setWaAdvertised] = useState(() =>
    String(waBook.prizes.lotto.advertised),
  );
  const [waCash, setWaCash] = useState(() => String(waBook.prizes.lotto.cash));
  const [minting, setMinting] = useState(false);
  const [burst, setBurst] = useState(0);
  const [deal, setDeal] = useState(0);
  const [history, setHistory] = useState<Generation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const mintTimer = useRef(0);

  const custom = heatWindow === "custom";
  const lastWhites = national ? draws[0]?.whites : waRows[0]?.numbers;
  const waLatestDraw = national ? null : waLatest(waGame, waBook);
  const waPast = useMemo(
    () => (national ? new Set<string>() : waPastKeys(waGame, waBook)),
    [national, waGame, waBook],
  );

  const natStats = useMemo(
    () => (national ? frequencyStats(draws, spec.whiteMax) : null),
    [national, draws, spec.whiteMax],
  );
  const waStats = useMemo(
    () => (national ? null : waFrequency(waRows, 1, spec.whiteMax)),
    [national, waRows, spec.whiteMax],
  );
  const natAvoid = useMemo(
    () =>
      national ? avoidWhites(filters, natStats, lastWhites ?? []) : new Set<number>(),
    [national, filters, natStats, lastWhites],
  );
  const waEffective = useMemo(() => {
    if (waGame === "match4") return { ...waFilters, birthday: false, highBall: false };
    if (waSpec.kind === "cashpop") return { ...waFilters, previous: false };
    return waFilters;
  }, [waGame, waSpec.kind, waFilters]);
  const waAvoidSet = useMemo(
    () =>
      national ? new Set<number>() : waAvoid(waEffective, waStats, lastWhites ?? []),
    [national, waEffective, waStats, lastWhites],
  );

  const patternModel = useMemo(
    () =>
      national
        ? buildPatternModel(
            draws.map((d) => ({ numbers: d.whites, extra: d.extra })),
            spec.whiteMax,
            spec.extraMax,
          )
        : buildPatternModel(
            waRows.map((d) => ({ numbers: d.numbers })),
            spec.whiteMax,
          ),
    [national, draws, waRows, spec.whiteMax, spec.extraMax],
  );

  const fadeReject = useCallback(
    (nums: number[]) =>
      national
        ? rejectReasons(nums, filters, past, natAvoid).length > 0
        : waRejectReason(nums, waSpec, waEffective, waPast, waAvoidSet) != null,
    [national, filters, past, natAvoid, waSpec, waEffective, waPast, waAvoidSet],
  );

  const ladder = useMemo(
    () =>
      patternModel
        ? patternLadder(patternModel, spec.pick, LADDER_DEPTH, {
            reject: ladderFades ? fadeReject : undefined,
          })
        : null,
    [patternModel, spec.pick, ladderFades, fadeReject],
  );

  const poolRequest = useMemo(
    () =>
      national
        ? { kind: "national" as const, spec: GAMES[game], filters, past, avoid: natAvoid }
        : {
            kind: "wa" as const,
            spec: waSpec,
            whiteCount: spec.pick,
            filters: waEffective,
            past: waPast,
            avoid: waAvoidSet,
          },
    [national, game, filters, past, natAvoid, waSpec, spec.pick, waEffective, waPast, waAvoidSet],
  );
  const poolReport = usePoolReport(poolRequest);

  const poolFades = useMemo<PoolFade[]>(() => {
    const fades: PoolFade[] = [];
    const lastOn = national ? filters.lastDraw : waFilters.lastDraw;
    const hotOn = national ? filters.hot : waFilters.hot;
    const coldOn = national ? filters.cold : waFilters.cold;
    const stats = national ? natStats : waStats;
    if (lastOn && lastWhites?.length) {
      fades.push({
        key: "last",
        label: "Last drawing",
        tone: "last",
        numbers: lastWhites,
      });
    }
    if (stats && hotOn) {
      fades.push({
        key: "hot",
        label: "Hot (recently drawn)",
        tone: "hot",
        numbers: stats.hot,
      });
    }
    if (stats && coldOn) {
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
    if (!national && waSpec.kind === "cashpop" && waFilters.luckyPops) {
      fades.push({
        key: "luckyPops",
        label: "Lucky POPs",
        tone: "crowd",
        numbers: CASH_POP_CROWDED,
      });
    }
    return fades;
  }, [national, filters, waFilters, waSpec.kind, natStats, waStats, lastWhites]);

  const range: HeatWindow = custom
    ? { preset: "custom", from, to }
    : { preset: "all" };
  const universe = useMemo(
    () => sliceHeatDraws(source, range),
    [source, heatWindow, from, to],
  );
  const pane = custom
    ? universe.length
    : Math.min(Math.max(lastN || universe.length, 1), universe.length);
  const viewingAll = pane >= universe.length;
  const walkPane = viewingAll
    ? Math.min(HEAT_SHIFT_PANE, Math.max(universe.length, 1))
    : pane;
  const maxShift = shiftMax(universe, walkPane);
  const parked = !playing && shift >= maxShift;
  const shown = useMemo(
    () =>
      viewingAll && parked
        ? universe
        : sliceShiftDraws(universe, walkPane, shift),
    [viewingAll, parked, universe, walkPane, shift],
  );
  const book = useMemo(
    () => heatBookFromDraws(shown, spec),
    [shown, spec],
  );
  const pairs = useMemo(
    () => (heatView === "pairs" ? heatPairs(shown, spec) : null),
    [heatView, shown, spec],
  );
  const drawRows = useMemo(
    () => (heatView === "draws" ? heatDrawRows(shown) : []),
    [heatView, shown],
  );

  useEffect(() => {
    if (oldest) setFrom((cur) => cur || oldest);
    if (newest) setTo((cur) => cur || newest);
  }, [oldest, newest]);

  useEffect(() => {
    setWhites([]);
    setExtra(null);
    setMinted(null);
    setStack([]);
    setPlaying(false);
    setMinting(false);
    setHistory([]);
    setHistoryIndex(-1);
    window.clearTimeout(mintTimer.current);
    setLadderRank(1);
    setBoardCount(
      national ? "5" : waSpec.pairSize ? "6" : waSpec.kind === "cashpop" ? "3" : "5",
    );
    if (source.length === 0) return;
    setLastN(source.length);
    setShift(shiftMax(source, HEAT_SHIFT_PANE));
  }, [game, waGame, desk, source.length]);

  useEffect(() => {
    setLadderRank(1);
  }, [ladderFades]);

  useEffect(() => {
    if (mode !== "ladder" || !ladder || ladder.entries.length === 0) return;
    const i = Math.min(Math.max(ladderRank, 1), ladder.entries.length) - 1;
    const entry = ladder.entries[i];
    setWhites(entry.numbers);
    setExtra(entry.extra != null && entry.extra > 0 ? entry.extra : null);
    const ticket = {
      id: `ladder-${entry.rank}`,
      whites: entry.numbers,
      extra: entry.extra ?? 0,
    };
    setMinted(ticket);
    setStack([ticket]);
  }, [mode, ladder, ladderRank]);

  useEffect(() => {
    if (mode !== "ladder" || !ladder || ladder.entries.length === 0) return;
    const depth = ladder.entries.length;
    function onKey(event: KeyboardEvent) {
      const node = event.target;
      if (node instanceof HTMLElement) {
        const tag = node.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          node.isContentEditable
        ) {
          return;
        }
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setLadderRank((cur) => Math.min(depth, cur + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setLadderRank((cur) => Math.max(1, cur - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, ladder]);

  useEffect(() => {
    savePref("filters.national", filters);
  }, [filters]);
  useEffect(() => {
    savePref("filters.wa", waFilters);
  }, [waFilters]);
  useEffect(() => {
    if (prizeDirty) return;
    setCashpot(String(waBook.prizes.hit5.cashpot));
    setWaAdvertised(String(waBook.prizes.lotto.advertised));
    setWaCash(String(waBook.prizes.lotto.cash));
  }, [
    prizeDirty,
    waBook.prizes.hit5.cashpot,
    waBook.prizes.lotto.advertised,
    waBook.prizes.lotto.cash,
  ]);

  useEffect(() => {
    return () => window.clearTimeout(mintTimer.current);
  }, []);

  useEffect(() => {
    if (!playing || reduced || maxShift <= 0) {
      if (playing && (reduced || maxShift <= 0)) setPlaying(false);
      return;
    }
    const id = globalThis.setInterval(() => {
      setShift((cur) => {
        if (cur >= maxShift) {
          setPlaying(false);
          return cur;
        }
        return cur + 1;
      });
    }, 160);
    return () => globalThis.clearInterval(id);
  }, [playing, reduced, maxShift]);

  function mintCount() {
    return Math.min(50, Math.max(1, Math.floor(Number(boardCount)) || 1));
  }

  function onLastN(n: number) {
    setPlaying(false);
    setLastN(n);
    setShift(shiftMax(source, n >= source.length ? HEAT_SHIFT_PANE : n));
    setHeatWindow(n >= source.length ? "all" : heatWindow === "custom" ? "all" : heatWindow);
  }

  function onToggleWhite(n: number) {
    setMinted(null);
    setWhites((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= spec.pick) return cur;
      return [...cur, n];
    });
  }

  function applyTicket(ticket: Ticket) {
    setWhites(ticket.whites);
    setExtra(ticket.extra > 0 ? ticket.extra : null);
    setMinted(ticket);
    setStack((cur) => (cur.length <= 1 ? [ticket] : [ticket, ...cur.slice(1)]));
  }

  function applyStack(tickets: Ticket[]) {
    if (tickets.length === 0) return;
    setStack(tickets);
    setWhites(tickets[0].whites);
    setExtra(tickets[0].extra > 0 ? tickets[0].extra : null);
    setMinted(tickets[0]);
  }

  function cloneTickets(tickets: Ticket[]): Ticket[] {
    return tickets.map((ticket) => ({
      ...ticket,
      whites: [...ticket.whites],
    }));
  }

  function recordGeneration(tickets: Ticket[]) {
    const snap = { tickets: cloneTickets(tickets) };
    const kept = history.slice(0, historyIndex + 1);
    const next = [...kept, snap].slice(-HISTORY_CAP);
    setHistory(next);
    setHistoryIndex(next.length - 1);
  }

  function revealStack(tickets: Ticket[], record: boolean) {
    applyStack(tickets);
    if (record) recordGeneration(tickets);
    setDeal((n) => n + 1);
    setBurst((n) => n + 1);
  }

  function openPack(tickets: Ticket[], record = true) {
    if (tickets.length === 0) return;
    playPackOpen(national ? game : waGame);
    if (reduced) {
      revealStack(tickets, record);
      return;
    }
    setMinting(true);
    window.clearTimeout(mintTimer.current);
    mintTimer.current = window.setTimeout(() => {
      revealStack(tickets, record);
      setMinting(false);
    }, PACK_OPEN_MS);
  }

  function showGeneration(index: number) {
    const gen = history[index];
    if (!gen || minting) return;
    setHistoryIndex(index);
    applyStack(gen.tickets);
    setDeal((n) => n + 1);
  }

  function onPickPair(a: number, b: number) {
    setMinted(null);
    setWhites((cur) => {
      const next = [...cur];
      for (const n of [a, b]) {
        if (next.includes(n) || next.length >= spec.pick) continue;
        next.push(n);
      }
      return next;
    });
  }

  function pickMode(next: MintMode) {
    setMode(next);
    if (next === "ladder") setLadderRank(1);
  }

  function mint() {
    if (minting) return;
    const n = mintCount();
    if (national) {
      if (mode === "pattern" && patternModel) {
        const lab = patternPickTickets(patternModel, spec.pick, n, 1, {
          reject: patternFades ? fadeReject : undefined,
          exclude,
        });
        if (lab.tickets.length === 0) return;
        openPack(
          lab.tickets.map((row) => ({
            id: row.id,
            whites: row.numbers,
            extra: row.extra ?? 1 + Math.floor(Math.random() * spec.extraMax),
          })),
        );
        return;
      }
      if (mode === "desk") {
        const desk = deskPickTickets(game, n, filters, past, exclude, natAvoid);
        if (desk?.tickets.length) {
          openPack(desk.tickets);
          return;
        }
      }
      const result = generateTickets(GAMES[game], n, filters, past, exclude, natAvoid);
      if (result.tickets.length) openPack(result.tickets);
      return;
    }
    if (mode === "pattern" && patternModel) {
      const lab = patternPickTickets(patternModel, spec.pick, n, 1, {
        reject: patternFades ? fadeReject : undefined,
      });
      if (lab.tickets.length === 0) return;
      openPack(
        lab.tickets.map((row) => ({
          id: row.id,
          whites: row.numbers,
          extra: 0,
        })),
      );
      return;
    }
    if (mode === "desk") {
      const desk = deskPickWaPlays(waSpec, spec.pick, n, waEffective, waPast, waAvoidSet);
      if (desk?.tickets.length) {
        openPack(
          desk.tickets.map((row) => ({
            id: row.id,
            whites: row.numbers,
            extra: 0,
          })),
        );
        return;
      }
    }
    const result = generateWaPlays(waSpec, spec.pick, n, waEffective, waPast, waAvoidSet);
    if (result.tickets.length) {
      openPack(
        result.tickets.map((row) => ({
          id: row.id,
          whites: row.numbers,
          extra: 0,
        })),
      );
    }
  }

  function mintHeat() {
    if (!book || minting) return;
    openPack([mintFromHeat(spec, book)]);
  }

  async function saveHeatPng() {
    if (!book) return;
    await saveHeatGridPng(book, colorMode, `Lottery Heat · ${spec.label}`);
  }

  function copySlip() {
    if (batch.length === 0) return;
    const text = national
      ? batch
          .map((ticket) =>
            formatTicket(ticket, spec.extraLabel || GAMES[game].extraLabel),
          )
          .join("\n")
      : batch.map((ticket) => formatWaPlay(ticket.whites)).join("\n");
    void navigator.clipboard.writeText(text);
  }

  async function saveImage() {
    if (saving || batch.length === 0) return;
    setSaving(true);
    try {
      if (national) {
        await saveSlipImage({
          game,
          tickets: batch,
          drawLabel: ticketDrawLabel(nextDrawDate),
        });
      } else {
        await saveWaSlipImage({
          game: waGame,
          tickets: batch.map((ticket) => ({
            id: ticket.id,
            numbers: ticket.whites,
          })),
          drawLabel: waLatestDraw?.date ?? asOf,
        });
      }
    } catch {
      // Share cancel is handled inside the save helper.
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...whites].sort((a, b) => a - b);
  const hasExtra = spec.extraMax > 0;
  const trayTicket = ticketFromTray(sorted, extra, spec.pick, hasExtra);
  const ready = trayTicket ?? minted;
  const firstBoard: Ticket = {
    id: minted?.id ?? stack[0]?.id ?? ready?.id ?? "tray",
    whites: sorted.length === spec.pick ? sorted : (stack[0]?.whites ?? sorted),
    extra: extra ?? stack[0]?.extra ?? ready?.extra ?? 0,
  };
  const composed =
    stack.length > 1
      ? [firstBoard, ...stack.slice(1)]
      : ready
        ? [ready]
        : [];
  const batch = composed.filter(
    (ticket) =>
      ticket.whites.length === spec.pick && (!hasExtra || ticket.extra > 0),
  );
  const reportTickets = batch.map((ticket) => ({
    id: ticket.id,
    numbers: ticket.whites,
    extra: ticket.extra,
  }));
  const showHighBall = !national && waSpec.id === "hit5";
  const showBirthday =
    !national &&
    waSpec.kind === "matrix" &&
    spec.whiteMax > 31 &&
    waSpec.id !== "hit5";
  const showMatrixPatterns = !national && waSpec.kind !== "cashpop";
  const waFadeKeys: (keyof WaFilters)[] = [
    "uniqueSlip",
    "lastDraw",
    ...(showHighBall ? (["highBall"] as const) : []),
    ...(showBirthday ? (["birthday"] as const) : []),
    "sequence",
    ...(showMatrixPatterns ? (["multiples", "visual"] as const) : []),
    ...(waSpec.kind === "cashpop" ? (["luckyPops"] as const) : []),
    ...(waSpec.kind !== "cashpop" ? (["previous"] as const) : []),
    "hot",
    "cold",
  ];
  const windowLabel =
    custom ? "Custom" : pane >= source.length ? "All-time" : `${pane} draws`;
  const drawMax = Math.max(1, source.length);
  const drawValue = Math.min(Math.max(lastN || drawMax, 1), drawMax);
  const fadesOn = national
    ? Object.values(filters).filter(Boolean).length
    : waFadeKeys.filter((key) => waFilters[key]).length;
  const fadesTotal = national ? Object.keys(filters).length : waFadeKeys.length;
  const crowdStats = national ? natStats : waStats;
  const boardNoun = !national && waSpec.pairSize
    ? "Plays"
    : !national && waSpec.kind === "cashpop"
      ? "Tickets"
      : "Boards";
  const waAsOf = waBook.asOf;
  const deskReady = national
    ? Boolean(popularityModel(game))
    : Boolean(waPopularityModel(waGame));
  const packGame = national ? game : waGame;
  const extraShort =
    game === "powerball" ? "PB" : game === "megamillions" ? "MB" : "";
  const canBack = historyIndex > 0;
  const canForward = historyIndex >= 0 && historyIndex < history.length - 1;
  const ladderEntry =
    mode === "ladder" && ladder
      ? ladder.entries[
          Math.min(Math.max(ladderRank, 1), ladder.entries.length) - 1
        ]
      : null;

  return (
    <section className="panel" aria-label="The desk">
      <header className="panel-head">
        <div>
          <p className="kicker">All views</p>
          <h2>The desk</h2>
        </div>
      </header>
      <p className="lede">
        Mint a starting board, then click Heat, the number pool, or a ladder
        tile to edit the same slip. Heat is official-draw frequency. The pool
        is fade space and crowd pick-rate. The ladder is a fit to the past.
        Entertainment, not prediction. Same hit odds as Quick Pick. Clicking
        to edit does not change hit odds.
      </p>
      {!national ? (
        <WaValue
          game={waGame}
          asOf={waAsOf}
          feed={waFeed}
          cashpot={cashpot}
          advertised={waAdvertised}
          cash={waCash}
          onCashpot={(v) => {
            setPrizeDirty(true);
            setCashpot(v);
          }}
          onAdvertised={(v) => {
            setPrizeDirty(true);
            setWaAdvertised(v);
          }}
          onCash={(v) => {
            setPrizeDirty(true);
            setWaCash(v);
          }}
        />
      ) : null}

      <div className="map-toolbar hub-toolbar">
        <div className="mode-picker">
          <p className="mode-picker-label" id="desk-market">
            Market
          </p>
          <div className="mode-switch" role="group" aria-labelledby="desk-market">
            <button
              type="button"
              className={national ? "is-on" : ""}
              aria-pressed={national}
              onClick={() => onDesk("national")}
            >
              National
            </button>
            <button
              type="button"
              className={!national ? "is-on" : ""}
              aria-pressed={!national}
              onClick={() => onDesk("washington")}
            >
              Washington
            </button>
          </div>
        </div>
        <div className="mode-picker">
          <p className="mode-picker-label" id="desk-game">
            Game
          </p>
          <div
            className={`mode-switch${national ? "" : " is-wrap"}`}
            role="group"
            aria-labelledby="desk-game"
          >
            {national ? (
              <>
                <button
                  type="button"
                  className={game === "powerball" ? "is-on" : ""}
                  aria-pressed={game === "powerball"}
                  onClick={() => onGame("powerball")}
                >
                  Powerball
                </button>
                <button
                  type="button"
                  className={game === "megamillions" ? "is-on" : ""}
                  aria-pressed={game === "megamillions"}
                  onClick={() => onGame("megamillions")}
                >
                  Mega Millions
                </button>
              </>
            ) : (
              WA_GAME_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={waGame === id ? "is-on" : ""}
                  aria-pressed={waGame === id}
                  onClick={() => onWaGame(id)}
                >
                  {WA_GAMES[id].label}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="mode-picker">
          <p className="mode-picker-label" id="desk-modes">
            Modes
          </p>
          <div className="mode-switch" role="group" aria-labelledby="desk-modes">
            {patternModel ? (
              <button
                type="button"
                className={mode === "ladder" ? "is-on" : ""}
                aria-pressed={mode === "ladder"}
                onClick={() => pickMode("ladder")}
              >
                The Ladder
              </button>
            ) : null}
            {patternModel ? (
              <button
                type="button"
                className={mode === "pattern" ? "is-on" : ""}
                aria-pressed={mode === "pattern"}
                onClick={() => pickMode("pattern")}
              >
                Pattern lab
              </button>
            ) : null}
            {deskReady ? (
              <button
                type="button"
                className={mode === "desk" ? "is-on" : ""}
                aria-pressed={mode === "desk"}
                onClick={() => pickMode("desk")}
              >
                Desk pick
              </button>
            ) : null}
            <button
              type="button"
              className={mode === "quick" ? "is-on" : ""}
              aria-pressed={mode === "quick"}
              onClick={() => pickMode("quick")}
            >
              Quick mint
            </button>
          </div>
        </div>
        <div className="mode-picker">
          <p className="mode-picker-label" id="desk-dates">
            Dates
          </p>
          <div className="mode-switch" role="group" aria-labelledby="desk-dates">
            <button
              type="button"
              className={!custom ? "is-on" : ""}
              aria-pressed={!custom}
              onClick={() => {
                setPlaying(false);
                setHeatWindow("all");
                setLastN(source.length);
                setShift(shiftMax(source, HEAT_SHIFT_PANE));
              }}
            >
              Recent
            </button>
            <button
              type="button"
              className={custom ? "is-on" : ""}
              aria-pressed={custom}
              onClick={() => {
                setPlaying(false);
                setHeatWindow("custom");
                setFrom(oldest);
                setTo(newest);
              }}
            >
              Custom dates
            </button>
          </div>
        </div>
        <div className="mode-picker">
          <p className="mode-picker-label" id="desk-heat-view">
            Heat
          </p>
          <div className="mode-switch" role="group" aria-labelledby="desk-heat-view">
            {HEAT_VIEWS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={heatView === row.id ? "is-on" : ""}
                aria-pressed={heatView === row.id}
                onClick={() => setHeatView(row.id)}
              >
                {row.label}
              </button>
            ))}
          </div>
        </div>
        {heatView === "grid" ? (
          <div className="mode-picker">
            <p className="mode-picker-label" id="desk-scale">
              Scale
            </p>
            <div className="mode-switch" role="group" aria-labelledby="desk-scale">
              <button
                type="button"
                className={colorMode === "frequency" ? "is-on" : ""}
                aria-pressed={colorMode === "frequency"}
                onClick={() => setColorMode("frequency")}
              >
                Frequency
              </button>
              <button
                type="button"
                className={colorMode === "deviation" ? "is-on" : ""}
                aria-pressed={colorMode === "deviation"}
                onClick={() => setColorMode("deviation")}
              >
                Deviation
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {winnerError && national ? <p className="warn">{winnerError}</p> : null}
      {source.length === 0 ? (
        <p className="fine">Loading official draws…</p>
      ) : null}

      {mode === "pattern" ? (
        <PatternFadesToggle
          on={patternFades}
          onToggle={(next) => {
            setPatternFades(next);
            savePref("pattern.applyFades", next);
          }}
        />
      ) : null}
      {mode === "ladder" ? (
        <PatternFadesToggle
          variant="ladder"
          on={ladderFades}
          onToggle={(next) => {
            setLadderFades(next);
            savePref("ladder.applyFades", next);
          }}
        />
      ) : null}

      <div className="hub-layout">
        <div className="hub-slip">
          <header className="heat-stage-head">
            <p className="kicker">The slip</p>
            <p className="fine">
              {mode === "ladder"
                ? "Arrow keys step through the ranked field, starting at #1. Same hit odds as Quick Pick."
                : "Mint, then click any panel. Same hit odds as Quick Pick."}
            </p>
          </header>
          <div
            className={`gen-arena is-${packGame}${minting ? " is-minting" : ""}`}
          >
            <PackFx game={packGame} burst={burst} />
            {minting ? (
              <div className="foil-mint">
                <PackShell game={packGame} label={spec.label} opening />
              </div>
            ) : stack.length > 1 && national ? (
              <div key={deal} className="foil-mint">
                <FoilCard shader game={game} className="heat-slip-wrap foil-hero">
                  <LotteryTicket
                    game={game}
                    tickets={composed}
                    drawLabel={ticketDrawLabel(nextDrawDate)}
                  />
                </FoilCard>
              </div>
            ) : stack.length > 1 ? (
              <div key={deal} className="foil-mint">
                <FoilCard shader game={waGame} className="heat-slip-wrap foil-hero">
                  <WaSlip
                    spec={waSpec}
                    tickets={composed.map((ticket) => ({
                      id: ticket.id,
                      numbers: ticket.whites,
                    }))}
                  />
                </FoilCard>
              </div>
            ) : (
              <div key={deal} className="foil-mint">
          <FoilCard shader game={national ? game : waGame} className="heat-slip-wrap foil-hero">
            <article
              className={`lotto-slip is-${national ? game : waGame}`}
              aria-label="Board slip"
            >
              <header className="lotto-head">
                {national && game === "powerball" ? (
                  <p className="game-mark pb-mark">
                    P<span className="pb-o" aria-hidden="true" />
                    WERBALL
                  </p>
                ) : national && game === "megamillions" ? (
                  <p className="game-mark mm-mark">
                    <span className="mm-stars" aria-hidden="true">
                      ★★★
                    </span>
                    <span className="mm-mega">MEGA</span>
                    <span className="mm-millions">MILLIONS</span>
                  </p>
                ) : (
                  <p className="game-mark wa-mark">{spec.label.toUpperCase()}</p>
                )}
                <p className="lotto-draw">
                  {mode === "ladder" && ladderEntry
                    ? `LADDER #${ladderEntry.rank} · ${ladderEntry.points} PTS`
                    : windowLabel.toUpperCase()}
                  {book ? ` · AS OF ${book.asOf}` : ""}
                </p>
              </header>
              <ol className="lotto-boards">
                <li>
                  <span className="lotto-code">A</span>
                  <span className="lotto-whites">
                    {Array.from({ length: spec.pick }, (_, i) =>
                      sorted[i] != null ? (
                        <span key={`w-${sorted[i]}`}>{pad2(sorted[i])}</span>
                      ) : (
                        <span key={`empty-${i}`} className="heat-slip-empty">
                          ··
                        </span>
                      ),
                    )}
                  </span>
                  {hasExtra ? (
                    <span className="lotto-extra">
                      <em>{extraShort}</em>
                      {extra != null ? (
                        pad2(extra)
                      ) : (
                        <span className="heat-slip-empty">··</span>
                      )}
                    </span>
                  ) : null}
                </li>
              </ol>
              <p className="lotto-price">
                ${spec.ticketCost.toFixed(2)} <span>EP</span>
              </p>
              <p className="lotto-void">
                Sample slip. Not a wager. Same hit odds as Quick Pick. Past
                results do not predict future outcomes.
              </p>
            </article>
          </FoilCard>
              </div>
            )}
          </div>
          {mode === "ladder" && ladder ? (
            <div className="mode-picker hub-ladder-step">
              <p className="mode-picker-label" id="desk-rank">
                Ladder rank
              </p>
              <div className="mode-switch" role="group" aria-labelledby="desk-rank">
                <button
                  type="button"
                  disabled={ladderRank <= 1}
                  aria-label="Previous ranked slip"
                  onClick={() => setLadderRank((cur) => Math.max(1, cur - 1))}
                >
                  ←
                </button>
                <button type="button" className="is-on" disabled>
                  #{ladderRank} / {ladder.entries.length}
                </button>
                <button
                  type="button"
                  disabled={ladderRank >= ladder.entries.length}
                  aria-label="Next ranked slip"
                  onClick={() =>
                    setLadderRank((cur) =>
                      Math.min(ladder.entries.length, cur + 1),
                    )
                  }
                >
                  →
                </button>
              </div>
            </div>
          ) : null}
          <div className="heat-actions">
            {mode !== "ladder" ? (
              <>
                <label className="inline">
                  {boardNoun}
                  <input
                    className="narrow"
                    value={boardCount}
                    onChange={(e) => setBoardCount(e.target.value)}
                    inputMode="numeric"
                    aria-label={`${boardNoun} to mint, 1 to 50`}
                  />
                </label>
                <button
                  type="button"
                  className={`primary${minting ? " minting" : ""}`}
                  onClick={mint}
                  disabled={minting}
                  aria-busy={minting}
                >
                  {minting
                    ? "Opening…"
                    : mode === "desk"
                      ? "Mint desk pick"
                      : mode === "pattern"
                        ? "Mint pattern lab"
                        : "Mint random"}
                </button>
              </>
            ) : null}
            {history.length > 0 ? (
              <div className="mode-picker hub-history">
                <p className="mode-picker-label" id="desk-history">
                  Generations
                </p>
                <div
                  className="mode-switch"
                  role="group"
                  aria-labelledby="desk-history"
                >
                  <button
                    type="button"
                    disabled={!canBack || minting}
                    aria-label="Previous generation"
                    onClick={() => showGeneration(historyIndex - 1)}
                  >
                    ←
                  </button>
                  <button type="button" className="is-on" disabled>
                    {historyIndex + 1} / {history.length}
                  </button>
                  <button
                    type="button"
                    disabled={!canForward || minting}
                    aria-label="Next generation"
                    onClick={() => showGeneration(historyIndex + 1)}
                  >
                    →
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setWhites([]);
                setExtra(null);
                setMinted(null);
                setStack([]);
              }}
              disabled={whites.length === 0 && extra == null && stack.length === 0}
            >
              Clear
            </button>
            {batch.length > 0 ? (
              <>
                <button type="button" onClick={copySlip}>
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
              </>
            ) : null}
            {national && batch.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  onAddToPool(
                    batch.map((ticket) => ({
                      id: ticket.id === "tray" ? newId() : ticket.id,
                      whites: ticket.whites,
                      extra: ticket.extra,
                    })),
                  )
                }
              >
                Add to pool
              </button>
            ) : null}
          </div>
          {batch.length > 0 && patternModel ? (
            <PatternReport
              model={patternModel}
              tickets={reportTickets}
              source={sourceNote}
            />
          ) : (
            <p className="fine">
              Fill {spec.pick} whites
              {hasExtra ? ` and a ${spec.extraLabel}` : ""} to score this
              board against the past. 50 points = average random ticket.
            </p>
          )}
          {batch.length > 0 && national ? (
            <CrowdIndex game={game} tickets={batch} />
          ) : null}
          {batch.length > 0 && !national ? (
            <WaCrowdIndex
              spec={waSpec}
              tickets={batch.map((ticket) => ({
                id: ticket.id,
                numbers: ticket.whites,
              }))}
            />
          ) : null}
        </div>

        <div className="hub-viz">
          <MapFilters className="is-slim">
            {custom ? (
              <>
                <label>
                  From
                  <input
                    type="date"
                    value={from}
                    min={oldest}
                    max={newest}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={to}
                    min={oldest}
                    max={newest}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <RangeSlider
                label="Draws"
                min={1}
                max={drawMax}
                step={1}
                value={drawValue}
                display={drawValue >= drawMax ? "All" : String(drawValue)}
                disabled={drawMax <= 1}
                onChange={onLastN}
              />
            )}
            <RangeSlider
              label="Through history"
              min={0}
              max={Math.max(maxShift, 0)}
              step={1}
              value={Math.min(shift, maxShift)}
              display={book?.asOf ?? "—"}
              disabled={maxShift <= 0}
              onChange={(next) => {
                setPlaying(false);
                setShift(next);
              }}
            />
            <button
              type="button"
              disabled={maxShift <= 0}
              onClick={() => {
                if (reduced) {
                  setShift((cur) => (cur >= maxShift ? 0 : maxShift));
                  return;
                }
                if (shift >= maxShift) setShift(0);
                setPlaying((cur) => !cur);
              }}
            >
              {playing ? "Pause" : "Play"}
            </button>
          </MapFilters>
          {book ? (
            <div className="map-board">
              {heatView === "grid" ? (
                <HeatGrid
                  book={book}
                  mode={colorMode}
                  selectedWhites={whites}
                  selectedExtra={extra}
                  active={active}
                  activeIsExtra={activeIsExtra}
                  onActive={(cell, kind) => {
                    setActive(cell);
                    setActiveIsExtra(kind === "extra");
                  }}
                  onToggleWhite={onToggleWhite}
                  onToggleExtra={(n) => {
                    setMinted(null);
                    setExtra((cur) => (cur === n ? null : n));
                  }}
                />
              ) : null}
              {heatView === "pairs" ? (
                pairs ? (
                  <HeatPairs
                    spec={spec}
                    expected={pairs.expected}
                    cells={pairs.cells}
                    onPickPair={onPickPair}
                  />
                ) : (
                  <p className="fine">
                    Need about 20 draws in this window for pairs.
                  </p>
                )
              ) : null}
              {heatView === "draws" ? (
                <HeatDrawMap
                  spec={spec}
                  rows={drawRows}
                  onToggleWhite={onToggleWhite}
                />
              ) : null}
              <p className="fine">
                {sourceNote}. How often each number appeared in this window.
                Not crowd pick-rate.
              </p>
              <div className="heat-actions">
                <button type="button" onClick={() => void saveHeatPng()}>
                  Save grid PNG
                </button>
                {mode !== "ladder" ? (
                  <button
                    type="button"
                    onClick={mintHeat}
                    disabled={minting}
                  >
                    Mint from this view
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {poolReport ? (
            <NumberPool
              min={1}
              max={spec.whiteMax}
              report={poolReport}
              fades={poolFades}
              noun={
                !national && waSpec.kind === "cashpop"
                  ? "POP picks"
                  : "white-ball boards"
              }
              oddsText={
                national
                  ? `1 in ${GAMES[game].jackpotOdds.toLocaleString("en-US")} for the jackpot`
                  : `1 in ${waSpec.jackpotOdds.toLocaleString("en-US")} for the jackpot`
              }
              note="Crowd underlines are pick-rate, not official-draw frequency."
              heat={
                national
                  ? (popularityModel(game)?.white ?? null)
                  : (waPopularityModel(waGame)?.white ?? null)
              }
              heatSource={
                national ? "California winner counts" : "Washington winner counts"
              }
              selected={whites}
              onToggleWhite={onToggleWhite}
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
              {national ? (
                <div className="filters">
                  {(
                    [
                      ["uniqueSlip", "No repeated whites on this slip"],
                      ["lastDraw", "Last drawing’s whites"],
                      ["birthday", "All five whites in 1–31"],
                      ["sequence", "Straight runs / 4+ consecutives"],
                      ["multiples", "Multiples patterns"],
                      ["visual", "Playslip row / column / diagonal"],
                      ["previous", "Recent official winners"],
                      ["hot", "Recently drawn (hot)"],
                      ["cold", "Long gaps and overdue"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={filters[key]}
                        onChange={() =>
                          setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        disabled={
                          (key === "lastDraw" && !lastWhites?.length) ||
                          ((key === "hot" || key === "cold") && !natStats)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="filters">
                  <label>
                    <input
                      type="checkbox"
                      checked={waFilters.uniqueSlip}
                      onChange={() =>
                        setWaFilters((prev) => ({
                          ...prev,
                          uniqueSlip: !prev.uniqueSlip,
                        }))
                      }
                    />
                    {waSpec.pairSize
                      ? "No shared numbers on each $1 pair"
                      : "No repeated numbers on this slip"}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={waFilters.lastDraw}
                      onChange={() =>
                        setWaFilters((prev) => ({
                          ...prev,
                          lastDraw: !prev.lastDraw,
                        }))
                      }
                      disabled={!lastWhites?.length}
                    />
                    Last drawing
                  </label>
                  {showHighBall ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={waFilters.highBall}
                        onChange={() =>
                          setWaFilters((prev) => ({
                            ...prev,
                            highBall: !prev.highBall,
                          }))
                        }
                      />
                      All five in 1–31 (no 32–42)
                    </label>
                  ) : null}
                  {showBirthday ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={waFilters.birthday}
                        onChange={() =>
                          setWaFilters((prev) => ({
                            ...prev,
                            birthday: !prev.birthday,
                          }))
                        }
                      />
                      All numbers in 1–31
                    </label>
                  ) : null}
                  <label>
                    <input
                      type="checkbox"
                      checked={waFilters.sequence}
                      onChange={() =>
                        setWaFilters((prev) => ({
                          ...prev,
                          sequence: !prev.sequence,
                        }))
                      }
                    />
                    Straight runs / 4+ consecutives
                  </label>
                  {showMatrixPatterns ? (
                    <>
                      <label>
                        <input
                          type="checkbox"
                          checked={waFilters.multiples}
                          onChange={() =>
                            setWaFilters((prev) => ({
                              ...prev,
                              multiples: !prev.multiples,
                            }))
                          }
                        />
                        Multiples patterns
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={waFilters.visual}
                          onChange={() =>
                            setWaFilters((prev) => ({
                              ...prev,
                              visual: !prev.visual,
                            }))
                          }
                        />
                        Playslip row / column / diagonal
                      </label>
                    </>
                  ) : null}
                  {waSpec.kind === "cashpop" ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={waFilters.luckyPops}
                        onChange={() =>
                          setWaFilters((prev) => ({
                            ...prev,
                            luckyPops: !prev.luckyPops,
                          }))
                        }
                      />
                      Lucky POPs (1, 7, 11, 13, 15)
                    </label>
                  ) : null}
                  {waSpec.kind !== "cashpop" ? (
                    <label>
                      <input
                        type="checkbox"
                        checked={waFilters.previous}
                        onChange={() =>
                          setWaFilters((prev) => ({
                            ...prev,
                            previous: !prev.previous,
                          }))
                        }
                      />
                      Recent official winners
                    </label>
                  ) : null}
                  <label>
                    <input
                      type="checkbox"
                      checked={waFilters.hot}
                      onChange={() =>
                        setWaFilters((prev) => ({ ...prev, hot: !prev.hot }))
                      }
                      disabled={!waStats}
                    />
                    Recently drawn (hot)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={waFilters.cold}
                      onChange={() =>
                        setWaFilters((prev) => ({ ...prev, cold: !prev.cold }))
                      }
                      disabled={!waStats}
                    />
                    Long gaps and overdue
                  </label>
                </div>
              )}
              <p className="fine temp-note">
                Fades change which boards mint keeps. They do not change hit
                odds. {sourceNote}
                {national && asOf ? (
                  <>
                    {" "}
                    <FeedMark feed="live" /> · {asOf}.
                  </>
                ) : (
                  <>
                    {" "}
                    <FeedMark feed={waFeed} /> · {waAsOf}.
                  </>
                )}
              </p>
            </div>
          </details>
          {lastWhites?.length || crowdStats ? (
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
                  {national && crowdStats
                    ? `Hot/cold from ${crowdStats.window.toLocaleString("en-US")} drawings since ${FORMAT_START[game]}`
                    : `Hot/cold from ${waRows.length} official drawings`}
                  {national && asOf
                    ? ` through ${asOf}`
                    : waLatestDraw
                      ? ` through ${waLatestDraw.date}`
                      : ""}
                  .{" "}
                  {national ? (
                    asOf ? (
                      <>
                        <FeedMark feed="live" /> · NY Open Data.
                      </>
                    ) : (
                      "Source: NY Open Data."
                    )
                  ) : (
                    <>
                      <FeedMark feed={waFeed} /> · {waAsOf}.
                    </>
                  )}
                </p>
                <div className="temp-board">
                  <article className="temp-card">
                    <h3>Last draw</h3>
                    <p className="fine">People replay these.</p>
                    <div
                      className={`ticket-row${(lastWhites?.length ?? 0) > 10 ? " dense" : ""}`}
                    >
                      {lastWhites && lastWhites.length > 0 ? (
                        lastWhites.map((n, i) => (
                          <Ball key={`last-${n}-${i}`} value={n} />
                        ))
                      ) : (
                        <span className="fine">None yet</span>
                      )}
                    </div>
                  </article>
                  {crowdStats ? (
                    <>
                      <article className="temp-card">
                        <h3>Hot</h3>
                        <p className="fine">
                          Recently drawn. The public chases these.
                        </p>
                        <div className="ticket-row">
                          {crowdStats.hot.map((n) => (
                            <Ball key={`hot-${n}`} value={n} tone="hot" />
                          ))}
                        </div>
                      </article>
                      <article className="temp-card">
                        <h3>Cold</h3>
                        <p className="fine">Longest gaps. Still random.</p>
                        <div className="ticket-row">
                          {crowdStats.cold.map((n) => (
                            <Ball key={`cold-${n}`} value={n} tone="cold" />
                          ))}
                        </div>
                      </article>
                      <article className="temp-card">
                        <h3>Most overdue</h3>
                        <p className="fine">
                          Above-median frequency, missing 30+ days.
                        </p>
                        <div className="ticket-row">
                          {crowdStats.overdue ? (
                            <>
                              <Ball
                                value={crowdStats.overdue.n}
                                tone="overdue"
                              />
                              <span className="temp-meta">
                                {daysLabel(crowdStats.overdue.days)}
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
        </div>

      {patternModel ? (
        <div className="hub-feed">
        <PatternLadder
          model={patternModel}
          size={spec.pick}
          source={sourceNote}
          reject={ladderFades ? fadeReject : undefined}
          onSelect={(entry) => {
            const ticket = {
              id: newId(),
              whites: entry.numbers,
              extra: entry.extra ?? 0,
            };
            applyTicket(ticket);
            recordGeneration([ticket]);
            setDeal((n) => n + 1);
          }}
          renderTile={(entry) =>
            national ? (
              <FoilCard game={game}>
                <LotteryTicket
                  game={game}
                  tickets={[
                    {
                      id: `ladder-${entry.rank}`,
                      whites: entry.numbers,
                      extra: entry.extra ?? 1,
                    },
                  ]}
                />
              </FoilCard>
            ) : (
              <FoilCard game={waGame}>
                <WaSlip
                  spec={waSpec}
                  tickets={[
                    { id: `ladder-${entry.rank}`, numbers: entry.numbers },
                  ]}
                />
              </FoilCard>
            )
          }
          crowd={(entry) =>
            national
              ? crowdReading(game, entry.numbers, entry.extra ?? 1)
              : waCrowdReading(waGame, entry.numbers)
          }
        />
        </div>
      ) : null}
      </div>
      {national && batch.length > 0 ? (
        <PrintSlip game={game} tickets={batch} title="Desk slip" />
      ) : null}
      {!national && batch.length > 0 ? (
        <section className="print-sheet" aria-hidden="true">
          <header>
            <p>JackpotDesk · Washington · {spec.label}</p>
            <h1>Desk slip</h1>
            <p>
              Mark these boards at the counter. {batch.length} play
              {batch.length === 1 ? "" : "s"}. Same hit odds as Quick Pick.
            </p>
          </header>
          <ol>
            {batch.map((ticket, i) => (
              <li key={ticket.id}>
                <p>
                  Play {i + 1}: {formatWaPlay(ticket.whites)}
                </p>
                <Playslip whites={ticket.whites} whiteMax={spec.whiteMax} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
