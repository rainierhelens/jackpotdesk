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

const DESK_SHEETS = ["src/index.css", "public/desk-page.css"];
const PHONE_SHEETS = [...DESK_SHEETS, "public/legal.css"];

describe("phone chrome", () => {
  it("docks .tabs and hides .brand-logo / .masthead-recap on desk and recap sheets", () => {
    for (const file of DESK_SHEETS) {
      const block = phoneBlocks(readFileSync(file, "utf8"), file);
      const tabs = rule(block, ".tabs");
      expect(tabs).toMatch(/position:\s*fixed/);
      expect(tabs).toMatch(/bottom:\s*0/);
      expect(tabs).toMatch(/flex-wrap:\s*nowrap/);
      expect(tabs).toMatch(/overflow-x:\s*hidden/);
      expect(rule(block, ".brand-logo")).toMatch(/display:\s*none/);
      expect(rule(block, ".masthead-recap")).toMatch(/display:\s*none/);
      expect(block).toMatch(/padding-bottom:\s*calc\(5\.75rem \+ var\(--safe-bottom\)\)/);
    }
  });

  it("clears the .chrome containing block so the dock is not trapped in the header", () => {
    for (const file of DESK_SHEETS) {
      const block = phoneBlocks(readFileSync(file, "utf8"), file);
      const chrome = rule(block, ".chrome");
      expect(chrome).toMatch(/position:\s*static/);
      expect(chrome).toMatch(/backdrop-filter:\s*none/);
    }
  });

  it("hides the recap jump bar on the SPA phone sheet", () => {
    const block = phoneBlocks(readFileSync("src/index.css", "utf8"), "src/index.css");
    expect(rule(block, ".recap-jump")).toMatch(/display:\s*none/);
  });

  it("hides the wrapped legal menu and docks the same primary tabs", () => {
    const block = phoneBlocks(readFileSync("public/legal.css", "utf8"), "public/legal.css");
    expect(rule(block, ".legal-nav")).toMatch(/display:\s*none/);
    expect(rule(block, ".tabs")).toMatch(/position:\s*fixed/);
    expect(rule(block, ".tabs")).toMatch(/bottom:\s*0/);
    expect(rule(block, ".brand-logo")).toMatch(/display:\s*none/);
  });

  it("fits eight dock items instead of clipping Why/Write to W", () => {
    for (const file of PHONE_SHEETS) {
      const block = phoneBlocks(readFileSync(file, "utf8"), file);
      expect(block).toMatch(/flex:\s*1 1 0/);
      expect(block).toMatch(/min-width:\s*0/);
      expect(block).toMatch(/font-size:\s*0\.55rem/);
    }
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
      "public/terms.html",
      "public/privacy.html",
      "public/responsible.html",
      "public/accessibility.html",
      "public/refer.html",
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
      expect(html, file).not.toContain('class="masthead-recap"');
      expect(html, file).not.toContain("\u2014");
    }
  });
});
