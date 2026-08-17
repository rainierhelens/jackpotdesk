type Point = {
  label: string;
  text: string;
};

const POINTS: Point[] = [
  {
    label: "Shop the line",
    text: "Price the cash jackpot, tax, and split risk before you buy. Most weeks the ticket is a bad bet. This tab says so.",
  },
  {
    label: "Fade the public",
    text: "Birthdays and 1-2-3-4-5 hit just as often — then get shared. Uncrowded random tickets do not win more. They split less.",
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
        Same hit chance as Quick Pick. The edge is not predicting numbers. It is
        skipping crowded tickets and skipping drawings that are not worth the
        stake.
      </p>
      <div className="why-grid">
        {POINTS.map((point) => (
          <article key={point.label}>
            <h3>{point.label}</h3>
            <p>{point.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
