import { useEffect, useState } from "react";
import { GAMES } from "../lib/prizes";
import {
  drawUrgency,
  formatDrawWhen,
  formatRemainCompact,
  formatRemainFull,
  resolveDraw,
} from "../lib/nextDraw";
import type { GameId } from "../types";

type Props = {
  game: GameId;
  feedDate: string | null;
  latestDate: string | null;
  compact?: boolean;
};

export function DrawCountdown({
  game,
  feedDate,
  latestDate,
  compact = false,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const phase = resolveDraw(game, feedDate, latestDate, now);
  const spec = GAMES[game];
  const remain = phase.at.getTime() - now;
  const urgency = drawUrgency(remain, phase.status);
  const when = `${formatDrawWhen(phase.date)} · ${phase.timeLabel}`;
  const className = `draw-clock urgent-${urgency}`;

  if (compact) {
    const line =
      phase.status === "waiting"
        ? `${spec.label} · Drawing`
        : `${spec.label} · ${phase.weekday} · ${formatRemainCompact(remain)}`;
    return (
      <p className={`${className} compact`} title={when}>
        {line}
      </p>
    );
  }

  return (
    <div className={`${className} corner`}>
      <p className="kicker">
        {phase.status === "waiting" ? "Drawing" : "Next drawing"}
      </p>
      {phase.status === "waiting" ? (
        <p className="draw-remain">Waiting</p>
      ) : (
        <p className="draw-remain">{formatRemainFull(remain)}</p>
      )}
      <p className="draw-when">
        {phase.status === "waiting"
          ? "Official numbers pending"
          : `${phase.weekday} · ${phase.timeLabel}`}
      </p>
    </div>
  );
}
