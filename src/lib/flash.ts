import { useEffect, useRef, useState } from "react";

/**
 * Direction of the last change to a numeric value, cleared after the pulse.
 * Drives the exchange-style green/red tick flash on live numbers.
 */
export function useTickFlash(value: number): "up" | "down" | null {
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value === prev.current || !Number.isFinite(value)) return;
    setDir(value > prev.current ? "up" : "down");
    prev.current = value;
    const timer = window.setTimeout(() => setDir(null), 650);
    return () => window.clearTimeout(timer);
  }, [value]);

  return dir;
}
