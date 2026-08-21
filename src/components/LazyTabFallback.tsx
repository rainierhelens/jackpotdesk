/** Shown while a lazy desk tab chunk loads. Recap and Write stay eager. */
export function LazyTabFallback() {
  return (
    <section className="panel" aria-busy="true" aria-live="polite">
      <header className="panel-head">
        <div>
          <p className="kicker">JackpotDesk</p>
          <p className="fine">Loading…</p>
        </div>
      </header>
    </section>
  );
}
