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
  it("does not pin nav.tabs to top: 18px on phone", () => {
    for (const file of PHONE_SHEETS) {
      const css = readFileSync(file, "utf8");
      const block = phoneBlocks(css, file);
      const tabs = rule(block, ".tabs");
      expect(tabs, file).not.toMatch(/top:\s*18px/);
      expect(css, file).not.toMatch(
        /nav\.tabs[^{]*\{\s*position:\s*fixed;\s*top:\s*18px/,
      );
      expect(block, file).not.toMatch(/\.tabs[^{]*\{\s*position:\s*fixed;\s*top:\s*18px/);
    }
  });

  it("docks .tabs and hides .brand-logo / .masthead-recap on desk and recap sheets", () => {
    for (const file of DESK_SHEETS) {
      const block = phoneBlocks(readFileSync(file, "utf8"), file);
      const tabs = rule(block, ".tabs");
      expect(tabs).toMatch(/position:\s*fixed/);
      expect(tabs).toMatch(/bottom:\s*0/);
      expect(tabs).not.toMatch(/top:\s*18px/);
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

  it("sends last-night and where-tickets-hit to pages that carry the desk dock", () => {
    const lastNight = readFileSync("public/last-night.html", "utf8");
    const whereTickets = readFileSync("public/where-tickets-hit.html", "utf8");
    expect(lastNight).toContain('url=/recap');
    expect(lastNight).toContain('location.replace("/recap")');
    expect(whereTickets).toContain("claimed-prizes-by-store");
    expect(whereTickets).toContain('location.replace("/washington/claimed-prizes-by-store")');
  });
});

const PHONE_VIEWPORT = 390;

function firstWidth(css: string, property: "min-width" | "max-width"): number | null {
  const match = css.match(new RegExp(`${property}:\\s*([^;]+);`));
  if (!match) return null;
  const raw = match[1].trim();
  if (raw === "0" || raw === "0px") return 0;
  if (raw === "100%" || raw === "none") return raw === "none" ? null : PHONE_VIEWPORT;
  const rem = raw.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  const px = raw.match(/^([\d.]+)px$/);
  if (px) return Number(px[1]);
  return null;
}

describe("phone overflow at 390px", () => {
  it("wraps claimed-prizes date, chips, and story cards so .desk-page cannot exceed the viewport", () => {
    const css = readFileSync("public/desk-page.css", "utf8");
    const block = phoneBlocks(css, "public/desk-page.css");
    const page = readFileSync(
      "public/washington/claimed-prizes-by-store/index.html",
      "utf8",
    );

    expect(page).toContain('id="hit-asof"');
    expect(page).toContain("hit-asof");
    expect(page).toContain('class="panel desk-page"');
    expect(page).toContain("hit-toolbar");
    expect(page).toContain("hit-walk");

    const date = rule(block, ".hit-asof");
    expect(date).toMatch(/white-space:\s*normal/);
    expect(date).toMatch(/overflow-wrap:\s*anywhere/);
    expect(date).not.toMatch(/white-space:\s*nowrap/);
    expect(firstWidth(date, "max-width")).toBe(PHONE_VIEWPORT);
    expect(firstWidth(date, "min-width")).toBe(0);

    const head = rule(block, ".panel-head");
    expect(head).toMatch(/flex-wrap:\s*wrap/);
    expect(firstWidth(head, "max-width")).toBe(PHONE_VIEWPORT);
    expect(firstWidth(head, "min-width")).toBe(0);

    const chips = rule(block, ".hit-toolbar .segment");
    expect(chips).toMatch(/flex-wrap:\s*wrap/);
    expect(firstWidth(chips, "max-width")).toBe(PHONE_VIEWPORT);

    const walk = rule(block, ".hit-walk");
    expect(walk).toMatch(/grid-template-columns:\s*1fr/);

    const shell = rule(block, ".shell");
    const panel = rule(block, ".panel");
    const deskPage = rule(block, ".desk-page");
    for (const [name, decl] of [
      [".shell", shell],
      [".panel", panel],
      [".desk-page", deskPage],
    ] as const) {
      expect(decl, name).toMatch(/overflow-x:\s*clip/);
      expect(firstWidth(decl, "max-width"), name).toBe(PHONE_VIEWPORT);
      expect(firstWidth(decl, "min-width"), name).toBe(0);
    }

    expect(css).not.toMatch(/\.desk-page[^{]*\{[^}]*min-width:\s*(1[0-9]|[2-9][0-9])/);
    expect(css).not.toMatch(/#hit-asof[^{]*\{[^}]*white-space:\s*nowrap/);
  });

  it("keeps desk ticker and game cards inside the 390px page, scrolling only inside the ticker", () => {
    const css = readFileSync("src/index.css", "utf8");
    const block = phoneBlocks(css, "src/index.css");
    const tickerSrc = readFileSync("src/components/MarketTicker.tsx", "utf8");

    expect(tickerSrc).toContain('className="ticker"');
    expect(tickerSrc).toContain("className={`tick");

    const ticker = rule(block, ".ticker");
    expect(ticker).toMatch(/overflow-x:\s*auto/);
    expect(ticker).toMatch(/flex-wrap:\s*nowrap/);
    expect(firstWidth(ticker, "max-width")).toBe(PHONE_VIEWPORT);
    expect(firstWidth(ticker, "min-width")).toBe(0);

    const tick = rule(block, ".ticker .tick");
    const tickMin = firstWidth(tick, "min-width");
    expect(tickMin).toBeTruthy();
    expect(tickMin!).toBeLessThan(PHONE_VIEWPORT);
    expect(ticker).not.toMatch(/overflow-x:\s*visible/);

    const board = rule(block, ".temp-board");
    expect(board).toMatch(/grid-template-columns:\s*1fr/);

    const shell = rule(block, ".shell");
    expect(shell).toMatch(/overflow-x:\s*clip/);
    expect(firstWidth(shell, "max-width")).toBe(PHONE_VIEWPORT);
    expect(firstWidth(shell, "min-width")).toBe(0);

    expect(block).toMatch(/html,\s*body,\s*#root/);
    expect(ticker).not.toMatch(/min-width:\s*(1[0-9]|[2-9][0-9])/);
  });
});
