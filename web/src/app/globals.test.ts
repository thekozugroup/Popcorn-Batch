import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The shared type values and the filled-row rule live in globals.css (the
 * design review: repeated values become tokens; tags and tracks must not
 * vanish into a filled row).
 */

// Vitest runs from web/.
const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

/** The body of `@utility <name> { … }`, nested blocks included. */
function utility(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, i + 1);
  }
  return "";
}

describe("globals.css", () => {
  it("names the metadata size, the label weight and relaxed leading as theme tokens", () => {
    expect(css).toMatch(/--text-meta:\s*13px;/);
    expect(css).toMatch(/--font-weight-label:\s*550;/);
    expect(css).toMatch(/--leading-relaxed:\s*1\.6;/);
    // No line height of its own: text-meta keeps the one around it, as text-[13px] did.
    expect(css).not.toMatch(/--text-meta--line-height/);
  });

  it("holds the headline and title tokens in one utility each", () => {
    const headline = utility("text-headline");
    for (const decl of ["font-size: 1.875rem", "line-height: 1.2", "font-weight: 600", "letter-spacing: -0.025em", "font-size: 28px"]) {
      expect(headline).toContain(decl);
    }
    expect(headline).toContain("(width < 32.5625rem)");
    const title = utility("text-title");
    for (const decl of ["font-size: 1.25rem", "line-height: 1.4", "font-weight: 600", "letter-spacing: -0.025em"]) {
      expect(title).toContain(decl);
    }
  });

  it("turns tags and tracks to the surface colour inside a selected or highlighted row", () => {
    expect(css).toContain("[data-selected] :is([data-tag], [data-track])");
    expect(css).toContain("[data-fill]:is(:hover, :focus-visible) :is([data-tag], [data-track])");
    const rule = css.slice(css.indexOf("[data-selected] :is([data-tag], [data-track])"));
    expect(rule.slice(0, rule.indexOf("}"))).toContain("background-color: var(--surface)");
  });
});
