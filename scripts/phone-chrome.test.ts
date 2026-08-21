import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function phoneBlocks(css: string, file: string): string {
  const parts: string[] = [];
  let from = 0;
  while (from < css.length) {
    const start = css.indexOf("@media (max-width: 720px)", from);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < css.length; i++) {
      const ch = css[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error(`${file}: unclosed @media (max-width: 720px)`);
    parts.push(css.slice(open, end + 1));
    from = end + 1;
  }
  expect(parts.length, `${file} needs a max-width: 720px phone sheet`).toBeGreaterThan(
    0,
  );
  return parts.join("\n");
}

function rule(block: string, selector: string): string {
  const needle = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`${needle}\\s*\\{[^}]*\\}`, "s"));
  expect(match, `missing ${selector} in the phone sheet`).toBeTruthy();
  return match![0];
}

describe("phone chrome", () => {
  it("docks .tabs and hides .brand-logo / .masthead-recap on desk and recap sheets", () => {
    for (const file of ["src/index.css", "public/desk-page.css"]) {
      const block = phoneBlocks(readFileSync(file, "utf8"), file);
      expect(rule(block, ".tabs")).toMatch(/position:\s*fixed/);
      expect(rule(block, ".tabs")).toMatch(/bottom:\s*0/);
      expect(rule(block, ".tabs")).toMatch(/flex-wrap:\s*nowrap/);
      expect(rule(block, ".brand-logo")).toMatch(/display:\s*none/);
      expect(rule(block, ".masthead-recap")).toMatch(/display:\s*none/);
      expect(block).toMatch(/padding-bottom:\s*calc\(5\.75rem \+ var\(--safe-bottom\)\)/);
    }
  });

  it("hides the recap jump bar on the SPA phone sheet", () => {
    const block = phoneBlocks(readFileSync("src/index.css", "utf8"), "src/index.css");
    expect(rule(block, ".recap-jump")).toMatch(/display:\s*none/);
  });

  it("keeps the same primary tab hrefs on static recap, claimed prizes, and listed desk pages", () => {
    const pages = [
      "public/recap/index.html",
      "public/washington/claimed-prizes-by-store/index.html",
      "public/about.html",
      "public/lottery-lab.html",
      "public/how-to-play.html",
      "public/expected-value.html",
      "public/unique-tickets.html",
      "public/office-pool.html",
    ];
    for (const file of pages) {
      const html = readFileSync(file, "utf8");
      expect(html, file).toContain('aria-label="Primary"');
      expect(html, file).toContain('href="/"');
      expect(html, file).toContain('href="/recap"');
      expect(html, file).toContain('href="/?tab=tickets"');
      expect(html, file).toContain('href="/?tab=week"');
      expect(html, file).toContain('href="/?tab=map"');
      expect(html, file).toContain('href="/?tab=pool"');
      expect(html, file).toContain('href="/?tab=why"');
      expect(html, file).toContain('href="/?tab=write"');
      expect(html, file).toContain('class="tab-short"');
      expect(html, file).toContain("JackpotDesk");
      expect(html, file).not.toContain("\u2014");
    }
  });
});
