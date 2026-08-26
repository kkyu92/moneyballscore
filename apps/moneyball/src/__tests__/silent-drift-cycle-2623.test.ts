import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2623 review-code (heavy): DESIGN.md:64 documents dark-mode border
// convention — light mode uses literal `border-gray-N`, dark mode must use
// the CSS variable token `dark:border-[var(--color-border)]`, never raw
// `dark:border-gray-N`. 57 instances across 16 files (app/insights,
// app/standings, app/lotto/*, app/accuracy/shadow, app/v2-preview,
// app/debug/agent-fallback, FactorAccuracyTable, etc.) still used the raw
// literal. Opacity-modified variants (`dark:border-gray-700/50` etc.) are a
// distinct established pattern (softer highlight box, cycle 617 precedent)
// and are intentionally excluded from this convention.
const SRC_DIR = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("silent-drift cycle 2623: dark:border-gray-N raw literal vs --color-border token", () => {
  it("no component uses raw dark:border-gray-N without an opacity modifier", () => {
    const offenders: string[] = [];
    // capture the optional `/NN` opacity suffix so we can exclude it explicitly —
    // a bare negative lookahead here backtracks the \d+ and false-matches a
    // shortened digit prefix of the very opacity variants we want to preserve
    const tokenPattern = /dark:border-gray-\d+(\/\d+)?/g;
    for (const file of walk(SRC_DIR)) {
      const content = readFileSync(file, "utf-8");
      for (const line of content.split("\n")) {
        for (const match of line.matchAll(tokenPattern)) {
          if (!match[1]) {
            offenders.push(`${file}: ${line.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
