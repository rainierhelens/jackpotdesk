import { FeedMark, type FeedKind } from "./FeedMark";
import { FlashNum } from "./Flash";
import { moneyExact } from "../lib/ev";
import { WA_GAMES } from "../lib/waGames";
import { hit5CashpotEv, lottoCashEvPerDollar, waPrizeInputs } from "../lib/waValue";
import type { WaGameId } from "../types";

type Props = {
  game: WaGameId;
  asOf: string;
  feed?: FeedKind;
  cashpot: string;
  advertised: string;
  cash: string;
  onCashpot: (v: string) => void;
  onAdvertised: (v: string) => void;
  onCash: (v: string) => void;
};

function WaFeedLine({ feed, asOf }: { feed: FeedKind; asOf: string }) {
  return (
    <p className="fine">
      <FeedMark feed={feed} /> · Washington’s Lottery · {asOf}.
    </p>
  );
}

export function WaValue({
  game,
  asOf,
  feed = "baked",
  cashpot,
  advertised,
  cash,
  onCashpot,
  onAdvertised,
  onCash,
}: Props) {
  const prizes = waPrizeInputs(cashpot, advertised, cash);

  if (game === "hit5") {
    const share = hit5CashpotEv(prizes.cashpot);
    return (
      <section className="wa-value">
        <p className="kicker">This drawing · Hit 5</p>
        <h3>Line on the cashpot</h3>
        <p>
          Cashpot{" "}
          <FlashNum value={prizes.cashpot}>
            {moneyExact.format(prizes.cashpot)}
          </FlashNum>{" "}
          · 1 in {WA_GAMES.hit5.jackpotOdds.toLocaleString("en-US")} · about{" "}
          {moneyExact.format(share)} of the $1 is the cashpot before $150 / $15 /
          free-ticket prizes. Washington has no state income tax. Overwrite if
          the Lottery has moved.
        </p>
        <label>
          Cashpot
          <input
            value={cashpot}
            onChange={(e) => onCashpot(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <WaFeedLine feed={feed} asOf={asOf} />
      </section>
    );
  }

  if (game === "lotto") {
    const share = lottoCashEvPerDollar(prizes.cash);
    return (
      <section className="wa-value">
        <p className="kicker">This drawing · Lotto</p>
        <h3>Line on the jackpot</h3>
        <p>
          Advertised{" "}
          <FlashNum value={prizes.advertised}>
            {moneyExact.format(prizes.advertised)}
          </FlashNum>{" "}
          · cash option{" "}
          <FlashNum value={prizes.cash}>
            {moneyExact.format(prizes.cash)}
          </FlashNum>{" "}
          · $1 buys two plays · 1 in{" "}
          {WA_GAMES.lotto.jackpotOdds.toLocaleString("en-US")} each · about{" "}
          {moneyExact.format(share)} of the dollar is the cash jackpot before
          lower prizes. Annuity is not what you are paid. Overwrite if the
          Lottery has moved.
        </p>
        <div className="wa-value-fields">
          <label>
            Advertised jackpot
            <input
              value={advertised}
              onChange={(e) => onAdvertised(e.target.value)}
              inputMode="decimal"
            />
          </label>
          <label>
            Cash option
            <input
              value={cash}
              onChange={(e) => onCash(e.target.value)}
              inputMode="decimal"
            />
          </label>
        </div>
        <WaFeedLine feed={feed} asOf={asOf} />
      </section>
    );
  }

  if (game === "match4") {
    return (
      <section className="wa-value">
        <p className="kicker">Match 4</p>
        <p>
          Top prize is a fixed $10,000 (1 in 10,626). It does not roll. Pattern
          and last-draw fades still matter for splits. Birthday fade is off —
          the field is 1–24.
        </p>
        <WaFeedLine feed={feed} asOf={asOf} />
      </section>
    );
  }

  return (
    <section className="wa-value">
      <p className="kicker">Cash Pop</p>
      <p>
        $5 per POP. One number from 1–15 is drawn. The prize is printed at the
        register ($25–$500) — Desk cannot mint it. More POPs is more budget,
        not better odds. We fade 1, 7, 11, 13, and 15.
      </p>
      <WaFeedLine feed={feed} asOf={asOf} />
    </section>
  );
}
