import type { ReactNode } from "react";
import { useTickFlash } from "../lib/flash";

/** Wraps a rendered number and pulses green/red when the value moves. */
export function FlashNum({
  value,
  children,
}: {
  value: number;
  children: ReactNode;
}) {
  const dir = useTickFlash(value);
  return (
    <span className={`flash-cell${dir ? ` flash-${dir}` : ""}`}>
      {children}
    </span>
  );
}
