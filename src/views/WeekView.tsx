import { Ball } from "../components/Ball";
import { DrawCountdown } from "../components/DrawCountdown";
import { MarketBoard } from "../components/MarketBoard";
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
            they split less — hit chance stays the same.
          </p>
        </div>
      </div>

      {props.latest ? (
        <div className="last-draw">
          <p className="kicker">Last official draw · {props.latest.date}</p>
          <div className="ticket-row">
            {props.latest.whites.map((n) => (
              <Ball key={n} value={n} />
            ))}
            <Ball value={props.latest.extra} extra />
          </div>
        </div>
      ) : null}

      {props.marketNote ? <p className="fine">{props.marketNote}</p> : null}
      {props.marketError ? (
        <p className="warn">
          {props.marketError}. Official lottery homepages block the browser, so
          we load the national jackpot from California Lottery’s public feed.
          Enter advertised and cash by hand if that feed is down.
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

      <MarketBoard game={props.game} result={result} />

      <div className="ev-pair">
        <EvCard scenario={result.unique} cost={cost} />
        <EvCard scenario={result.crowded} cost={cost} dim />
      </div>

      <aside className={`advice advice-${advice.tone}`}>
        <strong>
          {advice.tone === "no"
            ? "Sit it out"
            : advice.tone === "entertain"
              ? "Entertainment only"
              : "Rare — still not an investment"}
        </strong>
        <p>{advice.text}</p>
        <p className="fine">
          Unique ticket EV {moneyExact.format(result.unique.netEv)} vs crowded{" "}
          {moneyExact.format(result.crowded.netEv)} on a {cost} ticket.
          JackpotDesk does not sell numbers and does not raise the chance you
          win.
        </p>
      </aside>
    </section>
  );
}

function EvCard({
  scenario,
  cost,
  dim = false,
}: {
  scenario: ReturnType<typeof computeEv>["unique"];
  cost: string;
  dim?: boolean;
}) {
  return (
    <article className={dim ? "ev-card dim" : "ev-card"}>
      <h3>{scenario.label}</h3>
      <p className={scenario.netEv >= 0 ? "ev-net plus" : "ev-net minus"}>
        {moneyExact.format(scenario.netEv)}
      </p>
      <p className="fine">expected value after the {cost} cost</p>
      <dl>
        <div>
          <dt>Expected other jackpot winners</dt>
          <dd>{scenario.lambda.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Your share if you hit</dt>
          <dd>{(scenario.shareFactor * 100).toFixed(0)}%</dd>
        </div>
        <div>
          <dt>Jackpot piece of EV</dt>
          <dd>{moneyExact.format(scenario.jackpotEv)}</dd>
        </div>
      </dl>
    </article>
  );
}
