import { describe, expect, it } from "vitest";
import {
  formatRecapHeading,
  isRecapPath,
  joinRecapGames,
  recapDayIso,
  recapDocumentTitle,
  recapJsonSrc,
  recapLogSrc,
  recapMetaDescription,
  recapPageHeading,
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

  it("dates the document title and keeps Friday distinct from Sunday", () => {
    expect(recapDocumentTitle("2026-08-21")).toBe(
      "Recap · Friday, Aug 21, 2026 | JackpotDesk",
    );
    expect(recapDocumentTitle("2026-08-23")).toBe(
      "Recap · Sunday, Aug 23, 2026 | JackpotDesk",
    );
    expect(recapPageHeading("latest", "2026-08-23")).toBe(
      "Last night vs the Ladder",
    );
    expect(recapPageHeading("archive", "2026-08-23")).toBe(
      "Recap · Sunday, Aug 23, 2026",
    );
  });

  it("names that morning's games without listing official boards", () => {
    expect(joinRecapGames(["Powerball", "Hit 5", "Lotto"])).toBe(
      "Powerball, Hit 5, and Lotto",
    );
    const friday = recapMetaDescription("2026-08-21", [
      "Powerball",
      "Mega Millions",
      "Hit 5",
      "Lotto",
    ]);
    const sunday = recapMetaDescription("2026-08-23", [
      "Powerball",
      "Mega Millions",
      "Hit 5",
      "Lotto",
    ]);
    expect(friday).toContain("Friday, Aug 21, 2026");
    expect(friday).toContain("Powerball, Mega Millions, Hit 5, and Lotto");
    expect(friday).toContain("versus last night's Ladder #1 to #3");
    expect(friday).toContain("Entertainment, not prediction");
    expect(friday).toContain("Same hit odds as Quick Pick");
    expect(friday).not.toMatch(/winning numbers/i);
    expect(sunday).toContain("Sunday, Aug 23, 2026");
    expect(friday).not.toBe(sunday);
  });
});
