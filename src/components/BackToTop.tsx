import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../lib/motion";

const SHOW_AFTER = 360;

export function BackToTop() {
  const [show, setShow] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > SHOW_AFTER);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="to-top"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: reduced ? "auto" : "smooth",
        })
      }
    >
      ↑
    </button>
  );
}
