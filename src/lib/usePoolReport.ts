import { useEffect, useState } from "react";
import type { PoolReport } from "./comboPool";
import type { PoolRequest } from "./poolWorker";

let worker: Worker | null = null;
let nextId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./poolWorker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

/**
 * Runs the pool Monte Carlo / enumeration off the main thread. Returns the
 * previous report while a new one computes (so the panel animates instead of
 * flickering) and null before the first result lands.
 *
 * The request object must be memoized by the caller; a new reference
 * schedules a recompute after a short debounce.
 */
export function usePoolReport(request: PoolRequest): PoolReport | null {
  const [report, setReport] = useState<PoolReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    const w = getWorker();
    const id = ++nextId;

    function onMessage(event: MessageEvent<{ id: number; report: PoolReport }>) {
      if (cancelled || event.data.id !== id) return;
      setReport(event.data.report);
    }

    w.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      w.postMessage({ ...request, id });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      w.removeEventListener("message", onMessage);
    };
  }, [request]);

  return report;
}
