import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2605 review-code(heavy): tier confirmation for the 3 large-dropdown
// -panel instances cycle 2602/2604 deferred (unclear button-vs-card tier).
// Twin evidence: every other border+shadow-lg floating panel in the codebase
// (PWAInstallButton, QuantOnlyBadge, WeeklyTrendMini, Factor/MlbFactorWaterfallChart)
// uses rounded-lg (md tier, 8px) — MegaMenu dropdown and navigation-menu viewport
// are the same visual role and were the outliers at rounded-md(6px). SearchClient's
// listbox-option row is the same interactive-row tier as HistoricalAnalogMatchup's
// rounded-lg block link. All 3 aligned to rounded-lg.
const APP_ROOT = join(__dirname, "..", "..", "..", "..", "..");

function read(rel: string) {
  return readFileSync(join(APP_ROOT, rel), "utf-8");
}

describe("silent-drift-cycle-2605: MegaMenu/navigation-menu/SearchClient rounded-md -> rounded-lg", () => {
  it("MegaMenu dropdown panel uses rounded-lg", () => {
    const content = read("src/components/layout/MegaMenu.tsx");
    expect(content).toMatch(/bg-brand-800 border border-brand-700 rounded-lg shadow-lg/);
    expect(content).not.toMatch(/rounded-md/);
  });

  it("navigation-menu viewport uses rounded-lg", () => {
    const content = read("src/components/ui/navigation-menu.tsx");
    expect(content).toMatch(/overflow-hidden rounded-lg border/);
    expect(content).not.toMatch(/rounded-md/);
  });

  it("SearchClient listbox-option row uses rounded-lg", () => {
    const content = read("src/components/search/SearchClient.tsx");
    expect(content).toMatch(/py-2 px-2 rounded-lg transition-colors/);
    expect(content).not.toMatch(/rounded-md/);
  });
});
