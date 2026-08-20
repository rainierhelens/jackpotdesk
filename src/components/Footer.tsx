import type { MouseEvent } from "react";

type DeskTab = "write" | "board";

const LINKS = [
  { href: "/?tab=write", label: "Write", tab: "write" as const },
  { href: "/", label: "Desk", tab: "board" as const },
  { href: "/last-night.html", label: "Last night" },
  { href: "/expected-value.html", label: "Expected value" },
  { href: "/unique-tickets.html", label: "Unique tickets" },
  { href: "/office-pool.html", label: "Office pool" },
  { href: "/lottery-lab.html", label: "Lottery Lab" },
  { href: "/about.html", label: "About" },
  { href: "/how-to-play.html", label: "How to play" },
  { href: "/refer.html", label: "Refer" },
  { href: "/responsible.html", label: "Responsible" },
  { href: "/accessibility.html", label: "Accessibility" },
  { href: "/terms.html", label: "Terms" },
  { href: "/privacy.html", label: "Privacy" },
] as const;

function inAppClick(
  event: MouseEvent<HTMLAnchorElement>,
  tab: DeskTab | undefined,
  onDeskTab?: (tab: DeskTab) => void,
) {
  if (!tab || !onDeskTab) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  onDeskTab(tab);
}

export function Footer({
  onDeskTab,
}: {
  onDeskTab?: (tab: DeskTab) => void;
} = {}) {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="Site">
        {LINKS.map((link) => (
          <a
            key={link.href}
            className="footer-btn"
            href={link.href}
            onClick={(event) =>
              inAppClick(
                event,
                "tab" in link ? link.tab : undefined,
                onDeskTab,
              )
            }
          >
            {link.label}
          </a>
        ))}
        <span className="footer-copy">© 2026 JackpotDesk</span>
      </nav>
    </footer>
  );
}
