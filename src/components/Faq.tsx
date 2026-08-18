export function Faq() {
  const items = [
    {
      q: "Does JackpotDesk increase my chance of winning the lottery?",
      a: "No. Every legal Powerball or Mega Millions combination has the same hit odds. This tool does not predict numbers.",
    },
    {
      q: "Can ChatGPT or an AI model pick winning lottery numbers?",
      a: (
        <>
          No. Language models predict the next word. Mixer balls do not follow a
          prompt. Hit odds stay the published odds.{" "}
          <a href="/lottery-lab.html">Lottery Lab</a> is the short version: we
          asked the model; it cannot beat Quick Pick; here is an uncrowded slip
          instead.
        </>
      ),
    },
    {
      q: "Then what is the benefit?",
      a: "Two things. First, it prices the drawing using cash value, tax, and split risk so you can skip a bad ticket. Second, it mints random tickets that avoid birthdays, sequences, last night’s whites, recent winners, hot/cold numbers, and repeats on the same slip so a jackpot is less likely to be shared.",
    },
    {
      q: "Is this the same as Quick Pick?",
      a: "The numbers are still random. Quick Pick can land on crowded public tickets. JackpotDesk redraws those. Hit chance is unchanged. Expected payout if you hit the jackpot is slightly better.",
    },
    {
      q: "Do I need an account?",
      a: "No. Pool members and tickets stay in this browser only. Nothing is uploaded.",
    },
    {
      q: "Where do the jackpot numbers come from?",
      a: "Last-draw numbers for Powerball and Mega Millions come from NY Open Data. Advertised jackpot and cash value come from the California Lottery’s public draw feed. Washington boards load from a Cloudflare Worker that caches Washington’s Lottery past-drawings pages; if that feed is down, the last baked copy in the site is used. Tickets sold on the national desk is still an estimate. You can overwrite advertised, cash, and the Hit 5 cashpot.",
    },
    {
      q: "How do I share a pool?",
      a: "On the Pool tab, copy the share link or download JSON. The link stores the board in the URL. Nothing is uploaded to JackpotDesk. Whoever opens it loads the members and tickets in their own browser.",
    },
    {
      q: "Is the map a live feed of every lottery winner?",
      a: "No. The US board is Powerball and Mega Millions jackpot tickets by the state where they were sold. The Washington board’s store list is the Lottery’s 2023–2025 top stores for tickets worth $1,000 or more, all games mixed. Powerball / Mega Millions on that board are jackpot tickets sold in Washington, by city. Hit 5 and Lotto are published cashpot / jackpot tickets with a named store — not every drawing, and not a split of the $1,000+ mix. Busy stores sell more tickets. Neither board is live, store-lucky, or a forecast.",
    },
  ];

  return (
    <section className="faq" id="faq">
      <h2>FAQ</h2>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  );
}
