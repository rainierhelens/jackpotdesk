import type { GameId } from "../types";
import {
  computeEv,
  formatCompact,
  money,
  moneyExact,
  parseMoney,
  playAdvice,
  type EvInputs,
} from "../lib/ev";
import { GAMES } from "../lib/prizes";

type Props = {
  game: GameId;
  advertised: string;
  cash: string;
  sold: string;
  federal: string;
  state: string;
  humanShare: string;
  onAdvertised: (v: string) => void;
  onCash: (v: string) => void;
  onSold: (v: string) => void;
  onFederal: (v: string) => void;
  onState: (v: string) => void;
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

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <p className="kicker">This drawing · {spec.label}</p>
          <h2>Line on this drawing</h2>
        </div>
      </header>

      <div className="benefit">
        <div>
          <strong>Benefit</strong>
          <p>
            Know the real price of the $2 before you buy. Unique tickets have a
            slightly better expected payout than birthday tickets because they
            split less — hit chance stays the same.
          </p>
        </div>
      </div>

      <p className="lede">
        Jackpot odds are 1 in {spec.jackpotOdds.toLocaleString("en-US")}. The
        advertised annuity is not what you would be paid. Enter the cash value,
        an estimate of tickets sold, and tax. Unique tickets split less often
        than birthday tickets.
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
          State tax %
          <input
            value={props.state}
            onChange={(e) => props.onState(e.target.value)}
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
        (fixed prizes, no Power Play): {moneyExact.format(result.lowerEv)}.
        Birthday subspace is {result.birthdayComboCount.toLocaleString("en-US")}{" "}
        combinations vs {result.fullComboCount.toLocaleString("en-US")} total.
        Suffixes like 1.2B and 400M are allowed.
      </p>

      <div className="ev-pair">
        <EvCard scenario={result.unique} />
        <EvCard scenario={result.crowded} dim />
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
          {moneyExact.format(result.crowded.netEv)} on a {formatCompact(spec.ticketCost)}{" "}
          ticket. JackpotDesk does not sell numbers and does not raise the chance
          you win.
        </p>
      </aside>
    </section>
  );
}

function EvCard({
  scenario,
  dim = false,
}: {
  scenario: ReturnType<typeof computeEv>["unique"];
  dim?: boolean;
}) {
  return (
    <article className={dim ? "ev-card dim" : "ev-card"}>
      <h3>{scenario.label}</h3>
      <p className={scenario.netEv >= 0 ? "ev-net plus" : "ev-net minus"}>
        {moneyExact.format(scenario.netEv)}
      </p>
      <p className="fine">expected value after the $2 cost</p>
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
