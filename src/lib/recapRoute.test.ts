import { describe, expect, it } from "vitest";
import {
  formatRecapHeading,
  isRecapPath,
  recapDayIso,
  recapJsonSrc,
  recapLogSrc,
  recapPath,
} from "./recapRoute.ts";

describe("recapRoute", () => {
  it("treats /recap and dated archives as recap paths, not a query tab", () => {
    expect(isRecapPath("/recap")).toBe(true);
    expect(isRecapPath("/recap/")).toBe(true);
    expect(isRecapPath("/recap/2026-08-20")).toBe(true);
    expect(isRecapPath("/")).toBe(false);
    expect(isRecapPath("/?tab=recap")).toBe(false);
  });

  it("keeps dated permalinks and loads the recap JSON", () => {
    expect(recapPath("/recap/2026-08-20/")).toBe("/recap/2026-08-20");
    expect(recapPath("/")).toBe("/recap");
    expect(recapJsonSrc("/recap")).toBe("/recap/latest.json");
    expect(recapJsonSrc("/recap/2026-08-20")).toBe("/recap/2026-08-20.json");
    expect(recapDayIso("/recap/2026-08-20")).toBe("2026-08-20");
    expect(recapDayIso("/recap")).toBe(null);
    expect(recapLogSrc()).toBe("/recap/log.json");
  });

  it("prints the America/Los_Angeles recap date as a night-desk heading", () => {
    expect(formatRecapHeading("2026-08-20")).toBe("Thursday, Aug 20, 2026");
    expect(formatRecapHeading("2026-08-21")).toBe("Friday, Aug 21, 2026");
  });
});
