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
      a: "Last-draw numbers for Powerball and Mega Millions come from NY Open Data. Advertised jackpot and cash value come from the California Lottery’s public draw feed. Washington boards load from a Cloudflare Worker that caches Washington’s Lottery past-drawings pages; if that feed is down, the last baked copy in the site is used. The US jackpot map uses the same Worker (`/jackpot-wins`) for public jackpot-ticket locations. Tickets sold on the national desk is still an estimate. You can overwrite advertised, cash, and the Hit 5 cashpot.",
    },
    {
      q: "How do I share a pool?",
      a: "On the Pool tab, copy the share link or download JSON. The link stores the board in the URL. Nothing is uploaded to JackpotDesk. Whoever opens it loads the members and tickets in their own browser.",
    },
    {
      q: "Is the map a live feed of every lottery winner?",
      a: "No. The US board is Powerball and Mega Millions jackpot tickets by the state where they were sold. That list refreshes from a Cloudflare Worker that caches public jackpot-location pages; if the feed is down, the last baked copy in the site is used. It is still jackpot tickets only, not every $4 winner. The Washington board’s store list is the Lottery’s 2023–2025 top stores for tickets worth $1,000 or more, all games mixed, and that mix is not live. Powerball / Mega Millions on that board are jackpot tickets sold in Washington, by city. Hit 5 and Lotto are published cashpot / jackpot tickets with a named store. That is not every drawing, and not a split of the $1,000+ mix. Busy stores sell more tickets. Neither board is store-lucky or a forecast.",
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
