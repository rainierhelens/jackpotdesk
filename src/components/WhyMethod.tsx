type Point = {
  label: string;
  text: string;
};

const POINTS: Point[] = [
  {
    label: "Climb the ladder",
    text: "The Ladder ranks scanned boards by how well they match official history: frequency, pairs, recent heat, and winning shapes. Rank #1 is the strongest fit to the past, not a forecast. Same hit odds as Quick Pick.",
  },
  {
    label: "Measure the crowd",
    text: "We fit pick rates from official per-tier winner counts, refreshed daily. That is what powers the number heat, the co-winner index, and Desk pick. Measured data, not vibes.",
  },
  {
    label: "Shop the line",
    text: "Price the cash jackpot, tax, and split risk before you buy. Most weeks the ticket is a bad bet. This tab says so.",
  },
  {
    label: "Fade the public",
    text: "Birthdays, 1-2-3-4-5, and this window’s hot numbers hit just as often, then get shared. Uncrowded random tickets do not win more. They split less.",
  },
  {
    label: "Run the board",
    text: "A pool is just more tickets plus bookkeeping. Track shares, mint unique slips, split a hit. Same odds per dollar.",
  },
];

export function WhyMethod() {
  return (
    <section className="why" aria-label="Why this method">
      <p className="why-lead">
        Same hit chance as Quick Pick. The product is The Ladder: a scored
        replay of the past, best first. A free experiment, not a forecast.
        Winner-count archives are append-only, so the ranking compounds as new
        official draws land. We do not predict the next drawing.
      </p>
      <div className="why-grid">
        {POINTS.map((point) => (
          <article key={point.label}>
            <h3>{point.label}</h3>
            <p>{point.text}</p>
          </article>
        ))}
      </div>
      <p className="why-lab">
        <a href="/recap">Recap:</a> official results versus the
        Ladder that was live before those numbers. A scored replay, not
        tonight’s tip sheet.{" "}
        <a href="/lottery-lab.html">Lottery Lab:</a> models cannot beat Quick
        Pick. The Ladder ranks the past. It does not change the odds.
      </p>
    </section>
  );
}
