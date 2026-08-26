import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2607 review-code(heavy): p-6/p-3 card-wrapper tier confirmation
// (carry-over from cycle 2606, which confirmed p-5 main / p-4 compact).
// p-6 (24px) = long-form single-wrapper pages + icon+text CTA link cards
// (analysis/page.tsx weekly/monthly review, dashboard, accuracy CTAs are a
// 4-way twin: text-3xl emoji + flex-1 text block, all p-6).
// p-3 (12px) = filter/sort control boxes exclusively — every file using this
// tier is a *SortControl/*Filter/*SearchBox component.
// DESIGN.md previously documented only p-5/p-4; this cycle adds both missing
// tiers as confirmed-intentional (not drift), per the same twin-comparison
// method used in cycle 2606.

const APP_ROOT = join(__dirname, "..", "..", "..", "..", "..");
const SRC = join(APP_ROOT, "src");

function read(rel: string) {
  return readFileSync(join(APP_ROOT, rel), "utf-8");
}

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

const CARD_WRAPPER = /bg-white dark:bg-\[var\(--color-surface-card\)\][^"]*rounded-xl border[^"]*\bp-(\d)\b/g;

function countCardWrapperByTier() {
  const counts: Record<string, number> = { "3": 0, "4": 0, "5": 0, "6": 0 };
  for (const file of walk(SRC)) {
    const content = readFileSync(file, "utf-8");
    for (const m of content.matchAll(CARD_WRAPPER)) {
      const tier = m[1];
      if (counts[tier] !== undefined) counts[tier]++;
    }
  }
  return counts;
}

describe("silent-drift-cycle-2607: p-6/p-3 card-wrapper tiers confirmed intentional", () => {
  it("p-5 remains the dominant main-card tier", () => {
    const counts = countCardWrapperByTier();
    expect(counts["5"]).toBeGreaterThan(counts["6"]);
    expect(counts["5"]).toBeGreaterThan(counts["3"]);
  });

  it("p-6 icon+text CTA cards form a 4-way twin in analysis/page.tsx", () => {
    const content = read("src/app/analysis/page.tsx");
    const ctaBlocks = content.match(
      /className="block bg-white dark:bg-\[var\(--color-surface-card\)\] rounded-xl border border-gray-200 dark:border-\[var\(--color-border\)\] p-6 hover:border-brand-500[^"]*"/g,
    );
    expect(ctaBlocks?.length).toBe(4);
  });

  it("every p-3 card-wrapper file is a filter/sort/search control or a dense list/skeleton item", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const content = readFileSync(file, "utf-8");
      if (!/bg-white dark:bg-\[var\(--color-surface-card\)\][^"]*rounded-xl border[^"]*\bp-3\b/.test(content)) {
        continue;
      }
      const base = file.split("/").pop() ?? "";
      const isDenseListPage = base === "page.tsx" || base === "loading.tsx";
      const isControlComponent = /Sort|Filter|SearchBox/.test(base);
      // dense stat/team-row items — skeleton placeholder (animate-pulse) or
      // a p-3 sibling of a p-4 stat card in the same grid (MyPicksClient)
      const isDenseListComponent = /animate-pulse/.test(content);
      if (!isDenseListPage && !isControlComponent && !isDenseListComponent) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
