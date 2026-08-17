export function Faq() {
  const items = [
    {
      q: "Does JackpotDesk increase my chance of winning the lottery?",
      a: "No. Every legal Powerball or Mega Millions combination has the same hit odds. This tool does not predict numbers.",
    },
    {
      q: "Then what is the benefit?",
      a: "Two things. First, it prices the drawing using cash value, tax, and split risk so you can skip a bad $2. Second, it mints random tickets that avoid birthdays, sequences, and recent winners so a jackpot is less likely to be shared.",
    },
    {
      q: "Is this the same as Quick Pick?",
      a: "The numbers are still random. Quick Pick can land on crowded public tickets. JackpotDesk redraws those. Hit chance is unchanged. Expected payout if you hit the jackpot is slightly better.",
    },
    {
      q: "Do I need an account?",
      a: "No. Pool members and tickets stay in this browser only. Nothing is uploaded.",
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
