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
      <nav className="footer-links" aria-label="Site">
        {LINKS.map((link) => (
          <a key={link.href} className="footer-btn" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p className="footer-note">
        JackpotDesk does not improve your chance of winning. Not financial, tax,
        or gambling advice. Must be of legal lottery age in your jurisdiction.
      </p>
    </footer>
  );
}
