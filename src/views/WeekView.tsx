import { Ball } from "../components/Ball";
import { DrawCountdown } from "../components/DrawCountdown";
import { FeedMark } from "../components/FeedMark";
import { MarketBoard } from "../components/MarketBoard";
import artWeek from "../images/This-Week.jpg";
import type { GameId } from "../types";
import {
  computeEv,
  money,
  moneyExact,
  parseMoney,
  playAdvice,
  type EvInputs,
} from "../lib/ev";
import { GAMES } from "../lib/prizes";
import { TAX_STATES, taxStateById } from "../lib/stateTax";
import type { OfficialDraw } from "../lib/winners";

type Props = {
  game: GameId;
  advertised: string;
  cash: string;
  sold: string;
  federal: string;
  state: string;
  stateId: string;
  humanShare: string;
  latest: OfficialDraw | null;
  nextDrawDate: string | null;
  marketNote: string | null;
  marketError: string | null;
  onAdvertised: (v: string) => void;
  onCash: (v: string) => void;
  onSold: (v: string) => void;
  onFederal: (v: string) => void;
  onState: (v: string) => void;
  onStateId: (v: string) => void;
  onHumanShare: (v: string) => void;
  onBuildSlip: () => void;
};

function toInputs(props: Props): EvInputs {
  const advertisedJackpot = parseMoney(props.advertised);
  const cashParsed = parseMoney(props.cash);
  return {
    advertisedJackpot,
    cashJackpot: cashParsed > 0 ? cashParsed : advertisedJackpot * 0.46,
    ticketsSold: parseMoney(props.sold),
    federalTax: Number(props.federal) / 100,
    stateTax: Number(props.state) / 100,
    humanTicketShare: Number(props.humanShare) / 100,
  };
}

export function WeekView(props: Props) {
  const spec = GAMES[props.game];
  const inputs = toInputs(props);
  const result = computeEv(props.game, inputs);
  const advice = playAdvice(result.unique.netEv);
  const cost = moneyExact.format(spec.ticketCost);
  const selected = taxStateById(props.stateId);

  function onStatePick(id: string) {
    props.onStateId(id);
    const row = taxStateById(id);
    if (row && id !== "custom") props.onState(String(row.rate));
  }

  return (
    <section className="panel">
      <div className="panel-wash" aria-hidden="true">
        <img src={artWeek} alt="" />
      </div>
      <header className="panel-head">
        <div>
          <p className="kicker">This drawing · {spec.label}</p>
          <h2>Line on this drawing</h2>
        </div>
        <DrawCountdown
          game={props.game}
          feedDate={props.nextDrawDate}
          latestDate={props.latest?.date ?? null}
        />
      </header>

      <div className="benefit">
        <div>
          <strong>Benefit</strong>
          <p>
            Know the real price of the {cost} before you buy. Unique tickets
            have a slightly better expected payout than birthday tickets because
            they split less. Hit chance stays the same.
          </p>
        </div>
      </div>

      {props.latest ? (
        <div className="last-draw">
          <p className="kicker">Last official draw · {props.latest.date}</p>
          <p className="fine">
            <FeedMark feed="live" /> · NY Open Data
          </p>
          <div className="ticket-row">
            {props.latest.whites.map((n) => (
              <Ball key={n} value={n} />
            ))}
            <Ball value={props.latest.extra} extra />
          </div>
        </div>
      ) : null}

      {props.marketError ? (
        <p className="warn">
          {props.marketError}. Official lottery homepages block the browser, so
          we load the national jackpot from a Worker cache of California
          Lottery’s public feed, or the last site build. Enter advertised and
          cash by hand if you want a newer figure.
        </p>
      ) : props.marketNote?.startsWith("Loading") ? (
        <p className="fine">{props.marketNote}</p>
      ) : props.marketNote ? (
        <p className="fine">
          <FeedMark
            feed={
              props.marketNote?.includes("Last site build") ? "baked" : "live"
            }
          />{" "}
          ·{" "}
          {props.marketNote?.includes("Last site build")
            ? "Last site build · California Lottery jackpot"
            : "California Lottery (national jackpot)"}
          {props.nextDrawDate ? ` · next draw ${props.nextDrawDate}` : ""}.
          Tickets sold is an estimate. Edit any field.
        </p>
      ) : null}

      <p className="lede">
        Jackpot odds are 1 in {spec.jackpotOdds.toLocaleString("en-US")}. A{" "}
        {spec.label} ticket is {cost}. The advertised annuity is not what you
        would be paid. Cash value, tax, and tickets sold still drive the line.
        Unique tickets split less often than birthday tickets.
      </p>

      <div className="form-grid">
        <label>
          Advertised jackpot
          <input
            value={props.advertised}
            onChange={(e) => props.onAdvertised(e.target.value)}
            placeholder="1.2B"
          />
        </label>
        <label>
          Cash value (lump sum)
          <input
            value={props.cash}
            onChange={(e) => props.onCash(e.target.value)}
            placeholder="460M"
          />
        </label>
        <label>
          Tickets sold (estimate)
          <input
            value={props.sold}
            onChange={(e) => props.onSold(e.target.value)}
            placeholder="180M"
          />
        </label>
        <label>
          Federal tax %
          <input
            value={props.federal}
            onChange={(e) => props.onFederal(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          Claim state
          <select
            value={props.stateId}
            onChange={(e) => onStatePick(e.target.value)}
          >
            {TAX_STATES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.id === "custom" || s.id === "none" ? "" : ` · ${s.rate}%`}
              </option>
            ))}
          </select>
        </label>
        <label>
          State tax %
          <input
            value={props.state}
            onChange={(e) => {
              props.onStateId("custom");
              props.onState(e.target.value);
            }}
            inputMode="decimal"
          />
        </label>
        <label>
          Share of “human” tickets %
          <input
            value={props.humanShare}
            onChange={(e) => props.onHumanShare(e.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>

      <p className="fine">
        After-tax cash used: {money.format(result.afterTaxCash)}. Lower-tier EV
        (fixed prizes, no multiplier): {moneyExact.format(result.lowerEv)}.
        Federal {props.federal}% is a top ordinary-income sketch; IRS withholds
        24% on large prizes. State {props.state}%
        {selected?.note ? ` (${selected.note})` : ""}. Tickets sold is an
        estimate unless you replace it. Suffixes like 1.2B and 400M are allowed.
      </p>

      <MarketBoard
        game={props.game}
        result={result}
        feedDate={props.nextDrawDate}
        latestDate={props.latest?.date ?? null}
      />

      <aside className={`advice advice-${advice.tone}`}>
        <strong>
          {advice.tone === "no"
            ? "Sit it out"
            : advice.tone === "entertain"
              ? "Entertainment only"
              : "Rare, and still not an investment"}
        </strong>
        <p>{advice.text}</p>
        <p className="fine">
          Unique ticket EV {moneyExact.format(result.unique.netEv)} vs crowded{" "}
          {moneyExact.format(result.crowded.netEv)} on a {cost} ticket.
          JackpotDesk does not sell numbers and does not raise the chance you
          win.
        </p>
      </aside>

      <div className="week-next">
        <button type="button" className="primary" onClick={props.onBuildSlip}>
          Build the slip
        </button>
      </div>
    </section>
  );
}
