const TOOLS = [
  { href: "/expected-value.html", label: "Expected value" },
  { href: "/unique-tickets.html", label: "Unique tickets" },
  { href: "/office-pool.html", label: "Office pool" },
] as const;

const LINKS = [
  { href: "/about.html", label: "About JackpotDesk" },
  { href: "/how-to-play.html", label: "How to play" },
  { href: "/refer.html", label: "Refer a friend" },
  { href: "/responsible.html", label: "Responsible gaming" },
  { href: "/accessibility.html", label: "Accessibility" },
  { href: "/terms.html", label: "Terms of use" },
  { href: "/privacy.html", label: "Privacy policy" },
] as const;

export function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Tools">
        {TOOLS.map((link) => (
          <a key={link.href} className="footer-btn" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <nav className="footer-links" aria-label="Site">
        {LINKS.map((link) => (
          <a key={link.href} className="footer-btn" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p className="footer-note">
        Educational and informational only. Not a lottery, and we do not sell
        tickets. JackpotDesk does not improve your chance of winning. Past
        results do not predict future outcomes. Not financial, tax, or gambling
        advice. Must be of legal lottery age in your jurisdiction.
      </p>
      <p className="footer-copy">© 2026 JackpotDesk</p>
    </footer>
  );
}
