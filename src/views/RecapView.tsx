import { useEffect, useState } from "react";
import {
  padBall,
  recapCallLabel,
  recapExtraClass,
  recapToneClass,
  type RecapNational,
  type RecapPayload,
  type RecapRung,
  type RecapWashington,
} from "../lib/recapPayload";
import { recapJsonSrc } from "../lib/recapRoute";

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

function RungCard({ rung }: { rung: RecapRung }) {
  const rankNote =
    rung.rank === 1
      ? " #1 is the strongest match to history before this drawing. Not the winning pick."
      : " Not the winning pick.";
  return (
    <article className="recap-rung">
      <p className="recap-rank">#{rung.rank}</p>
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
      <RecapCompare
        officialDate={block.officialDate}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        extraLabel={block.extraLabel}
        officialBoard={block.officialBoard}
        top={block.rungs[0]}
      />
      <div className="recap-rungs">
        {block.rungs.map((rung) => (
          <RungCard key={rung.rank} rung={rung} />
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
      <p className="fine">{block.prizeLine}</p>
      <RecapCompare
        officialDate={block.officialDate}
        officialWhites={block.officialWhites}
        officialExtra={block.officialExtra}
        extraLabel={block.extraLabel}
        officialBoard={block.officialBoard}
        top={block.rungs[0]}
      />
      <div className="recap-rungs">
        {block.rungs.map((rung) => (
          <RungCard key={rung.rank} rung={rung} />
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

export function RecapView({ pathname }: { pathname: string }) {
  const [payload, setPayload] = useState<RecapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(recapJsonSrc(pathname))
      .then((res) => {
        if (!res.ok) throw new Error("missing");
        return res.json() as Promise<RecapPayload>;
      })
      .then((data) => {
        if (live) setPayload(data);
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
            <p className="kicker">Scored replay</p>
            <h2>Recap</h2>
          </div>
        </header>
        <p className="desk-status is-err">{error}</p>
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="panel desk-page">
        <header className="panel-head">
          <div>
            <p className="kicker">Scored replay</p>
            <h2>Recap</h2>
          </div>
        </header>
        <p className="fine">Loading last night's boards…</p>
      </section>
    );
  }

  return (
    <div className="recap-main">
      <section className="panel desk-page">
        <header className="panel-head">
          <div>
            <p className="kicker">Scored replay</p>
            <h2>Recap</h2>
          </div>
          <p className="fine">Built {payload.asOf} from the latest official draws.</p>
        </header>
        <p>
          {SAME_ODDS} This page is last night's official results against the
          Ladder that was live before those numbers landed. Entertainment, not
          prediction. Rank #1 is the strongest match to the past, never the
          winning pick.
        </p>
        {payload.notes.length ? (
          <p className="desk-status is-err">{payload.notes.join(" ")}</p>
        ) : null}
      </section>
      {payload.national.map((block) => (
        <NationalPanel key={block.label} block={block} />
      ))}
      {payload.washington.map((block) => (
        <WashingtonPanel key={block.label} block={block} />
      ))}
      <section className="panel desk-page">
        <header className="panel-head">
          <div>
            <p className="kicker">Live desk</p>
            <h2>Desk pick</h2>
          </div>
        </header>
        <p>
          Desk pick is the least-crowded board on the live desk. It is not a
          forecast and it is not tonight's #1. Stay on the desk if you already
          planned to play and want the lonelier mint.
        </p>
        <p>
          <a href="/lottery-lab.html">Lottery Lab</a> stays the proof page:
          models cannot beat Quick Pick. The Ladder ranks the past.
        </p>
      </section>
    </div>
  );
}
