import { recapEmbedSrc } from "../lib/recapRoute";

export function RecapView({ pathname }: { pathname: string }) {
  return (
    <section className="panel recap-panel">
      <header className="panel-head">
        <div>
          <p className="kicker">Scored replay</p>
          <h2>Recap</h2>
        </div>
        <a href="/recap" target="_top">
          Open /recap
        </a>
      </header>
      <iframe
        className="recap-embed"
        src={recapEmbedSrc(pathname)}
        title="Last night versus The Ladder"
      />
    </section>
  );
}
