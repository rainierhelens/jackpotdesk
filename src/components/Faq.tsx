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
      q: "Where were winning Washington tickets sold?",
      a: (
        <>
          Official listed claims only, at{" "}
          <a href="/washington/claimed-prizes-by-store">
            /washington/claimed-prizes-by-store
          </a>
          . Every licensed retailer has the same chance of selling a jackpot
          ticket. The page counts claimed prizes Washington’s Lottery published
          in the last year, by store. That is not sales volume, not every
          winning ticket, and not a reason to drive to a store. A second layer
          shows the annual Luckiest Retailers top 10s, which is a different
          metric.
        </>
      ),
    },
    {
      q: "What is the recap?",
      a: (
        <>
          A public scored replay at{" "}
          <a href="/recap">/recap</a>. Last official results against the Ladder
          that was live before those numbers. Same hit odds as Quick Pick.
          Entertainment, not prediction. Tonight’s #1 stays on the live Ladder.
        </>
      ),
    },
    {
      q: "Then what is the benefit?",
      a: "The Ladder ranks scanned boards by how well they match official history. It is a scored replay of the past, not a forecast. It also prices the drawing using cash value, tax, and split risk, and can mint uncrowded tickets so a jackpot is less likely to be shared. Hit odds stay the published odds.",
    },
    {
      q: "Is this the same as Quick Pick?",
      a: "The numbers are still random. Quick Pick can land on crowded public tickets. JackpotDesk redraws those. Hit chance is unchanged. Expected payout if you hit the jackpot is slightly better.",
    },
    {
      q: "Are there lottery numbers with higher odds of winning?",
      a: "No, and any product that says otherwise is selling fiction. Every combination the machine can draw has identical odds, and past drawings do not change the next one. What differs is how many people are holding a combination: birthdays, visual patterns, and last week's winners are heavily over-played, so those tickets split prizes more often when they hit. The Number pool panel on Desk shows exactly which combinations the desk skips, how many that removes, and how many equally likely combinations remain.",
    },
    {
      q: "Do I need an account?",
      a: "No. Pool members and tickets stay in this browser only. Nothing is uploaded.",
    },
    {
      q: "Where do the jackpot numbers come from?",
      a: "Last-draw numbers for Powerball and Mega Millions come from NY Open Data. Advertised jackpot and cash value come from the California Lottery’s public draw feed, cached on a Cloudflare Worker (`/market`). The browser cannot call California directly, so if that feed is down the last baked copy in the site is used. Washington boards load from the same Worker; if that feed is down, the last baked copy in the site is used. The US jackpot map uses `/jackpot-wins` for public jackpot-ticket locations. Tickets sold on the national desk is still an estimate. You can overwrite advertised, cash, and the Hit 5 cashpot.",
    },
    {
      q: "How do I share a pool?",
      a: "On the Pool tab, copy the share link or download JSON. The link stores the board in the URL. Nothing is uploaded to JackpotDesk. Whoever opens it loads the members and tickets in their own browser.",
    },
    {
      q: "Is the map a live feed of every lottery winner?",
      a: (
        <>
          No. The US board is Powerball and Mega Millions jackpot tickets by the
          state where they were sold. That list refreshes from a Cloudflare
          Worker that caches public jackpot-location pages; if the feed is down,
          the last baked copy in the site is used. It is still jackpot tickets
          only, not every $4 winner. The Washington board’s store list is the
          Lottery’s 2023–2025 top stores for tickets worth $1,000 or more, all
          games mixed, and that mix is not live. The same official lists are on{" "}
          <a href="/washington/claimed-prizes-by-store">Claimed prizes by store</a>. Powerball /
          Mega Millions on the desk map are jackpot tickets sold in Washington,
          by city. Hit 5 and Lotto are published cashpot / jackpot tickets with
          a named store. That is not every drawing, and not a split of the
          $1,000+ mix. Busy stores sell more tickets. Neither board is
          store-lucky or a forecast.
        </>
      ),
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
