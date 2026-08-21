import { useEffect, useState } from "react";
import {
  deskLine,
  deskStrip,
  padBall,
  recapCallLabel,
  recapExtraClass,
  recapHeatPaint,
  recapToneClass,
  type DeskLineBlock,
  type RecapHeat,
  type RecapNational,
  type RecapPayload,
  type RecapRung,
  type RecapWashington,
} from "../lib/recapPayload";
import {
  formatRecapHeading,
  recapDayIso,
  recapJsonSrc,
  recapLogSrc,
} from "../lib/recapRoute";
import {
  OVERTIME_NOTE,
  overtimeNightRead,
  overtimeWatchClass,
  scoreOvertime,
} from "../lib/deskOvertime";

const SAME_ODDS =
  "Same hit odds as Quick Pick. The Ladder ranks scanned boards against official draw history.";

function RecapBalls({
  whites,
  extra,
  extraLabel,
  hits,
  extraHit,
}: {
  whites: number[];
  extra: number | null;
  extraLabel?: string | null;
  hits?: Set<number>;
  extraHit?: boolean;
}) {
  const extraCls = recapExtraClass(extraLabel);
  return (
    <div className="recap-balls">
      {whites.map((n) => (
        <span
          key={`w-${n}`}
          className={`recap-ball${hits?.has(n) ? " is-hit" : ""}`}
        >
          {padBall(n)}
        </span>
      ))}
      {extra != null && extraLabel ? (
        <span
          className={`recap-ball${extraCls ? ` ${extraCls}` : ""}${extraHit ? " is-hit" : ""}`}
        >
          {padBall(extra)}
        </span>
      ) : null}
    </div>
  );
}

function asDeskBlock(
  block: RecapNational | RecapWashington,
): DeskLineBlock {
  return {
    label: block.label,
    officialDate: block.officialDate,
    officialWhites: block.officialWhites,
    officialExtra: block.officialExtra,
    rungs: block.rungs,
    tone: "tone" in block ? block.tone : null,
    cashpot: "cashpot" in block ? block.cashpot : null,
    advertised: "advertised" in block ? block.advertised : null,
    cash: "cash" in block ? block.cash : null,
  };
}

function DeskCopy({ label, line }: { label: string; line: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(line).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <aside className="recap-desk-line">
      <div className="recap-desk-line-head">
        <p className="recap-desk-line-label">{label}</p>
        <button type="button" className="recap-desk-line-copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="recap-desk-line-text">{line}</p>
      <p className="recap-desk-line-meta">
        {line.length}/280 · Last night vs last night's Ladder. Not tonight's #1.
      </p>
    </aside>
  );
}

function DeskLine({
  block,
}: {
  block: RecapNational | RecapWashington;
}) {
  return <DeskCopy label="Desk line" line={deskLine(asDeskBlock(block))} />;
}

function DeskStrip({ payload }: { payload: RecapPayload }) {
  const strip = deskStrip([
    ...payload.national.map(asDeskBlock),
    ...payload.washington.map(asDeskBlock),
  ]);
  if (!strip) return null;
  return <DeskCopy label="Desk strip" line={strip} />;
}

function RecapCompare({
  officialDate,
  officialWhites,
  officialExtra,
  extraLabel,
  officialBoard,
  top,
}: {
  officialDate: string;
  officialWhites: number[];
  officialExtra: number | null;
  extraLabel?: string | null;
  officialBoard: string;
  top?: RecapRung;
}) {
  const hits = new Set(officialWhites);
  return (
    <div className="recap-compare">
      <div className="recap-slip">
        <p className="recap-slip-label">Official {officialDate}</p>
        <RecapBalls
          whites={officialWhites}
          extra={officialExtra}
          extraLabel={extraLabel}
        />
        <p className="recap-board">{officialBoard}</p>
      </div>
      {top ? (
        <div className="recap-slip">
          <p className="recap-slip-label">Last night #1</p>
          <RecapBalls
            whites={top.whites}
            extra={top.extra}
            extraLabel={extraLabel}
            hits={hits}
            extraHit={top.extraHit === true}
          />
          <p className="recap-board">{top.board}</p>
        </div>
      ) : null}
    </div>
  );
}

function RecapHeatGrid({
  heat,
  officialWhites,
  officialExtra,
  top,
}: {
  heat: RecapHeat | null | undefined;
  officialWhites: number[];
  officialExtra: number | null;
  top?: RecapRung;
}) {
  if (!heat) return null;
  const official = new Set(officialWhites);
  const ladder = new Set(top?.whites ?? []);
  const extraOfficial = new Set(officialExtra != null ? [officialExtra] : []);
  const extraLadder = new Set(top?.extra != null ? [top.extra] : []);
  const extraKind = recapExtraClass(heat.extraLabel);
  return (
    <figure className="recap-heat">
      <figcaption>
        Frequency before this drawing · {heat.draws} official draws. White
        rings are the official board. Yellow rings are last night's #1. Same
        hit odds as Quick Pick.
      </figcaption>
      <div className="recap-heat-grid">
        {recapHeatPaint(heat.whites).map((cell) => (
          <span
            key={`w-${cell.n}`}
            className={`recap-heat-cell${official.has(cell.n) ? " is-official" : ""}${ladder.has(cell.n) ? " is-ladder" : ""}`}
            style={{ background: cell.fill, color: cell.ink }}
            title={`${padBall(cell.n)} · ${cell.count} draws`}
          >
            {padBall(cell.n)}
          </span>
        ))}
      </div>
      {heat.extras.length ? (
        <>
          <p className="recap-heat-label">{heat.extraLabel || "Extra"}</p>
          <div className="recap-heat-grid">
            {recapHeatPaint(heat.extras).map((cell) => (
              <span
                key={`x-${cell.n}`}
                className={`recap-heat-cell${extraKind ? ` ${extraKind}` : ""}${extraOfficial.has(cell.n) ? " is-official" : ""}${extraLadder.has(cell.n) ? " is-ladder" : ""}`}
                style={{ background: cell.fill, color: cell.ink }}
                title={`${padBall(cell.n)} · ${cell.count} draws`}
              >
                {padBall(cell.n)}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </figure>
  );
}

function RungCard({
  rung,
  extraLabel,
  officialWhites,
}: {
  rung: RecapRung;
  extraLabel?: string | null;
  officialWhites: number[];
}) {
  const rankNote =
    rung.rank === 1
      ? " #1 is the strongest match to history before this drawing. Not the winning pick."
      : " Not the winning pick.";
  return (
    <article className="recap-rung">
      <p className="recap-rank">#{rung.rank}</p>
      <RecapBalls
        whites={rung.whites}
        extra={rung.extra}
        extraLabel={extraLabel}
        hits={new Set(officialWhites)}
        extraHit={rung.extraHit === true}
      />
      <p className="recap-board">{rung.board}</p>
      <p className="recap-match">
        {rung.matchLine}.{rankNote}
      </p>
      <p className="recap-meta">
        {rung.points} pts{rung.crowd ? ` · ${rung.crowd}` : ""}
      </p>
      <p className="recap-why">{rung.why}</p>
    </article>
  );
}

function NationalPanel({ block }: { block: RecapNational }) {
  return (
    <section className="panel recap-game">
      <header className="panel-head">
        <div>
          <p className="kicker">Last official · {block.label}</p>
          <h2>{block.label}</h2>
        </div>
      </header>
      <DeskLine block={block} />
      <RecapCompare
        officialDate={block.officialDate}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        extraLabel={block.extraLabel}
        officialBoard={block.officialBoard}
        top={block.rungs[0]}
      />
      <RecapHeatGrid
        heat={block.heat}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        top={block.rungs[0]}
      />
      <div className="recap-rungs">
        {block.rungs.map((rung) => (
          <RungCard
            key={rung.rank}
            rung={rung}
            extraLabel={block.extraLabel}
            officialWhites={block.officialWhites}
          />
        ))}
      </div>
      <div className={`verdict ${recapToneClass(block.tone)}`}>
        <strong>{recapCallLabel(block.tone)}</strong>
        <span>
          Tonight · unique-ticket EV {block.netEv} after 37% federal, 0% WA
          state. Advertised ${block.advertised} · cash ${block.cash}
          {block.nextDraw ? ` · next draw ${block.nextDraw}` : ""}.
        </span>
        <span>{block.advice}</span>
      </div>
      <a className="recap-ladder" href={block.ladderHref}>
        Open the live Ladder for tonight
        <span>
          {block.historyBefore} official draws sat under last night's ranking.
          Tonight's #1 is on the live desk, not on this page.
        </span>
      </a>
    </section>
  );
}

function WashingtonPanel({ block }: { block: RecapWashington }) {
  return (
    <section className="panel recap-game">
      <header className="panel-head">
        <div>
          <p className="kicker">{block.when}</p>
          <h2>{block.label}</h2>
        </div>
      </header>
      <DeskLine block={block} />
      <p className="fine">{block.prizeLine}</p>
      <RecapCompare
        officialDate={block.officialDate}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        extraLabel={block.extraLabel}
        officialBoard={block.officialBoard}
        top={block.rungs[0]}
      />
      <RecapHeatGrid
        heat={block.heat}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        top={block.rungs[0]}
      />
      <div className="recap-rungs">
        {block.rungs.map((rung) => (
          <RungCard
            key={rung.rank}
            rung={rung}
            extraLabel={block.extraLabel}
            officialWhites={block.officialWhites}
          />
        ))}
      </div>
      <a className="recap-ladder" href={block.ladderHref}>
        Open the live Ladder for tonight
        <span>
          {block.historyBefore} official draws sat under last night's ranking.
          Tonight's #1 is on the live desk, not on this page.
        </span>
      </a>
    </section>
  );
}

type RecapLogFile = { days?: string[] };

function sortNewestFirst(days: RecapPayload[]): RecapPayload[] {
  return [...days].sort((a, b) =>
    a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0,
  );
}

async function fetchRecapJson(src: string): Promise<RecapPayload | null> {
  const res = await fetch(src);
  if (!res.ok) return null;
  return res.json() as Promise<RecapPayload>;
}

async function loadRecapLog(pathname: string): Promise<RecapPayload[]> {
  const dated = recapDayIso(pathname);
  if (dated) {
    const day = await fetchRecapJson(recapJsonSrc(pathname));
    if (!day) throw new Error("missing");
    return [day];
  }

  const latest = await fetchRecapJson(recapJsonSrc("/recap"));
  if (!latest) throw new Error("missing");

  let dayIds = [latest.asOf];
  try {
    const res = await fetch(recapLogSrc());
    if (res.ok) {
      const log = (await res.json()) as RecapLogFile;
      if (Array.isArray(log.days) && log.days.length) dayIds = log.days;
    }
  } catch {
    /* latest only */
  }

  const prior = await Promise.all(
    dayIds
      .filter((day) => day !== latest.asOf)
      .map((day) => fetchRecapJson(`/recap/${day}.json`)),
  );
  return sortNewestFirst([
    latest,
    ...prior.filter((day): day is RecapPayload => day != null),
  ]);
}

function DayArticle({
  payload,
  expand,
}: {
  payload: RecapPayload;
  expand: boolean;
}) {
  const heading = formatRecapHeading(payload.asOf);
  const href = `/recap/${payload.asOf}`;
  return (
    <article className="panel recap-day" data-recap-day={payload.asOf}>
      <header className="recap-day-head">
        <p className="kicker">Night desk</p>
        <h2>
          <a className="recap-day-link" href={href}>
            {heading}
          </a>
        </h2>
      </header>
      <DeskStrip payload={payload} />
      {expand ? (
        <>
          {payload.notes.length ? (
            <p className="desk-status is-err">{payload.notes.join(" ")}</p>
          ) : null}
          {payload.national.map((block) => (
            <NationalPanel key={block.label} block={block} />
          ))}
          {payload.washington.map((block) => (
            <WashingtonPanel key={block.label} block={block} />
          ))}
        </>
      ) : (
        <p className="recap-open">
          <a href={href}>Open the slip</a>
        </p>
      )}
    </article>
  );
}

function OvertimePanel({ log }: { log: RecapPayload[] }) {
  const board = scoreOvertime(log);
  if (!board.mornings) return null;
  const night = board.lastNight
    ? overtimeNightRead(
        board.lastNight.nightLine,
        formatRecapHeading(board.lastNight.asOf),
      )
    : null;
  return (
    <aside className="panel recap-overtime" aria-label="Overtime">
      <header className="panel-head">
        <div>
          <p className="kicker">Overtime</p>
          <h2>Ladder #1–#3</h2>
        </div>
      </header>
      <p className="recap-overtime-across">{board.acrossLine}</p>
      <ul className="recap-overtime-games">
        {board.games.map((row) => (
          <li key={row.game}>{row.line}</li>
        ))}
      </ul>
      {night ? <p className="recap-overtime-night">{night}</p> : null}
      <dl className="recap-overtime-watches">
        <div>
          <dt>Any revenue</dt>
          <dd className={overtimeWatchClass(board.revenueWatch)}>
            {board.revenueWatch}
          </dd>
        </div>
        <div>
          <dt>Beat the house</dt>
          <dd className={overtimeWatchClass(board.houseWatch)}>
            {board.houseWatch}
          </dd>
        </div>
      </dl>
      <p className="fine recap-overtime-note">{OVERTIME_NOTE}</p>
    </aside>
  );
}

function RecapLabFooter({ archive }: { archive: boolean }) {
  return (
    <section className="panel desk-page">
      <header className="panel-head">
        <div>
          <p className="kicker">Live desk</p>
          <h2>Desk pick</h2>
        </div>
      </header>
      <p>
        {SAME_ODDS} This log is last night versus last night's Ladder.
        Entertainment, not prediction.
      </p>
      <p>
        Desk pick is the least-crowded board on the live desk. It is not a
        forecast and it is not tonight's #1. Stay on the desk if you already
        planned to play and want the lonelier mint.
      </p>
      <p>
        <a href="/lottery-lab.html">Lottery Lab</a> stays the proof page:
        models cannot beat Quick Pick. The Ladder ranks the past.
      </p>
      {archive ? (
        <p className="fine">
          <a href="/recap">Latest recap</a>
        </p>
      ) : null}
    </section>
  );
}

export function RecapView({ pathname }: { pathname: string }) {
  const [log, setLog] = useState<RecapPayload[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const archive = recapDayIso(pathname) != null;

  useEffect(() => {
    let live = true;
    setLog(null);
    setError(null);
    loadRecapLog(pathname)
      .then((days) => {
        if (live) setLog(days);
      })
      .catch(() => {
        if (live) setError("The recap is not ready on this desk yet.");
      });
    return () => {
      live = false;
    };
  }, [pathname]);

  if (error) {
    return (
      <section className="panel desk-page">
        <header className="panel-head">
          <div>
            <p className="kicker">Night desk</p>
            <h2>Recap</h2>
          </div>
        </header>
        <p className="desk-status is-err">{error}</p>
      </section>
    );
  }

  if (!log) {
    return (
      <section className="panel desk-page">
        <header className="panel-head">
          <div>
            <p className="kicker">Night desk</p>
            <h2>Recap</h2>
          </div>
        </header>
        <p className="fine">Loading last night's boards…</p>
      </section>
    );
  }

  return (
    <div className="recap-main">
      <OvertimePanel log={log} />
      {log.map((day, index) => (
        <DayArticle
          key={day.asOf}
          payload={day}
          expand={archive || index === 0}
        />
      ))}
      <RecapLabFooter archive={archive} />
    </div>
  );
}
