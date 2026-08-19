import type { HeatBook, HeatCell } from "../lib/lotteryHeat";
import {
  scoreTicket,
  type PatternModel,
} from "../lib/patternLab";
import { pad2 } from "../lib/picks";
import {
  crowdRemainders,
  heatRemainders,
  partialCrowd,
  patternRemainders,
  type HintChip,
} from "../lib/slipHints";

type Props = {
  whites: number[];
  extra: number | null;
  pick: number;
  extraLabel: string;
  book: HeatBook | null;
  patternModel: PatternModel | null;
  crowdWhite: number[] | null;
  crowdSpecial: number[] | null;
  onToggleWhite: (n: number) => void;
  onToggleExtra: (n: number) => void;
};

function pointsTone(points: number): string {
  if (points >= 58) return "is-gold";
  if (points <= 45) return "is-flat";
  return "is-green";
}

function crowdTone(index: number): string {
  if (index <= 0.9) return "is-green";
  if (index >= 1.1) return "is-red";
  return "is-flat";
}

function heatFact(cell: HeatCell): string {
  const gap = cell.gapDays <= 0 ? "last draw" : `${cell.gapDays}d`;
  const vs =
    cell.deviation === 0
      ? "at chance"
      : `${cell.deviation > 0 ? "+" : ""}${cell.deviation.toFixed(1)}`;
  return `${pad2(cell.n)} ${gap} ${vs}`;
}

function patternBits(
  whites: number[],
  pick: number,
  extra: number | null,
): string {
  const bits: string[] = [];
  if (whites.length >= 1) bits.push("freq", "hot");
  if (whites.length >= 2) bits.push("pairs");
  if (whites.length === pick) bits.push("shape");
  if (extra != null) bits.push("special");
  return bits.join(" · ");
}

function ChipRow({
  chips,
  onWhite,
  onExtra,
}: {
  chips: HintChip[];
  onWhite: (n: number) => void;
  onExtra: (n: number) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="desk-hint-chips">
      {chips.map((chip) => (
        <button
          key={`${chip.kind}-${chip.n}`}
          type="button"
          className={`desk-hint-chip${chip.kind === "extra" ? " is-extra" : ""}`}
          title={chip.why}
          onClick={() =>
            chip.kind === "extra" ? onExtra(chip.n) : onWhite(chip.n)
          }
        >
          {pad2(chip.n)}
        </button>
      ))}
    </div>
  );
}

/**
 * Live named hints for an open slip. Heat, crowd, and pattern stay
 * three rows. Clicking a chip fills the next slot. Same hit odds.
 */
export function DeskHints({
  whites,
  extra,
  pick,
  extraLabel,
  book,
  patternModel,
  crowdWhite,
  crowdSpecial,
  onToggleWhite,
  onToggleExtra,
}: Props) {
  const started = whites.length > 0 || extra != null;
  if (!started) return null;

  const heat = book ? heatRemainders(book, whites) : null;
  const pattern = patternModel ? patternRemainders(patternModel, whites) : [];
  const crowd = crowdWhite
    ? crowdRemainders(crowdWhite, whites, undefined, crowdSpecial, extra)
    : null;
  const extraWeight =
    crowdSpecial && extra != null ? (crowdSpecial[extra - 1] ?? 1) : null;
  const crowdIndex = crowdWhite
    ? partialCrowd(crowdWhite, whites, extraWeight)
    : null;
  const score =
    patternModel && whites.length > 0
      ? scoreTicket(patternModel, whites, extra)
      : null;

  const pickedHeat = book
    ? whites
        .map((n) => book.whites.find((cell) => cell.n === n))
        .filter((cell): cell is HeatCell => Boolean(cell))
    : [];
  const extraCell =
    book && extra != null
      ? (book.extras.find((cell) => cell.n === extra) ?? null)
      : null;

  const showHeat = Boolean(book);
  const showCrowd = Boolean(crowdWhite);
  const showPattern = Boolean(patternModel && whites.length > 0);
  if (!showHeat && !showCrowd && !showPattern) return null;

  return (
    <section className="desk-hints" aria-label="Desk hints">
      <header className="desk-hints-head">
        <h3>Desk hints</h3>
        <span className="desk-hints-meta">Three sources · not one score</span>
      </header>

      {showHeat && book ? (
        <div className="desk-hint-row">
          <div className="desk-hint-label">
            <span>This window</span>
            <em title="Official-draw frequency in this Heat window. Same hit odds as Quick Pick.">
              Heat
            </em>
          </div>
          {pickedHeat.length > 0 || extraCell ? (
            <p className="desk-hint-facts">
              {pickedHeat.map(heatFact).join(" · ")}
              {extraCell
                ? `${pickedHeat.length ? " · " : ""}${extraLabel} ${heatFact(extraCell)}`
                : ""}
            </p>
          ) : null}
          {heat && heat.overChance.length > 0 ? (
            <div className="desk-hint-group">
              <span>Over chance</span>
              <ChipRow
                chips={heat.overChance}
                onWhite={onToggleWhite}
                onExtra={onToggleExtra}
              />
            </div>
          ) : null}
          {heat && heat.longestGap.length > 0 ? (
            <div className="desk-hint-group">
              <span>Longest gap</span>
              <ChipRow
                chips={heat.longestGap}
                onWhite={onToggleWhite}
                onExtra={onToggleExtra}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showCrowd && crowd ? (
        <div className="desk-hint-row">
          <div className="desk-hint-label">
            <span>Crowd</span>
            {crowdIndex != null ? (
              <em className={`desk-hint-score ${crowdTone(crowdIndex)}`}>
                {crowdIndex.toFixed(2)}×
              </em>
            ) : null}
          </div>
          <p
            className="desk-hint-facts"
            title="Crowd pick-rate of the numbers on the slip. Lower is lonelier if the board hits. Not a hit-odds change."
          >
            Running pick-rate of this tray. 1.00× is the random-play rate.
          </p>
          {crowd.whites.length > 0 ? (
            <div className="desk-hint-group">
              <span>Lonely whites</span>
              <ChipRow
                chips={crowd.whites}
                onWhite={onToggleWhite}
                onExtra={onToggleExtra}
              />
            </div>
          ) : null}
          {crowd.extras.length > 0 ? (
            <div className="desk-hint-group">
              <span>Lonely {extraLabel || "extra"}</span>
              <ChipRow
                chips={crowd.extras}
                onWhite={onToggleWhite}
                onExtra={onToggleExtra}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showPattern && score ? (
        <div className="desk-hint-row">
          <div className="desk-hint-label">
            <span>Pattern</span>
            <em
              className={`desk-hint-score ${pointsTone(score.points)}`}
              title="Fit to the past. 50 points = average random ticket of this size. Same hit odds as Quick Pick."
            >
              {score.points} PTS
            </em>
          </div>
          <p className="desk-hint-facts">
            {patternBits(whites, pick, extra)}. 50 points = average
            random ticket of this size.
          </p>
          {pattern.length > 0 ? (
            <div className="desk-hint-group">
              <span>Pair partners</span>
              <ChipRow
                chips={pattern}
                onWhite={onToggleWhite}
                onExtra={onToggleExtra}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="fine desk-hints-note">
        Same hit odds as Quick Pick. Clicking a hint fills a slot. It does
        not change hit odds.
      </p>
    </section>
  );
}
