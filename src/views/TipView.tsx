import { TIP_JAR_URL } from "../config";
import { trackEvent } from "../lib/analytics";

type Props = {
  onWrite: () => void;
};

export function TipView({ onWrite }: Props) {
  return (
    <section className="panel desk-page" aria-label="Tip the desk">
      <header className="panel-head">
        <div>
          <p className="kicker">Desk</p>
          <h2>Tip the desk</h2>
        </div>
      </header>
      <p>
        The desk is free. No account. Same hit odds as Quick Pick. A tip is
        optional coffee money for hosting, Actions minutes, and the archives
        that keep appending.
      </p>
      <p>
        It is not a Desk pass. It does not unlock ranks. It does not buy
        winning numbers. It does not raise the chance of a hit.
      </p>
      {TIP_JAR_URL ? (
        <>
          <p>
            <a
              className="primary desk-jar"
              href={TIP_JAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("tip_click", { page_path: "/tip" })}
            >
              Open the tip jar
            </a>
          </p>
          <p className="fine">
            The jar is a third-party checkout. JackpotDesk never sees your card.
          </p>
        </>
      ) : (
        <p className="lede">
          The jar is not open yet.{" "}
          <button type="button" className="text-link" onClick={onWrite}>
            Write the desk
          </button>{" "}
          if you want to be told when it is. Do not send card numbers.
        </p>
      )}
    </section>
  );
}
