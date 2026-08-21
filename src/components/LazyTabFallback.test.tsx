import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LazyTabFallback } from "./LazyTabFallback";

describe("LazyTabFallback", () => {
  it("fills the lazy-tab hole with a kicker and Loading…", () => {
    const html = renderToStaticMarkup(<LazyTabFallback />);
    expect(html).toContain("JackpotDesk");
    expect(html).toContain("Loading…");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("\u2014");
  });
});
