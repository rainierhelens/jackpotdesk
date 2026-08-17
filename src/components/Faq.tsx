export function Faq() {
  const items = [
    {
      q: "Does JackpotDesk increase my chance of winning the lottery?",
      a: "No. Every legal Powerball or Mega Millions combination has the same hit odds. This tool does not predict numbers.",
    },
    {
      q: "Then what is the benefit?",
      a: "Two things. First, it prices the drawing using cash value, tax, and split risk so you can skip a bad ticket. Second, it mints random tickets that avoid birthdays, sequences, and recent winners so a jackpot is less likely to be shared.",
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
      a: "Last-draw numbers come from NY Open Data. Advertised jackpot and cash value come from the California Lottery’s public draw feed (same national Powerball / Mega Millions prize). Tickets sold is still an estimate. You can overwrite any field.",
    },
    {
      q: "How do I share a pool?",
      a: "On the Pool tab, copy the share link or download JSON. The link stores the board in the URL. Nothing is uploaded to JackpotDesk. Whoever opens it loads the members and tickets in their own browser.",
    },
    {
      q: "Can I add JackpotDesk to my phone?",
      a: "Yes. On iPhone: Share, then Add to Home Screen. On Android Chrome, use Install when it appears. It opens full-screen. Your pool stays in that browser on that device — it is not synced to the cloud.",
    },
    {
      q: "Is the map a live feed of every lottery winner?",
      a: "No. There is no public national feed of $4 prizes or exact stores. The map is jackpot tickets only — Powerball and Mega Millions — by the state where the ticket was sold, from public winner reports. It updates when this site does, not second-by-second.",
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
