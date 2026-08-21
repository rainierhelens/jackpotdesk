import { describe, expect, it } from "vitest";
import {
  aggregateClaimedStores,
  bookHasWinnerNames,
  buildClaimedPrizeBook,
  parseAmount,
  parseClaimedPrizeCards,
  parseListedDate,
  parseLocation,
} from "./wa-claimed-prizes.mjs";

const FIXTURE = `
<section class="search-winners-results">
  <div class="search-winners-results-viewport-min">
    <table>
      <tr><td><strong>August 19, 2026</strong></td>
      <td><img alt="Scratch" /><p>CUBE CROSSWORD</p></td></tr>
      <tr><td><strong>NAME:</strong> ALEX M.</td><td>$1,000</td></tr>
      <tr><td colspan="2"><strong>LOCATION:</strong> WINLOCK SHELL SUBS AND MORE<br>223 STATE HIGHWAY 505, WINLOCK, WA</td></tr>
    </table>
    <table>
      <tr><td><strong>August 18, 2026</strong></td>
      <td><img alt="Lotto" /></td></tr>
      <tr><td><strong>NAME:</strong> RICHARD W.</td><td>$1,000</td></tr>
      <tr><td colspan="2"><strong>LOCATION:</strong> WINLOCK SHELL SUBS AND MORE<br>223 STATE HIGHWAY 505, WINLOCK, WA</td></tr>
    </table>
    <table>
      <tr><td><strong>July 10, 2026</strong></td>
      <td><img alt="Scratch" /><p>KEYS AND CASH</p></td></tr>
      <tr><td><strong>NAME:</strong> JANE D.</td><td>BRONCO</td></tr>
      <tr><td colspan="2"><strong>LOCATION:</strong> SAFEWAY STORE #1680<br>2890 NW BUCKLIN HILL RD, SILVERDALE, WA</td></tr>
    </table>
    <table>
      <tr><td><strong>January 14, 2026</strong></td>
      <td><img alt="Lotto" /></td></tr>
      <tr><td><strong>NAME:</strong> PAT Q.</td><td>$1,000</td></tr>
    </table>
  </div>
</section>
`;

describe("wa claimed prizes parser", () => {
  it("parses official location and amount fields", () => {
    expect(parseListedDate("August 19, 2026")).toBe("2026-08-19");
    expect(parseAmount("$1,000")).toBe(1000);
    expect(parseAmount("BRONCO")).toBeNull();
    const loc = parseLocation(
      "<td><strong>LOCATION:</strong> FOSS MARKET<br>16255 SE 256TH ST, COVINGTON, WA</td>",
    );
    expect(loc).toEqual({
      name: "FOSS MARKET",
      address: "16255 SE 256TH ST",
      city: "COVINGTON",
      state: "WA",
      locationKey: "FOSS MARKET|16255 SE 256TH ST, COVINGTON, WA",
    });
  });

  it("aggregates stores and drops winner names", () => {
    const parsed = parseClaimedPrizeCards(FIXTURE);
    expect(parsed.listed).toBe(4);
    expect(parsed.unlocated).toBe(1);
    expect(parsed.merchandise).toBe(1);
    expect(parsed.claims).toHaveLength(3);
    expect(parsed.claims.every((claim) => !("winner" in claim))).toBe(true);
    const stores = aggregateClaimedStores(parsed.claims);
    expect(stores[0]?.name).toBe("WINLOCK SHELL SUBS AND MORE");
    expect(stores[0]?.claims).toBe(2);
    expect(stores[0]?.sum).toBe(2000);
    expect(stores[0]?.games).toEqual({ Scratch: 1, Lotto: 1 });
    expect(stores[0]?.gameSums).toEqual({ Scratch: 1000, Lotto: 1000 });
    expect(stores[0]?.gameLastDates).toEqual({
      Scratch: "2026-08-19",
      Lotto: "2026-08-18",
    });
    const book = buildClaimedPrizeBook(FIXTURE, "2026-08-20T00:00:00.000Z");
    expect(book.storeCount).toBe(2);
    expect(book.locatedClaims).toBe(3);
    expect(bookHasWinnerNames(book)).toBe(false);
    expect(JSON.stringify(book)).not.toMatch(/ALEX M|RICHARD W|JANE D|PAT Q/);
  });
});
