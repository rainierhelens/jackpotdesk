import { describe, expect, it } from "vitest";
import { isRecapPath, recapJsonSrc, recapPath } from "./recapRoute.ts";

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
  });
});
